import {
  compositeStraightAlphaOverBackground,
  downloadCanvasAsPng,
  removeSolidBackgroundForPng,
  trimCanvasToAlphaBounds,
  trimCanvasToNonBgBounds,
} from "./capture";
import type { PngExportParams } from "./pngExportSettings";
import { BloomPipeline } from "./BloomPipeline";
import { FRAG, VERT } from "./shaders";
import type {
  BlobParams,
  BloomParams,
  DetailDistortionParams,
  GlassGradeParams,
  ImageLayout,
  SvgTintParams,
} from "./types";
import {
  computeUnderlayContainCell,
  type ImageRect,
  type UnderlayContainOptions,
} from "./layout";
import { compileShader, linkProgram } from "./webgl";

export type {
  BlobParams,
  BloomParams,
  DetailDistortionParams,
  FilterMode,
  GlassGradeParams,
  ImageLayout,
  ShapeMode,
  SvgTintMode,
  SvgTintParams,
} from "./types";

export type { PngExportParams } from "./pngExportSettings";

function textureDimensions(source: TexImageSource): { w: number; h: number } {
  if (source instanceof HTMLCanvasElement) {
    return { w: source.width, h: source.height };
  }
  if (source instanceof HTMLVideoElement) {
    return { w: source.videoWidth, h: source.videoHeight };
  }
  if (source instanceof ImageBitmap) {
    return { w: source.width, h: source.height };
  }
  if (source instanceof HTMLImageElement) {
    return { w: source.naturalWidth, h: source.naturalHeight };
  }
  return { w: 1, h: 1 };
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export class RfrctRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly bloomPipeline: BloomPipeline;
  private readonly vao: WebGLVertexArrayObject;
  private readonly texture: WebGLTexture;
  private readonly underlayTexture: WebGLTexture;
  private readonly overlayTexture: WebGLTexture;
  private readonly overlay2Texture: WebGLTexture;
  private readonly locs: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  /** Monotonic shader time (seconds); advances by dt × speed so pause does not reset phase. */
  private animationTime = 0;
  private animationTimeFrozen = false;
  private frozenGrainTime = 0;
  private lastFrameTime = performance.now();
  private onVisibilityChange: (() => void) | null = null;
  /** Skips the per-frame draw so an export render is not overwritten before `toBlob`. */
  private suppressAnimationDraw = false;

  /** Last uploaded bitmap for re-texImage2D after canvas resize (export can invalidate GPU texture). */
  private texImageSource: TexImageSource | null = null;
  /** Optional hero underlay (e.g. flash logo); composited in shader behind the SVG, same distorted UV. */
  private underlayTexSource: TexImageSource | null = null;
  private underlayCell = { ox: 0, oy: 0, sw: 1, sh: 1 };
  /** 0–1; brief pulses for one-frame flash (driven by app). */
  underlayOpacity = 0;
  /** Multiply sampled underlay rgb (PNG); default white leaves bitmap unchanged. */
  underlayTintRgb: [number, number, number] = [1, 1, 1];

  /** Optional second bitmap composited **above** the main logo (same letterbox). */
  private overlayTexSource: TexImageSource | null = null;
  private overlayCell = { ox: 0, oy: 0, sw: 1, sh: 1 };
  /** 0–1 effective opacity (Design × VJ). */
  overlayOpacity = 1;
  /** 0 original, 1 multiply tint, 2 replace — SVG / bitmap. */
  overlayTintMode = 0;
  overlayTintRgb: [number, number, number] = [1, 1, 1];
  /** 0 normal … 5 difference — see fragment shader `overlayBlendRgb`. */
  overlayBlendMode = 0;
  /** 1 = refracted UV; 0 = flat screen UV. */
  overlayFollowDistortion = 1;
  /** Optional third bitmap composited above the second layer. */
  private overlay2TexSource: TexImageSource | null = null;
  private overlay2Cell = { ox: 0, oy: 0, sw: 1, sh: 1 };
  overlay2Opacity = 1;
  overlay2TintMode = 0;
  overlay2TintRgb: [number, number, number] = [1, 1, 1];
  overlay2BlendMode = 0;
  overlay2FollowDistortion = 1;

  /** Prevents overlapping exports from fighting over canvas dimensions / suppressAnimationDraw. */
  private exportInProgress = false;

  imageLayout: ImageLayout | null = null;
  bgColor: [number, number, number, number] = [1, 1, 1, 1];
  blob: BlobParams = {
    centerX: 0.5,
    centerY: 0.5,
    radius: 0.22,
    waveFreq: 5,
    waveAmp: 0.16,
    speed: 1,
    refractStrength: 0.12,
    edgeSoftness: 0.012,
    frostBlur: 0,
    blurQuality: 1,
    chroma: 0,
    shapeMode: 0,
    filterMode: 0,
    filterStrength: 0,
    filterScale: 0.5,
    filterMotionSpeed: 1,
  };

  bloom: BloomParams = {
    strength: 0,
    radius: 0.2,
    threshold: 0.88,
    softKnee: 0.1,
  };

  svgTint: SvgTintParams = {
    mode: 0,
    rgb: [1, 1, 1],
    gradientRgb2: [1, 1, 1],
    gradientRgb3: [1, 1, 1],
    gradientStops: 2,
    gradientAngleRad: 0,
    gradientScale: 1,
    gradientOffset: 0,
  };

  /** VJ neon grade on the glass (lens interior); independent of SVG tint. */
  glassGrade: GlassGradeParams = {
    mode: 0,
    rgbA: [1, 1, 1],
    rgbB: [0, 0, 0],
    strength: 0,
  };

  /** Normal-map micro-displacement inside the lens (see `public/Dist/14487-normal.jpg`). */
  detailDistortion: DetailDistortionParams = {
    enabled: false,
    strength: 0.55,
    scale: 3.2,
    dirtStrength: 0.4,
    dirtRgb: [0.42, 0.36, 0.3],
  };

  private readonly detailNormalTex: WebGLTexture;
  /** True after `14487-normal` (or fallback) is uploaded to GPU. */
  private detailNormalReady = false;
  /** Set true in `destroy()` so async image callbacks skip GL calls after teardown. */
  private disposed = false;

  /** VJ texture tiling (0/1); applied in fragment shader when image exists. */
  vjDupVertical = 0;
  /** Extra vertical gap between dup rows (normalized viewport height). */
  vjDupGap = 0;
  /** Horizontal stair step per mod(row, 8) (normalized viewport width). */
  vjDupHorizStep = 0.03;
  /** UV y units per second for dup scroll (independent of blob.speed). */
  vjDupScrollSpeed = 0.11;
  /** UV x units per second for dup scroll (signed; VJ speed-shift horizontal drift). */
  vjDupScrollSpeedX = 0;
  /** 0/1 — random duplicate-row blink. */
  vjDupRandomBlink = 0;
  /** Blink steps per second for random duplicate-row blink. */
  vjDupRandomBlinkSpeed = 4;
  private vjDupScrollTime = 0;
  private vjDupScrollTimeX = 0;
  private vjDupRandomBlinkPhase = 0;
  /** Texture width ÷ height (GPU bitmap); used for aspect-correct VJ stack. */
  texAspect = 1;

  /**
   * When true, scene is composited with alpha (transparent outside logo / lens).
   * Used with a YouTube iframe layer behind the canvas; bloom composite preserves alpha.
   */
  transparentSceneBg = false;

  /** Degrees — applied after lens grade; skipped in scene pass when bloom composite applies it. */
  globalHueShift = 0;

  /** 0–1 — overlay film grain on final composite (Photoshop-style Overlay; neutral at ~50% grain). */
  grainStrength = 0;

  setAnimationTimeFrozen(frozen: boolean): void {
    if (this.animationTimeFrozen === frozen) return;
    this.animationTimeFrozen = frozen;
    if (frozen) {
      this.frozenGrainTime = performance.now() * 0.001;
    } else {
      this.lastFrameTime = performance.now();
    }
  }

    constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext(
      "webgl2",
      {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        // Match CSS & color inputs: drawing buffer is sRGB (same encoding as hex / color picker).
        colorSpace: "srgb",
      } as WebGLContextAttributes & { colorSpace?: "srgb" | "display-p3" },
    ) as WebGL2RenderingContext | null;
    if (!gl) throw new Error("WebGL2 required");
    this.gl = gl;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    this.program = linkProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    this.bloomPipeline = new BloomPipeline(gl);

    const names = [
      "u_resolution",
      "u_bgColor",
      "u_imageRect",
      "u_image",
      "u_hasImage",
      "u_underlay",
      "u_underlayActive",
      "u_underlayOpacity",
      "u_underlayCell",
      "u_underlayTintRgb",
      "u_overlayLayer",
      "u_overlayLayerActive",
      "u_overlayOpacity",
      "u_overlayCell",
      "u_overlayTintMode",
      "u_overlayTintRgb",
      "u_overlayBlendMode",
      "u_overlayFollowDistort",
      "u_overlay2Layer",
      "u_overlay2LayerActive",
      "u_overlay2Opacity",
      "u_overlay2Cell",
      "u_overlay2TintMode",
      "u_overlay2TintRgb",
      "u_overlay2BlendMode",
      "u_overlay2FollowDistort",
      "u_transparentSceneBg",
      "u_blobCenter",
      "u_blobRadius",
      "u_waveFreq",
      "u_waveAmp",
      "u_time",
      "u_refractStrength",
      "u_edgeSoftness",
      "u_frostBlur",
      "u_blurQuality",
      "u_globalHueShift",
      "u_chroma",
      "u_shapeMode",
      "u_filterMode",
      "u_filterStrength",
      "u_filterScale",
      "u_filterMotionSpeed",
      "u_svgTintMode",
      "u_svgTintRgb",
      "u_svgGradientRgb2",
      "u_svgGradientRgb3",
      "u_svgGradientStops",
      "u_svgGradientAngle",
      "u_svgGradientScale",
      "u_svgGradientOffset",
      "u_glassGradeMode",
      "u_glassNeonA",
      "u_glassNeonB",
      "u_glassGradeStrength",
      "u_vjDupVertical",
      "u_texAspect",
      "u_vjDupGap",
      "u_vjDupHorizStep",
      "u_vjDupScrollTime",
      "u_vjDupScrollTimeX",
      "u_vjDupRandomBlink",
      "u_vjDupRandomBlinkPhase",
      "u_vjSpanH",
      "u_vjSpanW",
      "u_vjCenterX",
      "u_vjAnchorY",
      "u_detailNormal",
      "u_detailDistortAmp",
      "u_detailDistortScale",
      "u_detailDirtStrength",
      "u_detailDirtRgb",
    ] as const;
    for (const n of names) {
      this.locs[n] = gl.getUniformLocation(this.program, n);
    }

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.underlayTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.underlayTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );

    this.overlayTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );
    this.overlay2Texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.overlay2Texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );

    this.detailNormalTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.detailNormalTex);
    const neutralNormal = new Uint8Array([128, 128, 255, 255]);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      neutralNormal,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.useProgram(this.program);
    gl.uniform1i(this.locs.u_image, 0);
    gl.uniform1i(this.locs.u_detailNormal, 1);
    gl.uniform1i(this.locs.u_underlay, 2);
    gl.uniform1i(this.locs.u_overlayLayer, 3);
    gl.uniform1i(this.locs.u_overlay2Layer, 4);

    this.onVisibilityChange = () => {
      if (!document.hidden) {
        this.lastFrameTime = performance.now();
      }
    };
    document.addEventListener("visibilitychange", this.onVisibilityChange);

    this.loadDetailNormalMap();
  }

  private loadDetailNormalMap(): void {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (this.disposed) return;
      const gl = this.gl;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      gl.bindTexture(gl.TEXTURE_2D, this.detailNormalTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      if (isPowerOfTwo(w) && isPowerOfTwo(h)) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR,
        );
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      this.detailNormalReady = true;
    };
    img.onerror = () => {
      console.warn(
        "[rfrct] Detail normal map missing or blocked — add public/Dist/14487-normal.jpg",
      );
    };
    img.src = `${import.meta.env.BASE_URL}Dist/14487-normal.jpg`;
  }

  setImageFromSource(
    source: TexImageSource,
    layout: ImageLayout,
  ) {
    if (this.disposed) return;
    const gl = this.gl;
    this.texImageSource = source;
    this.imageLayout = layout;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    const { w, h } = textureDimensions(source);
    this.texAspect = w / Math.max(1, h);
    if (isPowerOfTwo(w) && isPowerOfTwo(h)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  clearImage() {
    if (this.disposed) return;
    this.texImageSource = null;
    this.imageLayout = null;
    this.texAspect = 1;
  }

  /**
   * Optional bitmap drawn **under** the SVG in the fragment shader (premultiplied over), using
   * the same distorted UV as the main texture so refraction, `filterGlass`, frost, and chroma match.
   */
  setUnderlayFromSource(source: TexImageSource) {
    if (this.disposed) return;
    const gl = this.gl;
    this.underlayTexSource = source;
    gl.bindTexture(gl.TEXTURE_2D, this.underlayTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    const { w, h } = textureDimensions(source);
    if (isPowerOfTwo(w) && isPowerOfTwo(h)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  clearUnderlay() {
    if (this.disposed) return;
    const gl = this.gl;
    this.underlayTexSource = null;
    gl.bindTexture(gl.TEXTURE_2D, this.underlayTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  /**
   * Optional bitmap drawn **above** the main SVG in the fragment shader, using either distorted
   * or flat UVs depending on {@link overlayFollowDistortion}.
   */
  setOverlayFromSource(source: TexImageSource) {
    if (this.disposed) return;
    const gl = this.gl;
    this.overlayTexSource = source;
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    /**
     * Keep overlay sampling mip-free. Transparent SVG borders + mip chains can leak subtle
     * bbox edges while scaling/distorting layer 2, even with clamp and UV guards.
     */
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  clearOverlay() {
    if (this.disposed) return;
    const gl = this.gl;
    this.overlayTexSource = null;
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  setOverlay2FromSource(source: TexImageSource) {
    if (this.disposed) return;
    const gl = this.gl;
    this.overlay2TexSource = source;
    gl.bindTexture(gl.TEXTURE_2D, this.overlay2Texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  clearOverlay2() {
    if (this.disposed) return;
    const gl = this.gl;
    this.overlay2TexSource = null;
    gl.bindTexture(gl.TEXTURE_2D, this.overlay2Texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }

  /** Maps overlay texture UVs with contain-fit inside the same letterbox `rect` as the main image. */
  syncOverlayLayout(
    canvasW: number,
    canvasH: number,
    rect: ImageRect,
    overlayW: number,
    overlayH: number,
    options?: UnderlayContainOptions,
  ) {
    this.overlayCell = computeUnderlayContainCell(
      canvasW,
      canvasH,
      rect,
      overlayW,
      overlayH,
      options,
    );
  }

  syncOverlay2Layout(
    canvasW: number,
    canvasH: number,
    rect: ImageRect,
    overlayW: number,
    overlayH: number,
    options?: UnderlayContainOptions,
  ) {
    this.overlay2Cell = computeUnderlayContainCell(
      canvasW,
      canvasH,
      rect,
      overlayW,
      overlayH,
      options,
    );
  }

  /** Maps underlay texture UVs with contain-fit inside the same letterbox `rect` as the main image. */
  syncUnderlayLayout(
    canvasW: number,
    canvasH: number,
    rect: ImageRect,
    underlayW: number,
    underlayH: number,
    options?: UnderlayContainOptions,
  ) {
    this.underlayCell = computeUnderlayContainCell(
      canvasW,
      canvasH,
      rect,
      underlayW,
      underlayH,
      options,
    );
  }

  resize(width: number, height: number) {
    if (this.disposed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(width * dpr));
    const h = Math.max(1, Math.floor(height * dpr));
    this.gl.canvas.width = w;
    this.gl.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.bloomPipeline.releaseFramebuffers();
  }

  private drawScenePass(w: number, h: number, includeGlobalHue: boolean) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.detailNormalTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.underlayTexture);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.overlay2Texture);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    const hasImage = this.imageLayout ? 1 : 0;
    const rect = this.imageLayout?.rect ?? { x: 0, y: 0, w: 1, h: 1 };

    gl.uniform2f(this.locs.u_resolution, w, h);
    gl.uniform4f(this.locs.u_bgColor, ...this.bgColor);
    gl.uniform4f(this.locs.u_imageRect, rect.x, rect.y, rect.w, rect.h);
    gl.uniform1f(this.locs.u_hasImage, hasImage);
    gl.uniform1f(
      this.locs.u_underlayActive,
      this.underlayTexSource ? 1 : 0,
    );
    gl.uniform1f(this.locs.u_underlayOpacity, this.underlayOpacity);
    gl.uniform4f(
      this.locs.u_underlayCell,
      this.underlayCell.ox,
      this.underlayCell.oy,
      this.underlayCell.sw,
      this.underlayCell.sh,
    );
    gl.uniform3f(
      this.locs.u_underlayTintRgb,
      this.underlayTintRgb[0],
      this.underlayTintRgb[1],
      this.underlayTintRgb[2],
    );
    gl.uniform1f(
      this.locs.u_overlayLayerActive,
      this.overlayTexSource ? 1 : 0,
    );
    gl.uniform1f(this.locs.u_overlayOpacity, this.overlayOpacity);
    gl.uniform4f(
      this.locs.u_overlayCell,
      this.overlayCell.ox,
      this.overlayCell.oy,
      this.overlayCell.sw,
      this.overlayCell.sh,
    );
    gl.uniform1f(this.locs.u_overlayTintMode, this.overlayTintMode);
    gl.uniform3f(
      this.locs.u_overlayTintRgb,
      this.overlayTintRgb[0],
      this.overlayTintRgb[1],
      this.overlayTintRgb[2],
    );
    gl.uniform1i(this.locs.u_overlayBlendMode, this.overlayBlendMode);
    gl.uniform1f(
      this.locs.u_overlayFollowDistort,
      this.overlayFollowDistortion > 0.5 ? 1 : 0,
    );
    gl.uniform1f(
      this.locs.u_overlay2LayerActive,
      this.overlay2TexSource ? 1 : 0,
    );
    gl.uniform1f(this.locs.u_overlay2Opacity, this.overlay2Opacity);
    gl.uniform4f(
      this.locs.u_overlay2Cell,
      this.overlay2Cell.ox,
      this.overlay2Cell.oy,
      this.overlay2Cell.sw,
      this.overlay2Cell.sh,
    );
    gl.uniform1f(this.locs.u_overlay2TintMode, this.overlay2TintMode);
    gl.uniform3f(
      this.locs.u_overlay2TintRgb,
      this.overlay2TintRgb[0],
      this.overlay2TintRgb[1],
      this.overlay2TintRgb[2],
    );
    gl.uniform1i(this.locs.u_overlay2BlendMode, this.overlay2BlendMode);
    gl.uniform1f(
      this.locs.u_overlay2FollowDistort,
      this.overlay2FollowDistortion > 0.5 ? 1 : 0,
    );
    gl.uniform1f(
      this.locs.u_transparentSceneBg,
      this.transparentSceneBg ? 1 : 0,
    );
    gl.uniform1f(this.locs.u_vjDupVertical, this.vjDupVertical);
    gl.uniform1f(this.locs.u_texAspect, this.texAspect);
    gl.uniform1f(this.locs.u_vjDupGap, this.vjDupGap);
    gl.uniform1f(this.locs.u_vjDupHorizStep, this.vjDupHorizStep);
    gl.uniform1f(this.locs.u_vjDupScrollTime, this.vjDupScrollTime);
    gl.uniform1f(this.locs.u_vjDupScrollTimeX, this.vjDupScrollTimeX);
    gl.uniform1f(this.locs.u_vjDupRandomBlink, this.vjDupRandomBlink);
    gl.uniform1f(this.locs.u_vjDupRandomBlinkPhase, this.vjDupRandomBlinkPhase);
    gl.uniform1f(this.locs.u_vjSpanH, rect.h);
    gl.uniform1f(this.locs.u_vjSpanW, rect.w);
    gl.uniform1f(this.locs.u_vjCenterX, rect.x + rect.w * 0.5);
    gl.uniform1f(this.locs.u_vjAnchorY, rect.y);

    const r = this.blob.radius;
    gl.uniform2f(this.locs.u_blobCenter, this.blob.centerX, this.blob.centerY);
    gl.uniform1f(this.locs.u_blobRadius, r);
    gl.uniform1f(this.locs.u_waveFreq, this.blob.waveFreq);
    gl.uniform1f(this.locs.u_waveAmp, this.blob.waveAmp * r);
    gl.uniform1f(this.locs.u_time, this.animationTime);
    gl.uniform1f(this.locs.u_refractStrength, this.blob.refractStrength);
    gl.uniform1f(this.locs.u_edgeSoftness, this.blob.edgeSoftness);
    gl.uniform1f(this.locs.u_frostBlur, this.blob.frostBlur);
    gl.uniform1f(this.locs.u_blurQuality, this.blob.blurQuality);
    const hue = this.globalHueShift;
    const hueNorm = Number.isFinite(hue) ? (((hue % 360) + 360) % 360) : 0;
    gl.uniform1f(
      this.locs.u_globalHueShift,
      includeGlobalHue ? hueNorm : 0,
    );
    gl.uniform1f(this.locs.u_chroma, this.blob.chroma);
    gl.uniform1i(this.locs.u_shapeMode, this.blob.shapeMode);
    gl.uniform1i(this.locs.u_filterMode, this.blob.filterMode);
    gl.uniform1f(this.locs.u_filterStrength, this.blob.filterStrength);
    gl.uniform1f(this.locs.u_filterScale, this.blob.filterScale);
    gl.uniform1f(this.locs.u_filterMotionSpeed, this.blob.filterMotionSpeed);
    gl.uniform1f(this.locs.u_svgTintMode, this.svgTint.mode);
    gl.uniform3f(
      this.locs.u_svgTintRgb,
      this.svgTint.rgb[0],
      this.svgTint.rgb[1],
      this.svgTint.rgb[2],
    );
    gl.uniform3f(
      this.locs.u_svgGradientRgb2,
      this.svgTint.gradientRgb2[0],
      this.svgTint.gradientRgb2[1],
      this.svgTint.gradientRgb2[2],
    );
    gl.uniform3f(
      this.locs.u_svgGradientRgb3,
      this.svgTint.gradientRgb3[0],
      this.svgTint.gradientRgb3[1],
      this.svgTint.gradientRgb3[2],
    );
    gl.uniform1f(this.locs.u_svgGradientStops, this.svgTint.gradientStops);
    gl.uniform1f(this.locs.u_svgGradientAngle, this.svgTint.gradientAngleRad);
    gl.uniform1f(this.locs.u_svgGradientScale, this.svgTint.gradientScale);
    gl.uniform1f(this.locs.u_svgGradientOffset, this.svgTint.gradientOffset);

    gl.uniform1i(this.locs.u_glassGradeMode, this.glassGrade.mode);
    gl.uniform3f(
      this.locs.u_glassNeonA,
      this.glassGrade.rgbA[0],
      this.glassGrade.rgbA[1],
      this.glassGrade.rgbA[2],
    );
    gl.uniform3f(
      this.locs.u_glassNeonB,
      this.glassGrade.rgbB[0],
      this.glassGrade.rgbB[1],
      this.glassGrade.rgbB[2],
    );
    gl.uniform1f(
      this.locs.u_glassGradeStrength,
      this.glassGrade.strength,
    );

    const dd = this.detailDistortion;
    const detailAmp =
      this.detailNormalReady &&
      dd.enabled &&
      hasImage > 0.5
        ? Math.max(0, Math.min(1, dd.strength)) * 0.045
        : 0;
    gl.uniform1f(this.locs.u_detailDistortAmp, detailAmp);
    gl.uniform1f(
      this.locs.u_detailDistortScale,
      Math.max(0.08, Math.min(14, dd.scale)),
    );

    const dirtStr =
      this.detailNormalReady &&
      dd.enabled &&
      hasImage > 0.5
        ? Math.max(0, Math.min(1, dd.dirtStrength))
        : 0;
    gl.uniform1f(this.locs.u_detailDirtStrength, dirtStr);
    gl.uniform3f(
      this.locs.u_detailDirtRgb,
      dd.dirtRgb[0],
      dd.dirtRgb[1],
      dd.dirtRgb[2],
    );

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawFrame = (opts?: { skipHiddenCheck?: boolean }) => {
    if (this.disposed) {
      return;
    }
    if (this.suppressAnimationDraw) {
      return;
    }
    if (!opts?.skipHiddenCheck && document.hidden) {
      return;
    }
    const gl = this.gl;
    const w = gl.canvas.width;
    const h = gl.canvas.height;
    const now = performance.now();
    let dt = (now - this.lastFrameTime) * 0.001;
    this.lastFrameTime = now;
    if (dt > 0.25) {
      dt = 0.016;
    }
    if (!this.animationTimeFrozen) {
      const speed = Math.max(0, this.blob.speed);
      this.animationTime += dt * speed;
      this.vjDupScrollTime += dt * Math.max(0, this.vjDupScrollSpeed);
      this.vjDupScrollTimeX += dt * this.vjDupScrollSpeedX;
      this.vjDupRandomBlinkPhase += dt * Math.max(0.2, this.vjDupRandomBlinkSpeed);
    }

    const bloomOn = this.bloom.strength > 1e-4;
    const grainOn = this.grainStrength > 1e-4;
    const grainTime = this.animationTimeFrozen
      ? this.frozenGrainTime
      : now * 0.001;

    const clear: [number, number, number, number] = this.bgColor;

    if (this.transparentSceneBg) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else {
      gl.disable(gl.BLEND);
    }

    if (!bloomOn && !grainOn) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawScenePass(w, h, true);
      return;
    }

    this.bloomPipeline.ensureFramebuffers(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomPipeline.getSceneFramebuffer());
    gl.viewport(0, 0, w, h);
    gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawScenePass(w, h, bloomOn ? false : true);

    const gh = this.globalHueShift;
    const ghNorm = Number.isFinite(gh) ? (((gh % 360) + 360) % 360) : 0;

    if (bloomOn) {
      this.bloomPipeline.finalizeToCanvas(this.bloom, this.vao, w, h, {
        transparentCanvas: this.transparentSceneBg,
        globalHueShift: ghNorm,
        grainStrength: grainOn ? this.grainStrength : 0,
        grainTime,
      });
    } else {
      this.bloomPipeline.drawGrainFromSceneTexture(this.vao, w, h, {
        grainStrength: this.grainStrength,
        grainTime,
        transparentCanvas: this.transparentSceneBg,
      });
    }
  };

  startLoop() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.drawFrame();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stopLoop() {
    cancelAnimationFrame(this.raf);
  }

  requestDraw() {
    this.drawFrame();
  }

  /**
   * Re-uploads the image texture from the last source (needed after export or viewport resize
   * changes backing-store size — some drivers clear GPU texture data).
   */
  private reuploadImageTexture(): void {
    if (!this.texImageSource || !this.imageLayout) {
      return;
    }
    this.setImageFromSource(this.texImageSource, this.imageLayout);
  }

  /** Public hook after layout sync when the canvas backing size changes (not on every pan). */
  reuploadTextureIfNeeded(): void {
    if (this.disposed) return;
    this.reuploadImageTexture();
    this.reuploadUnderlayTexture();
    this.reuploadOverlayTexture();
    this.reuploadOverlay2Texture();
  }

  private reuploadUnderlayTexture(): void {
    if (!this.underlayTexSource) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.underlayTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.underlayTexSource,
    );
    const { w, h } = textureDimensions(this.underlayTexSource);
    if (isPowerOfTwo(w) && isPowerOfTwo(h)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  private reuploadOverlayTexture(): void {
    if (!this.overlayTexSource) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.overlayTexSource,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  private reuploadOverlay2Texture(): void {
    if (!this.overlay2TexSource) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.overlay2Texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.overlay2TexSource,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  /**
   * Renders at `params.scale`× backing-store resolution, optionally straight-alpha and/or
   * `region: "image"` which trims to **actual** output pixels (alpha or vs background), so
   * extreme refraction is never clipped by fixed UV bleed — only by the framebuffer edge.
   *
   * Opaque PNGs run the same de-matte as transparent, then composite onto the scene background;
   * edge pixels may differ slightly from a raw framebuffer read (intentional for cleaner edges).
   *
   * Transparent PNGs against a **dark** scene background: black (or matching) foreground is
   * indistinguishable from the backdrop in {@link removeSolidBackgroundForPng}'s dark-bg path
   * (α collapses to 0). We render that export pass on a **white** sentinel background so dark
   * fills and gradient stops recover correct alpha; the on-screen preview background is restored
   * after the download (skipped when `transparentSceneBg` already drives real framebuffer alpha).
   */
  exportPng(params: PngExportParams, basename = "rfrct", onComplete?: () => void): void {
    if (this.disposed || this.exportInProgress) {
      return;
    }
    this.exportInProgress = true;

    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const w0 = canvas.width;
    const h0 = canvas.height;
    const scale = params.scale === 2 ? 2 : 1;
    const nw = Math.max(1, Math.floor(w0 * scale));
    const nh = Math.max(1, Math.floor(h0 * scale));

    const savedBg = this.bgColor.slice() as [
      number,
      number,
      number,
      number,
    ];
    const displayBgRgb: [number, number, number] = [
      savedBg[0],
      savedBg[1],
      savedBg[2],
    ];
    const displayBgLuma =
      0.2126 * displayBgRgb[0] + 0.7152 * displayBgRgb[1] + 0.0722 * displayBgRgb[2];
    const useWhiteDematteBg =
      params.transparentBackground &&
      !this.transparentSceneBg &&
      displayBgLuma > 0.55;
    const dematteBgRgb: [number, number, number] = useWhiteDematteBg
      ? [1, 1, 1]
      : displayBgRgb;

    if (useWhiteDematteBg) {
      this.bgColor = [1, 1, 1, 1];
    }

    this.suppressAnimationDraw = true;

    canvas.width = nw;
    canvas.height = nh;
    gl.viewport(0, 0, nw, nh);
    this.bloomPipeline.releaseFramebuffers();

    this.suppressAnimationDraw = false;
    this.drawFrame({ skipHiddenCheck: true });
    this.suppressAnimationDraw = true;

    requestAnimationFrame(() => {
      try {
        this.gl.finish();

        const rect = this.imageLayout?.rect;
        const useCrop =
          params.region === "image" &&
          rect &&
          (this.imageLayout?.naturalWidth ?? 0) > 0;

        const dematted = removeSolidBackgroundForPng(canvas, dematteBgRgb);
        let target: HTMLCanvasElement = params.transparentBackground
          ? dematted
          : compositeStraightAlphaOverBackground(dematted, displayBgRgb);
        if (useCrop) {
          if (params.transparentBackground) {
            target = trimCanvasToAlphaBounds(target, 1, 8);
          } else {
            target = trimCanvasToNonBgBounds(target, displayBgRgb, 0.045, 8);
          }
        }

        downloadCanvasAsPng(target, basename, () => {
          try {
            if (useWhiteDematteBg) {
              this.bgColor = savedBg;
            }
            this.suppressAnimationDraw = false;
            canvas.width = w0;
            canvas.height = h0;
            gl.viewport(0, 0, w0, h0);
            this.bloomPipeline.releaseFramebuffers();
            onComplete?.();
            this.reuploadImageTexture();
            this.drawFrame();
            canvas.focus({ preventScroll: true });
          } finally {
            this.exportInProgress = false;
          }
        });
      } catch (e) {
        if (useWhiteDematteBg) {
          this.bgColor = savedBg;
        }
        this.exportInProgress = false;
        this.suppressAnimationDraw = false;
        canvas.width = w0;
        canvas.height = h0;
        gl.viewport(0, 0, w0, h0);
        this.bloomPipeline.releaseFramebuffers();
        this.reuploadImageTexture();
        this.drawFrame();
        console.error(e);
      }
    });
  }

  /** @deprecated Use {@link exportPng} with `{ scale: 2, transparentBackground: false, region: "full" }`. */
  capturePng2x(basename = "rfrct"): void {
    this.exportPng(
      { scale: 2, transparentBackground: false, region: "full" },
      basename,
    );
  }

  destroy() {
    this.disposed = true;
    this.stopLoop();
    if (this.onVisibilityChange) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
    this.gl.disable(this.gl.BLEND);
    this.bloomPipeline.dispose();
    this.gl.deleteTexture(this.detailNormalTex);
    this.gl.deleteTexture(this.underlayTexture);
    this.gl.deleteTexture(this.overlayTexture);
    this.gl.deleteTexture(this.overlay2Texture);
    this.gl.deleteTexture(this.texture);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
  }
}
