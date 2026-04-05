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
