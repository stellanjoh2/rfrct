import {
  compositeStraightAlphaOverBackground,
  cropCanvasToImageRect,
  downloadCanvasAsPng,
  removeSolidBackgroundForPng,
} from "../capture";
import type { PngExportParams } from "../export/pngExportSettings";
import { BloomPipeline } from "./BloomPipeline";
import { FRAG, VERT } from "./shaders";
import type { BlobParams, BloomParams, ImageLayout, SvgTintParams } from "./types";
import { compileShader, linkProgram } from "./webgl";

export type {
  BlobParams,
  BloomParams,
  FilterMode,
  ImageLayout,
  ShapeMode,
  SvgTintMode,
  SvgTintParams,
} from "./types";

export type { PngExportParams } from "../export/pngExportSettings";

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

export class RefractRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly bloomPipeline: BloomPipeline;
  private readonly vao: WebGLVertexArrayObject;
  private readonly texture: WebGLTexture;
  private readonly locs: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  /** Monotonic shader time (seconds); advances by dt × speed so pause does not reset phase. */
  private animationTime = 0;
  private lastFrameTime = performance.now();
  private onVisibilityChange: (() => void) | null = null;
  /** Skips the per-frame draw so an export render is not overwritten before `toBlob`. */
  private suppressAnimationDraw = false;

  /** Last uploaded bitmap for re-texImage2D after canvas resize (export can invalidate GPU texture). */
  private texImageSource: TexImageSource | null = null;

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
    frostBlur: 2,
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
  };

  /** VJ texture tiling (0/1); applied in fragment shader when image exists. */
  vjDupVertical = 0;
  /** Extra vertical gap between dup rows (normalized viewport height). */
  vjDupGap = 0;
  /** Horizontal stair step per mod(row, 8) (normalized viewport width). */
  vjDupHorizStep = 0.03;
  /** UV y units per second for dup scroll (independent of blob.speed). */
  vjDupScrollSpeed = 0.11;
  private vjDupScrollTime = 0;
  /** Texture width ÷ height (GPU bitmap); used for aspect-correct VJ stack. */
  texAspect = 1;

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
      "u_blobCenter",
      "u_blobRadius",
      "u_waveFreq",
      "u_waveAmp",
      "u_time",
      "u_refractStrength",
      "u_edgeSoftness",
      "u_frostBlur",
      "u_blurQuality",
      "u_chroma",
      "u_shapeMode",
      "u_filterMode",
      "u_filterStrength",
      "u_filterScale",
      "u_filterMotionSpeed",
      "u_svgTintMode",
      "u_svgTintRgb",
      "u_vjDupVertical",
      "u_texAspect",
      "u_vjDupGap",
      "u_vjDupHorizStep",
      "u_vjDupScrollTime",
      "u_vjSpanH",
      "u_vjSpanW",
      "u_vjCenterX",
      "u_vjAnchorY",
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

    gl.useProgram(this.program);
    gl.uniform1i(this.locs.u_image, 0);

    this.onVisibilityChange = () => {
      if (!document.hidden) {
        this.lastFrameTime = performance.now();
      }
    };
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  setImageFromSource(
    source: TexImageSource,
    layout: ImageLayout,
  ) {
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
    this.texImageSource = null;
    this.imageLayout = null;
    this.texAspect = 1;
  }

  resize(width: number, height: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(width * dpr));
    const h = Math.max(1, Math.floor(height * dpr));
    this.gl.canvas.width = w;
    this.gl.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.bloomPipeline.releaseFramebuffers();
  }

  private drawScenePass(w: number, h: number) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    const hasImage = this.imageLayout ? 1 : 0;
    const rect = this.imageLayout?.rect ?? { x: 0, y: 0, w: 1, h: 1 };

    gl.uniform2f(this.locs.u_resolution, w, h);
    gl.uniform4f(this.locs.u_bgColor, ...this.bgColor);
    gl.uniform4f(this.locs.u_imageRect, rect.x, rect.y, rect.w, rect.h);
    gl.uniform1f(this.locs.u_hasImage, hasImage);
    gl.uniform1f(this.locs.u_vjDupVertical, this.vjDupVertical);
    gl.uniform1f(this.locs.u_texAspect, this.texAspect);
    gl.uniform1f(this.locs.u_vjDupGap, this.vjDupGap);
    gl.uniform1f(this.locs.u_vjDupHorizStep, this.vjDupHorizStep);
    gl.uniform1f(this.locs.u_vjDupScrollTime, this.vjDupScrollTime);
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

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawFrame = (opts?: { skipHiddenCheck?: boolean }) => {
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
    const speed = Math.max(0, this.blob.speed);
    this.animationTime += dt * speed;
    this.vjDupScrollTime += dt * Math.max(0, this.vjDupScrollSpeed);

    const bloomOn = this.bloom.strength > 1e-4;

    const clear: [number, number, number, number] = this.bgColor;

    if (!bloomOn) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawScenePass(w, h);
      return;
    }

    this.bloomPipeline.ensureFramebuffers(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomPipeline.getSceneFramebuffer());
    gl.viewport(0, 0, w, h);
    gl.clearColor(clear[0], clear[1], clear[2], clear[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawScenePass(w, h);

    this.bloomPipeline.finalizeToCanvas(this.bloom, this.vao, w, h);
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
    this.reuploadImageTexture();
  }

  /**
   * Renders at `params.scale`× backing-store resolution, optionally straight-alpha and/or
   * cropped to the fitted image rect, downloads PNG, then restores size and redraws.
   *
   * Opaque PNGs run the same de-matte as transparent, then composite onto the scene background;
   * edge pixels may differ slightly from a raw framebuffer read (intentional for cleaner edges).
   */
  exportPng(params: PngExportParams, basename = "refrct", onComplete?: () => void): void {
    if (this.exportInProgress) {
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

        const bgRgb: [number, number, number] = [
          this.bgColor[0],
          this.bgColor[1],
          this.bgColor[2],
        ];
        const dematted = removeSolidBackgroundForPng(canvas, bgRgb);
        let target: HTMLCanvasElement = params.transparentBackground
          ? dematted
          : compositeStraightAlphaOverBackground(dematted, bgRgb);
        if (useCrop) {
          target = cropCanvasToImageRect(target, rect);
        }

        downloadCanvasAsPng(target, basename, () => {
          try {
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
  capturePng2x(basename = "refrct"): void {
    this.exportPng(
      { scale: 2, transparentBackground: false, region: "full" },
      basename,
    );
  }

  destroy() {
    this.stopLoop();
    if (this.onVisibilityChange) {
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
    this.bloomPipeline.dispose();
    this.gl.deleteTexture(this.texture);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
  }
}
