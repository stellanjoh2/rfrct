import {
  BLOOM_FRAG_BRIGHT,
  BLOOM_FRAG_COMPOSITE,
  BLOOM_FRAG_KAWASE,
  BLOOM_VERT,
} from "./bloomShaders";
import type { BloomParams } from "./types";
import { compileShader, linkProgram } from "./webgl";

/**
 * Full-resolution bloom buffers + multi-pass Kawase blur: no upscale grid, and
 * isotropic blur avoids separable Gaussian cross-hatching at large radii.
 */
export class BloomPipeline {
  private readonly gl: WebGL2RenderingContext;
  private readonly progBright: WebGLProgram;
  private readonly progKawase: WebGLProgram;
  private readonly progComposite: WebGLProgram;
  private readonly brightLocs: Record<string, WebGLUniformLocation | null>;
  private readonly kawaseLocs: Record<string, WebGLUniformLocation | null>;
  private readonly compositeLocs: Record<string, WebGLUniformLocation | null>;

  private sceneTex: WebGLTexture | null = null;
  private sceneFbo: WebGLFramebuffer | null = null;
  private bloomTexA: WebGLTexture | null = null;
  private bloomTexB: WebGLTexture | null = null;
  private bloomFboA: WebGLFramebuffer | null = null;
  private bloomFboB: WebGLFramebuffer | null = null;
  private fbW = 0;
  private fbH = 0;
  /** Bloom ping-pong matches canvas backing size (same pixel grid as composite). */
  private bloomW = 0;
  private bloomH = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    const bv = compileShader(gl, gl.VERTEX_SHADER, BLOOM_VERT);
    const bBright = compileShader(gl, gl.FRAGMENT_SHADER, BLOOM_FRAG_BRIGHT);
    const bKawase = compileShader(gl, gl.FRAGMENT_SHADER, BLOOM_FRAG_KAWASE);
    const bComp = compileShader(gl, gl.FRAGMENT_SHADER, BLOOM_FRAG_COMPOSITE);
    this.progBright = linkProgram(gl, bv, bBright);
    this.progKawase = linkProgram(gl, bv, bKawase);
    this.progComposite = linkProgram(gl, bv, bComp);
    gl.deleteShader(bv);
    gl.deleteShader(bBright);
    gl.deleteShader(bKawase);
    gl.deleteShader(bComp);

    this.brightLocs = {};
    this.kawaseLocs = {};
    this.compositeLocs = {};
    for (const n of ["u_scene", "u_resolution", "u_threshold", "u_softKnee"] as const) {
      this.brightLocs[n] = gl.getUniformLocation(this.progBright, n);
    }
    for (const n of ["u_tex", "u_resolution", "u_offsetPx"] as const) {
      this.kawaseLocs[n] = gl.getUniformLocation(this.progKawase, n);
    }
    for (const n of [
      "u_scene",
      "u_bloom",
      "u_resolution",
      "u_strength",
      "u_opaqueOutput",
    ] as const) {
      this.compositeLocs[n] = gl.getUniformLocation(this.progComposite, n);
    }
    gl.useProgram(this.progComposite);
    gl.uniform1i(this.compositeLocs.u_scene, 0);
    gl.uniform1i(this.compositeLocs.u_bloom, 1);
    gl.useProgram(this.progBright);
    gl.uniform1i(this.brightLocs.u_scene, 0);
    gl.useProgram(this.progKawase);
    gl.uniform1i(this.kawaseLocs.u_tex, 0);
  }

  dispose(): void {
    const gl = this.gl;
    this.releaseFramebuffers();
    gl.deleteProgram(this.progBright);
    gl.deleteProgram(this.progKawase);
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
    this.bloomW = 0;
    this.bloomH = 0;
  }

  ensureFramebuffers(w: number, h: number): void {
    if (this.sceneFbo && this.fbW === w && this.fbH === h) {
      return;
    }
    this.releaseFramebuffers();
    const gl = this.gl;
    const hw = Math.max(1, w);
    const hh = Math.max(1, h);

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
    this.bloomW = hw;
    this.bloomH = hh;
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
    options?: { transparentCanvas?: boolean },
  ): void {
    const gl = this.gl;
    const bw = this.bloomW;
    const bh = this.bloomH;
    const sceneTex = this.sceneTex!;

    gl.useProgram(this.progBright);
    gl.bindVertexArray(vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFboA);
    gl.viewport(0, 0, bw, bh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.uniform2f(this.brightLocs.u_resolution!, bw, bh);
    gl.uniform1f(this.brightLocs.u_threshold!, bloom.threshold);
    gl.uniform1f(this.brightLocs.u_softKnee!, bloom.softKnee);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const numPasses = Math.min(
      14,
      Math.max(5, Math.round(4 + bloom.radius * 5.5)),
    );

    let read = this.bloomTexA!;
    let write = this.bloomTexB!;
    let readFbo = this.bloomFboA!;
    let writeFbo = this.bloomFboB!;

    for (let i = 0; i < numPasses; i++) {
      const offsetPx = (i + 1) * (0.38 + bloom.radius * 0.62);
      gl.useProgram(this.progKawase);
      gl.uniform2f(this.kawaseLocs.u_resolution!, bw, bh);
      gl.uniform1f(this.kawaseLocs.u_offsetPx!, offsetPx);
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const t = read;
      read = write;
      write = t;
      const f = readFbo;
      readFbo = writeFbo;
      writeFbo = f;
    }

    const transparentCanvas = Boolean(options?.transparentCanvas);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvasW, canvasH);
    if (transparentCanvas) {
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0, 0, 0, 1);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.progComposite);
    gl.uniform2f(this.compositeLocs.u_resolution!, canvasW, canvasH);
    gl.uniform1f(this.compositeLocs.u_strength!, bloom.strength);
    gl.uniform1f(
      this.compositeLocs.u_opaqueOutput!,
      transparentCanvas ? 0 : 1,
    );
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
