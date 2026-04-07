import type { RendererSyncSource } from "./applyRendererState";

/**
 * Superellipse exponent: n=2 → circle; n≈3–4 → soft “squircle” that reaches closer to
 * the viewport edges than a circle of the same max radius, with no sharp corners.
 */
const SUPERELLIPSE_N = 3.35;
/** Max extent in UV from center (0.5) toward each side — nearly edge to edge. */
const SEMI_AXIS = 0.47;
/** Full laps per second (≈18 s per loop at 0.056). */
const LOOPS_PER_SEC = 0.056;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Smooth closed curve (superellipse / Lamé curve): circular motion that bulges toward
 * the frame like a rounded square.
 */
function pointOnSquircleLoop(angle: number): { x: number; y: number } {
  const n = SUPERELLIPSE_N;
  const a = SEMI_AXIS;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const xt = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const yt = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
  /** Same as gl_FragCoord UV: y = 0 bottom, 1 top. */
  return {
    x: 0.5 + a * xt,
    y: 0.5 + a * yt,
  };
}

/**
 * VJ mode: sweep the displacement origin along a smooth squircle-like path near the
 * edges. All other settings come from `base` (your sliders).
 */
export function applyVjDrive(
  base: RendererSyncSource,
  timeSec: number,
): RendererSyncSource {
  const turns = timeSec * LOOPS_PER_SEC;
  /** Positive angle traverses the squircle opposite to the old negative-angle path (clockwise on screen). */
  const angle = turns * Math.PI * 2;
  const { x: cx, y: cy } = pointOnSquircleLoop(angle);

  return {
    ...base,
    blobCenterX: clamp01(cx),
    blobCenterY: clamp01(cy),
  };
}
