import {
  BLOOM_FRAG_BLUR,
  BLOOM_FRAG_BRIGHT,
  BLOOM_FRAG_COMPOSITE,
  BLOOM_VERT,
} from "./bloomShaders";
import type { BloomParams } from "./types";
import { compileShader, linkProgram } from "./webgl";

/**
 * Half-res bloom: scene FBO → bright → separable blur → composite to default framebuffer.
 */
export class BloomPipeline {
  private readonly gl: WebGL2RenderingContext;
  private readonly progBright: WebGLProgram;
  private readonly progBlur: WebGLProgram;
  private readonly progComposite: WebGLProgram;
  private readonly brightLocs: Record<string, WebGLUniformLocation | null>;
  private readonly blurLocs: Record<string, WebGLUniformLocation | null>;
  private readonly compositeLocs: Record<string, WebGLUniformLocation | null>;

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

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    const bv = compileShader(gl, gl.VERTEX_SHADER, BLOOM_VERT);
    const bBright = compileShader(gl, gl.FRAGMENT_SHADER, BLOOM_FRAG_BRIGHT);
    const bBlur = compileShader(gl, gl.FRAGMENT_SHADER, BLOOM_FRAG_BLUR);
    const bComp = compileShader(gl, gl.FRAGMENT_SHADER, BLOOM_FRAG_COMPOSITE);
    this.progBright = linkProgram(gl, bv, bBright);
    this.progBlur = linkProgram(gl, bv, bBlur);
    this.progComposite = linkProgram(gl, bv, bComp);
    gl.deleteShader(bv);
    gl.deleteShader(bBright);
    gl.deleteShader(bBlur);
    gl.deleteShader(bComp);

    this.brightLocs = {};
    this.blurLocs = {};
    this.compositeLocs = {};
    for (const n of ["u_scene", "u_resolution", "u_threshold", "u_softKnee"] as const) {
      this.brightLocs[n] = gl.getUniformLocation(this.progBright, n);
    }
    for (const n of ["u_tex", "u_resolution", "u_direction", "u_sigma"] as const) {
      this.blurLocs[n] = gl.getUniformLocation(this.progBlur, n);
    }
    for (const n of ["u_scene", "u_bloom", "u_resolution", "u_strength"] as const) {
      this.compositeLocs[n] = gl.getUniformLocation(this.progComposite, n);
    }
    gl.useProgram(this.progComposite);
    gl.uniform1i(this.compositeLocs.u_scene, 0);
    gl.uniform1i(this.compositeLocs.u_bloom, 1);
    gl.useProgram(this.progBright);
    gl.uniform1i(this.brightLocs.u_scene, 0);
    gl.useProgram(this.progBlur);
    gl.uniform1i(this.blurLocs.u_tex, 0);
  }

  dispose(): void {
    const gl = this.gl;
    this.releaseFramebuffers();
    gl.deleteProgram(this.progBright);
    gl.deleteProgram(this.progBlur);
    gl.deleteProgram(this.progComposite);
  }

  /** Call when canvas backing size changes (same as renderer resize). */
  releaseFramebuffers(): void {
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

  ensureFramebuffers(w: number, h: number): void {
    if (this.sceneFbo && this.fbW === w && this.fbH === h) {
      return;
    }
    this.releaseFramebuffers();
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

  getSceneFramebuffer(): WebGLFramebuffer {
    return this.sceneFbo!;
  }

  getSceneTexture(): WebGLTexture {
    return this.sceneTex!;
  }

  /**
   * Assumes scene color was rendered into the scene FBO. Runs bloom stages and draws to the canvas.
   */
  finalizeToCanvas(
    bloom: BloomParams,
    vao: WebGLVertexArrayObject,
    canvasW: number,
    canvasH: number,
  ): void {
    const gl = this.gl;
    const hw = this.halfW;
    const hh = this.halfH;
    const sceneTex = this.sceneTex!;

    gl.useProgram(this.progBright);
    gl.bindVertexArray(vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFboA);
    gl.viewport(0, 0, hw, hh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.uniform2f(this.brightLocs.u_resolution!, hw, hh);
    gl.uniform1f(this.brightLocs.u_threshold!, bloom.threshold);
    gl.uniform1f(this.brightLocs.u_softKnee!, bloom.softKnee);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const blurIters = Math.max(
      1,
      Math.min(4, Math.round(1 + bloom.radius * 4)),
    );
    const sigma = 0.85 + bloom.radius * 9.0;

    let read = this.bloomTexA!;
    let write = this.bloomTexB!;
    let readFbo = this.bloomFboA!;
    let writeFbo = this.bloomFboB!;

    for (let i = 0; i < blurIters; i++) {
      gl.useProgram(this.progBlur);
      gl.uniform2f(this.blurLocs.u_resolution!, hw, hh);
      gl.uniform1f(this.blurLocs.u_sigma!, sigma);
      gl.uniform2f(this.blurLocs.u_direction!, 1, 0);
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

      gl.uniform2f(this.blurLocs.u_direction!, 0, 1);
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
    gl.viewport(0, 0, canvasW, canvasH);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.progComposite);
    gl.uniform2f(this.compositeLocs.u_resolution!, canvasW, canvasH);
    gl.uniform1f(this.compositeLocs.u_strength!, bloom.strength);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, read);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0);
  }
}
