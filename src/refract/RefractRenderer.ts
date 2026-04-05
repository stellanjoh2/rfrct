import {
  BLOOM_FRAG_BLUR,
  BLOOM_FRAG_BRIGHT,
  BLOOM_FRAG_COMPOSITE,
  BLOOM_VERT,
} from "./bloomShaders";
import { FRAG, VERT } from "./shaders";

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("shader");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? "";
    gl.deleteShader(sh);
    throw new Error(log);
  }
  return sh;
}

function link(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const p = gl.createProgram();
  if (!p) throw new Error("program");
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p) ?? "";
    gl.deleteProgram(p);
    throw new Error(log);
  }
  return p;
}

/** 0 = blob, 1 = 3D cube slice, 2 = metaballs */
export type ShapeMode = 0 | 1 | 2;

export type BlobParams = {
  centerX: number;
  centerY: number;
  radius: number;
  waveFreq: number;
  waveAmp: number;
  /** Multiplier on animation time (1 = default speed, 0 = frozen). */
  speed: number;
  refractStrength: number;
  edgeSoftness: number;
  /** Extra Gaussian blur in framebuffer pixels (lens / frost). */
  frostBlur: number;
  /** 1 = 9 taps, 2 = 25, 3 = 49 (binomial kernels; higher = softer, heavier GPU). */
  blurQuality: number;
  chroma: number;
  shapeMode: ShapeMode;
};

export type ImageLayout = {
  rect: { x: number; y: number; w: number; h: number };
  naturalWidth: number;
  naturalHeight: number;
};

/** Same fields as Dreams `FxSettings.bloom` (Candy Lands / three.js BloomNode-style tuning). */
export type BloomParams = {
  strength: number;
  radius: number;
  threshold: number;
  /** Soft knee for threshold curve (fixed default in UI; matches Unreal-style bloom). */
  softKnee: number;
};

/** 0 = original, 1 = multiply by tint, 2 = replace rgb with tint (alpha preserved). */
export type SvgTintMode = 0 | 1 | 2;

