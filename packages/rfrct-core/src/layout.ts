/** Normalized rect in UV space: origin bottom-left, same as gl_FragCoord / resolution. */
export type ImageRect = { x: number; y: number; w: number; h: number };

/**
 * Contain-fit image into canvas with optional zoom. Returns rect for shader sampling.
 */
export function computeImageRect(
  canvasW: number,
  canvasH: number,
  imageW: number,
  imageH: number,
  scale: number,
): ImageRect {
  if (canvasW <= 0 || canvasH <= 0 || imageW <= 0 || imageH <= 0) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  const s = Math.min(canvasW / imageW, canvasH / imageH) * scale;
  const drawW = imageW * s;
  const drawH = imageH * s;
  const x0 = (canvasW - drawW) * 0.5;
  const yBottom = (canvasH - drawH) * 0.5;
  return {
    x: x0 / canvasW,
    y: yBottom / canvasH,
    w: drawW / canvasW,
    h: drawH / canvasH,
  };
}

/** Pan offset in normalized UV space (same units as ImageRect.x / .y). */
export function applyPanToRect(
  rect: ImageRect,
  panX: number,
  panY: number,
): ImageRect {
  return {
    x: rect.x + panX,
    y: rect.y + panY,
    w: rect.w,
    h: rect.h,
  };
}

export type UnderlayContainOptions = {
  /** Linear scale vs default contain (e.g. 1.5 = 50% larger on each axis). */
  scale?: number;
  /**
   * Positive moves the artwork toward the bottom of the letterbox (backing-store pixels in the
   * cell — use `cssPx * (canvas.height / canvas.clientHeight)` for CSS px).
   */
  offsetDownBackingPx?: number;
};

/**
 * Contain-fit `underlayW`×`underlayH` inside the on-screen image letterbox `rect`, in **local
 * cell** coordinates (0–1 across the rect, origin bottom-left). Used to map screen UV into an
 * underlay texture the same way CSS `object-fit: contain` centers a bitmap in the hero cell.
 */
export function computeUnderlayContainCell(
  canvasW: number,
  canvasH: number,
  rect: ImageRect,
  underlayW: number,
  underlayH: number,
  options?: UnderlayContainOptions,
): { ox: number; oy: number; sw: number; sh: number } {
  const cellW = rect.w * canvasW;
  const cellH = rect.h * canvasH;
  if (cellW <= 0 || cellH <= 0 || underlayW <= 0 || underlayH <= 0) {
    return { ox: 0, oy: 0, sw: 1, sh: 1 };
  }
  const scale = Math.max(1e-6, options?.scale ?? 1);
  const offsetDown = options?.offsetDownBackingPx ?? 0;
  const s = Math.min(cellW / underlayW, cellH / underlayH) * scale;
  const dw = underlayW * s;
  const dh = underlayH * s;
  let x0 = (cellW - dw) * 0.5;
  let y0 = (cellH - dh) * 0.5 - offsetDown;
  return {
    ox: x0 / cellW,
    oy: y0 / cellH,
    sw: dw / cellW,
    sh: dh / cellH,
  };
}
