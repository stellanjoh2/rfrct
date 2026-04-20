/**
 * Second-order spring toward a 2D target plus slow idle wander (UV 0–1, y up).
 * `density` 0 = light / snappy, 1 = heavy / sluggish liquid.
 */
export function stepLensMouseFluid(
  dt: number,
  target: { x: number; y: number },
  pos: { x: number; y: number },
  vel: { x: number; y: number },
  density: number,
  timeSec: number,
): { x: number; y: number; vx: number; vy: number } {
  const dCl = Math.max(0, Math.min(1, density));
  const dtCl = Math.min(0.05, Math.max(0, dt));

  const k = 10 + (1 - dCl) * 38;
  const damp = 3.5 + dCl * 12.5;

  const ax = (target.x - pos.x) * k - vel.x * damp;
  const ay = (target.y - pos.y) * k - vel.y * damp;
  let vx = vel.x + ax * dtCl;
  let vy = vel.y + ay * dtCl;
  let x = pos.x + vx * dtCl;
  let y = pos.y + vy * dtCl;

  const wander = (0.0035 + dCl * 0.012) * (0.65 + 0.35 * Math.sin(timeSec * 0.37));
  x += Math.sin(timeSec * 1.12 + y * 5.5) * wander * dtCl * 2.8;
  y += Math.cos(timeSec * 0.86 + x * 4.8) * wander * dtCl * 2.8;

  const margin = 0.002;
  if (x <= margin || x >= 1 - margin) {
    vx *= 0.82;
    x = Math.min(1 - margin, Math.max(margin, x));
  }
  if (y <= margin || y >= 1 - margin) {
    vy *= 0.82;
    y = Math.min(1 - margin, Math.max(margin, y));
  }

  return { x, y, vx, vy };
}