export type SvgTintParams = {
  mode: SvgTintMode;
  /** Linear-ish RGB in 0–1 (from hex). */
  rgb: [number, number, number];
};

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
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private progBloomBright: WebGLProgram;
  private progBloomBlur: WebGLProgram;
  private progBloomComposite: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private texture: WebGLTexture;
  private locs: Record<string, WebGLUniformLocation | null> = {};
  private bloomBrightLocs: Record<string, WebGLUniformLocation | null> = {};
  private bloomBlurLocs: Record<string, WebGLUniformLocation | null> = {};
  private bloomCompositeLocs: Record<string, WebGLUniformLocation | null> = {};
  private sceneTex: WebGLTexture | null = null;
  private sceneFbo: WebGLFramebuffer | null = null;
  private bloomTexA: WebGLTexture | null = null;
  private bloomTexB: WebGLTexture | null = null;
  private bloomFboA: WebGLFramebuffer | null = null;
  private bloomFboB: WebGLFramebuffer | null = null;
  private fbW = 0;
  private fbH = 0;
  private halfW = 0;
  private halfH = 0;
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

  /** Dreams defaults: strength 0.5, radius 0.2, threshold 1. */
  bloom: BloomParams = {
    strength: 0.5,
    radius: 0.2,
    threshold: 1,
    softKnee: 0.1,
  };

  /** Applied only when the UI marks the source as SVG; raster uploads should use mode 0. */
  svgTint: SvgTintParams = {
    mode: 0,
    rgb: [1, 1, 1],
  };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL2 required");
    this.gl = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    this.program = link(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const bv = compile(gl, gl.VERTEX_SHADER, BLOOM_VERT);
    const bBright = compile(gl, gl.FRAGMENT_SHADER, BLOOM_FRAG_BRIGHT);
    const bBlur = compile(gl, gl.FRAGMENT_SHADER, BLOOM_FRAG_BLUR);
    const bComp = compile(gl, gl.FRAGMENT_SHADER, BLOOM_FRAG_COMPOSITE);
    this.progBloomBright = link(gl, bv, bBright);
    this.progBloomBlur = link(gl, bv, bBlur);
    this.progBloomComposite = link(gl, bv, bComp);
    gl.deleteShader(bv);
    gl.deleteShader(bBright);
    gl.deleteShader(bBlur);
    gl.deleteShader(bComp);

    for (const n of ["u_scene", "u_resolution", "u_threshold", "u_softKnee"] as const) {
      this.bloomBrightLocs[n] = gl.getUniformLocation(this.progBloomBright, n);
    }
    for (const n of ["u_tex", "u_resolution", "u_direction", "u_sigma"] as const) {
      this.bloomBlurLocs[n] = gl.getUniformLocation(this.progBloomBlur, n);
    }
    for (const n of ["u_scene", "u_bloom", "u_resolution", "u_strength"] as const) {
      this.bloomCompositeLocs[n] = gl.getUniformLocation(
        this.progBloomComposite,
        n,
      );
    }
    gl.useProgram(this.progBloomComposite);
    gl.uniform1i(this.bloomCompositeLocs.u_scene, 0);
    gl.uniform1i(this.bloomCompositeLocs.u_bloom, 1);
    gl.useProgram(this.progBloomBright);
    gl.uniform1i(this.bloomBrightLocs.u_scene, 0);
    gl.useProgram(this.progBloomBlur);
    gl.uniform1i(this.bloomBlurLocs.u_tex, 0);

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
    this.releaseBloomFramebuffers();
  }

  private releaseBloomFramebuffers() {
    const gl = this.gl;
    if (this.sceneFbo) gl.deleteFramebuffer(this.sceneFbo);
    if (this.bloomFboA) gl.deleteFramebuffer(this.bloomFboA);
    if (this.bloomFboB) gl.deleteFramebuffer(this.bloomFboB);
    if (this.sceneTex) gl.deleteTexture(this.sceneTex);
    if (this.bloomTexA) gl.deleteTexture(this.bloomTexA);
    if (this.bloomTexB) gl.deleteTexture(this.bloomTexB);
    this.sceneFbo = null;
    this.bloomFboA = null;
    this.bloomFboB = null;
    this.sceneTex = null;
    this.bloomTexA = null;
    this.bloomTexB = null;
    this.fbW = 0;
    this.fbH = 0;
    this.halfW = 0;
    this.halfH = 0;
  }

  private ensureBloomFramebuffers(w: number, h: number) {
    if (this.sceneFbo && this.fbW === w && this.fbH === h) {
      return;
    }
    this.releaseBloomFramebuffers();
    const gl = this.gl;
    const hw = Math.max(1, Math.floor(w / 2));
    const hh = Math.max(1, Math.floor(h / 2));

    const makeTex = (tw: number, th: number) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        tw,
        th,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      return t;
    };

    const makeFbo = (color: WebGLTexture) => {
      const f = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        color,
        0,
      );
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (ok !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteFramebuffer(f);
        throw new Error("bloom framebuffer incomplete");
      }
      return f;
    };

    this.sceneTex = makeTex(w, h);
    this.sceneFbo = makeFbo(this.sceneTex);
    this.bloomTexA = makeTex(hw, hh);
    this.bloomTexB = makeTex(hw, hh);
    this.bloomFboA = makeFbo(this.bloomTexA);
    this.bloomFboB = makeFbo(this.bloomTexB);
    this.fbW = w;
    this.fbH = h;
    this.halfW = hw;
    this.halfH = hh;
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

    this.ensureBloomFramebuffers(w, h);
    const hw = this.halfW;
    const hh = this.halfH;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(...this.bgColor);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawScenePass(w, h);

    gl.useProgram(this.progBloomBright);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFboA);
    gl.viewport(0, 0, hw, hh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex!);
    gl.uniform2f(this.bloomBrightLocs.u_resolution!, hw, hh);
    gl.uniform1f(this.bloomBrightLocs.u_threshold!, this.bloom.threshold);
    gl.uniform1f(this.bloomBrightLocs.u_softKnee!, this.bloom.softKnee);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const blurIters = Math.max(
      1,
      Math.min(4, Math.round(1 + this.bloom.radius * 4)),
    );
    const sigma = 0.85 + this.bloom.radius * 9.0;

    let read = this.bloomTexA!;
    let write = this.bloomTexB!;
    let readFbo = this.bloomFboA!;
    let writeFbo = this.bloomFboB!;

    for (let i = 0; i < blurIters; i++) {
      gl.useProgram(this.progBloomBlur);
      gl.uniform2f(this.bloomBlurLocs.u_resolution!, hw, hh);
      gl.uniform1f(this.bloomBlurLocs.u_sigma!, sigma);
      gl.uniform2f(this.bloomBlurLocs.u_direction!, 1, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      let t = read;
      read = write;
      write = t;
      let f = readFbo;
      readFbo = writeFbo;
      writeFbo = f;

      gl.uniform2f(this.bloomBlurLocs.u_direction!, 0, 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFbo);
      gl.bindTexture(gl.TEXTURE_2D, read);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      t = read;
      read = write;
      write = t;
      f = readFbo;
      readFbo = writeFbo;
      writeFbo = f;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.progBloomComposite);
    gl.uniform2f(this.bloomCompositeLocs.u_resolution!, w, h);
    gl.uniform1f(this.bloomCompositeLocs.u_strength!, this.bloom.strength);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex!);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, read);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
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
    this.releaseBloomFramebuffers();
    this.gl.deleteTexture(this.texture);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
    this.gl.deleteProgram(this.progBloomBright);
    this.gl.deleteProgram(this.progBloomBlur);
    this.gl.deleteProgram(this.progBloomComposite);
  }
}
