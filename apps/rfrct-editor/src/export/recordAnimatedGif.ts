import { GIFEncoder, applyPalette, quantize } from "gifenc";

export type RecordAnimatedGifOptions = {
  canvas: HTMLCanvasElement;
  /** Optional per-frame compositor (e.g. DOM backdrop + blend stack). */
  getFrameCanvas?: () => HTMLCanvasElement;
  fps: number;
  durationSec: number;
  /** When set, scales the capture so width does not exceed this (aspect preserved). */
  maxWidth: number | null;
  maxColors: number;
  pixelArt: boolean;
  infiniteLoop: boolean;
  onProgress: (frame: number, total: number) => void;
  signal?: AbortSignal;
};

function outputDimensions(
  cw: number,
  ch: number,
  maxWidth: number | null,
): { w: number; h: number } {
  if (cw < 1 || ch < 1) return { w: 1, h: 1 };
  if (!maxWidth || cw <= maxWidth) {
    return { w: cw, h: ch };
  }
  const w = maxWidth;
  const h = Math.max(1, Math.round((ch * maxWidth) / cw));
  return { w, h };
}

async function waitUntil(targetMs: number, signal?: AbortSignal): Promise<void> {
  while (performance.now() < targetMs) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
}

function uint8Equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

type HeldFrame = {
  index: Uint8Array;
  palette: ReturnType<typeof quantize>;
};

/**
 * Captures the WebGL canvas over real time, scales to the output size, and encodes an animated GIF.
 */
export async function recordAnimatedGif(
  opts: RecordAnimatedGifOptions,
): Promise<Blob> {
  const {
    canvas,
    getFrameCanvas,
    fps,
    durationSec,
    maxWidth,
    maxColors,
    pixelArt,
    infiniteLoop,
    onProgress,
    signal,
  } = opts;

  const source0 = getFrameCanvas ? getFrameCanvas() : canvas;
  const cw = source0.width;
  const ch = source0.height;
  const { w: tw, h: th } = outputDimensions(cw, ch, maxWidth);
  const frameDur = 1000 / Math.max(1, fps);
  const rawTotal = Math.ceil(Math.max(0.25, durationSec) * fps);
  const total = Math.max(1, Math.min(1800, rawTotal));

  /** Downscale in two steps (2× intermediate then to target) for smoother edges before GIF quantize. */
  const useSupersampleDownscale =
    !pixelArt && (tw < cw || th < ch);

  const scratch = document.createElement("canvas");
  scratch.width = tw;
  scratch.height = th;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("2D canvas context unavailable");
  }

  let superCanvas: HTMLCanvasElement | null = null;
  let superCtx: CanvasRenderingContext2D | null = null;
  if (useSupersampleDownscale) {
    const sw = tw * 2;
    const sh = th * 2;
    superCanvas = document.createElement("canvas");
    superCanvas.width = sw;
    superCanvas.height = sh;
    superCtx = superCanvas.getContext("2d", { willReadFrequently: true });
    if (!superCtx) {
      throw new Error("2D canvas context unavailable");
    }
    superCtx.imageSmoothingEnabled = true;
    superCtx.imageSmoothingQuality = "high";
  }

  ctx.imageSmoothingEnabled = !pixelArt;
  if (!pixelArt) {
    ctx.imageSmoothingQuality = "high";
  }

  /**
   * gifenc converts delay ms → centiseconds with round(ms/10). Values under 10ms become 0 cs;
   * delay 0 is poorly specified and tools like Photoshop may duplicate or pad frames.
   */
  const slotDelayMs = Math.max(10, Math.round(frameDur));

  const encoder = GIFEncoder();
  const start = performance.now();

  let held: HeldFrame | null = null;
  /** Accumulated display time (ms) for `held`, including every matching slot. */
  let runMs = 0;
  let firstWrite = true;

  const flushHeld = (delayMs: number) => {
    if (!held) return;
    encoder.writeFrame(held.index, tw, th, {
      palette: held.palette,
      delay: delayMs,
      ...(firstWrite ? { repeat: infiniteLoop ? 0 : -1 } : {}),
    });
    firstWrite = false;
  };

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await waitUntil(start + i * frameDur, signal);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const frameCanvas = getFrameCanvas ? getFrameCanvas() : canvas;
    if (useSupersampleDownscale && superCanvas && superCtx) {
      superCtx.drawImage(frameCanvas, 0, 0, superCanvas.width, superCanvas.height);
      ctx.drawImage(
        superCanvas,
        0,
        0,
        superCanvas.width,
        superCanvas.height,
        0,
        0,
        tw,
        th,
      );
    } else {
      ctx.drawImage(frameCanvas, 0, 0, tw, th);
    }
    const img = ctx.getImageData(0, 0, tw, th);
    const palette = quantize(img.data, maxColors);
    const index = applyPalette(img.data, palette);
    const cur: HeldFrame = { index, palette };

    if (held && uint8Equal(held.index, cur.index)) {
      runMs += slotDelayMs;
      onProgress(i + 1, total);
      continue;
    }

    if (held) {
      flushHeld(runMs);
    }

    held = cur;
    runMs = slotDelayMs;
    onProgress(i + 1, total);
  }

  if (held) {
    flushHeld(runMs);
  }

  encoder.finish();
  const bytes = encoder.bytes();
  return new Blob([bytes], { type: "image/gif" });
}
