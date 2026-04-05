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
};

export type ImageLayout = {
  rect: { x: number; y: number; w: number; h: number };
  naturalWidth: number;
  naturalHeight: number;
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
  private vao: WebGLVertexArrayObject;
  private texture: WebGLTexture;
  private locs: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private start = performance.now();

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
  }

  private drawFrame = () => {
    const gl = this.gl;
    const w = gl.canvas.width;
    const h = gl.canvas.height;
    const time =
      (performance.now() - this.start) * 0.001 * Math.max(0, this.blob.speed);

    gl.clearColor(...this.bgColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

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
    gl.uniform1f(this.locs.u_time, time);
    gl.uniform1f(this.locs.u_refractStrength, this.blob.refractStrength);
    gl.uniform1f(this.locs.u_edgeSoftness, this.blob.edgeSoftness);
    gl.uniform1f(this.locs.u_frostBlur, this.blob.frostBlur);
    gl.uniform1f(this.locs.u_blurQuality, this.blob.blurQuality);
    gl.uniform1f(this.locs.u_chroma, this.blob.chroma);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
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
    this.gl.deleteTexture(this.texture);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
  }
}
