import { BloomPipeline } from "./BloomPipeline";
import { FRAG, VERT } from "./shaders";
import type { BlobParams, BloomParams, ImageLayout, SvgTintParams } from "./types";
import { compileShader, linkProgram } from "./webgl";

export type {
  BlobParams,
  BloomParams,
  ImageLayout,
  ShapeMode,
  SvgTintMode,
  SvgTintParams,
} from "./types";

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
  };

  bloom: BloomParams = {
    strength: 0.5,
    radius: 0.2,
    threshold: 1,
    softKnee: 0.1,
  };

  svgTint: SvgTintParams = {
    mode: 0,
    rgb: [1, 1, 1],
  };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext(
      "webgl2",
      {
        alpha: false,
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
      "u_svgTintMode",
      "u_svgTintRgb",
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
    this.imageLayout = layout;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    const { w, h } = textureDimensions(source);
    if (isPowerOfTwo(w) && isPowerOfTwo(h)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  clearImage() {
    this.imageLayout = null;
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
    gl.uniform1f(this.locs.u_svgTintMode, this.svgTint.mode);
    gl.uniform3f(
      this.locs.u_svgTintRgb,
      this.svgTint.rgb[0],
      this.svgTint.rgb[1],
      this.svgTint.rgb[2],
    );

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawFrame = () => {
    if (document.hidden) {
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

    const bloomOn = this.bloom.strength > 1e-4;

    if (!bloomOn) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.clearColor(...this.bgColor);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.drawScenePass(w, h);
      return;
    }

    this.bloomPipeline.ensureFramebuffers(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomPipeline.getSceneFramebuffer());
    gl.viewport(0, 0, w, h);
    gl.clearColor(...this.bgColor);
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
