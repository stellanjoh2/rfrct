export function normalizeHueDeg(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return ((x % 360) + 360) % 360;
}

export function parseHueRotateDegrees(filterValue: string): number {
  const m = /hue-rotate\(\s*(-?\d+(?:\.\d+)?)deg\s*\)/.exec(filterValue);
  if (!m) return 0;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : 0;
}
