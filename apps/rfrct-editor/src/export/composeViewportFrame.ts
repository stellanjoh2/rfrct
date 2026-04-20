import type { BackdropBlendMode } from "../videoBackdrop";

type Rgb = [number, number, number];

export type ComposeViewportFrameOptions = {
  sourceCanvas: HTMLCanvasElement;
  backgroundRgb: Rgb;
  canvasBlendMode: BackdropBlendMode;
  viewportHueDeg: number;
  solidOverlay: {
    enabled: boolean;
    rgb: Rgb;
    opacity: number;
    blendMode: BackdropBlendMode;
    hueRotateDeg: number;
  };
  invertStrobeOverlay?: {
    enabled: boolean;
    opacity: number;
  };
};

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function toCanvasCompositeOp(mode: BackdropBlendMode): GlobalCompositeOperation {
  if (mode === "overlay") return "overlay";
  if (mode === "screen") return "screen";
  if (mode === "plus-lighter") return "lighter";
  if (mode === "difference") return "difference";
  return "source-over";
}

export function composeViewportFrame(opts: ComposeViewportFrameOptions): HTMLCanvasElement {
  const w = Math.max(1, opts.sourceCanvas.width);
  const h = Math.max(1, opts.sourceCanvas.height);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) return opts.sourceCanvas;

  const br = Math.round(clamp01(opts.backgroundRgb[0]) * 255);
  const bg = Math.round(clamp01(opts.backgroundRgb[1]) * 255);
  const bb = Math.round(clamp01(opts.backgroundRgb[2]) * 255);
  ctx.fillStyle = `rgb(${br},${bg},${bb})`;
  ctx.fillRect(0, 0, w, h);

  if (opts.solidOverlay.enabled && opts.solidOverlay.opacity > 1e-5) {
    const sr = Math.round(clamp01(opts.solidOverlay.rgb[0]) * 255);
    const sg = Math.round(clamp01(opts.solidOverlay.rgb[1]) * 255);
    const sb = Math.round(clamp01(opts.solidOverlay.rgb[2]) * 255);
    const solid = document.createElement("canvas");
    solid.width = w;
    solid.height = h;
    const sctx = solid.getContext("2d");
    if (sctx) {
      sctx.fillStyle = `rgb(${sr},${sg},${sb})`;
      sctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = clamp01(opts.solidOverlay.opacity);
      ctx.globalCompositeOperation = toCanvasCompositeOp(opts.solidOverlay.blendMode);
      if (Math.abs(opts.solidOverlay.hueRotateDeg) > 1e-5) {
        ctx.filter = `hue-rotate(${opts.solidOverlay.hueRotateDeg}deg)`;
      }
      ctx.drawImage(solid, 0, 0, w, h);
      ctx.restore();
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = toCanvasCompositeOp(opts.canvasBlendMode);
  ctx.drawImage(opts.sourceCanvas, 0, 0, w, h);
  ctx.restore();

  if (opts.invertStrobeOverlay?.enabled && opts.invertStrobeOverlay.opacity > 1e-5) {
    const inv = document.createElement("canvas");
    inv.width = w;
    inv.height = h;
    const ictx = inv.getContext("2d");
    if (ictx) {
      ictx.fillStyle = "rgb(255,255,255)";
      ictx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = clamp01(opts.invertStrobeOverlay.opacity);
      ctx.globalCompositeOperation = "difference";
      ctx.drawImage(inv, 0, 0, w, h);
      ctx.restore();
    }
  }

  if (Math.abs(opts.viewportHueDeg) <= 1e-5) {
    return out;
  }

  const hueCanvas = document.createElement("canvas");
  hueCanvas.width = w;
  hueCanvas.height = h;
  const hctx = hueCanvas.getContext("2d");
  if (!hctx) return out;
  hctx.filter = `hue-rotate(${opts.viewportHueDeg}deg)`;
  hctx.drawImage(out, 0, 0, w, h);
  return hueCanvas;
}
