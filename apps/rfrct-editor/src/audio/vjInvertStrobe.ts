/**
 * Short random “invert strobe” bursts: fullscreen difference blend, gated on
 * high-band FFT transients only (hats, crack, air).
 */

import type { MicTickResult } from "./micAnalyzer";

/** Min high-band transient to consider a hit (frame delta, ~0–1). */
const HIGH_TRANSIENT_MIN = 0.092;
/** Min sustained high-band energy so noise alone does not fire. */
const HIGH_BAND_MIN = 0.036;

/**
 * Burst length and strobe rate are loosely based on common stage/DMX behaviour: a “macro”
 * hit is often ~70–220 ms of flashes, and discrete strobing is usually kept in roughly
 * ~6–20 Hz so each flash spans multiple frames at 60fps. Faster tiers (≈25 Hz+) read as a
 * smear or alias badly, so we avoid them here.
 */
function randomBurstDurationSec(): number {
  const ms = 68 + Math.random() * 152; // ~68–220 ms
  return ms / 1000;
}

/** Hz ranges for random tiers — excludes very fast “upper tier” rates. */
const STROBE_HZ_TIERS: readonly [number, number][] = [
  [6, 10.5],
  [8.5, 14],
  [11, 20],
];

function randomStrobeHz(): number {
  const [lo, hi] =
    STROBE_HZ_TIERS[Math.floor(Math.random() * STROBE_HZ_TIERS.length)]!;
  return lo + Math.random() * (hi - lo);
}

type SpectralTick = Pick<MicTickResult, "bands" | "bandTransient">;

export type VjInvertStrobeState = {
  /** Skip first frame after audio start (same pattern as dup speed-shift). */
  primed: boolean;
  burstLeft: number;
  burstTotal: number;
  phase: number;
  strobeHz: number;
  cooldown: number;
};

export function createVjInvertStrobeState(): VjInvertStrobeState {
  return {
    primed: false,
    burstLeft: 0,
    burstTotal: 0,
    phase: 0,
    strobeHz: 14,
    cooldown: 0,
  };
}

export function resetVjInvertStrobeState(st: VjInvertStrobeState): void {
  st.primed = false;
  st.burstLeft = 0;
  st.burstTotal = 0;
  st.cooldown = 0;
}

/**
 * @param amount 0–1 — how often bursts are allowed (trigger chance + min gap after a burst).
 * @returns Opacity 0–1 for a white fullscreen layer with `mix-blend-mode: difference`.
 */
export function stepVjInvertStrobe(
  tick: SpectralTick,
  dt: number,
  st: VjInvertStrobeState,
  amount: number,
): number {
  const a = Math.min(1, Math.max(0, amount));
  /** ~legacy 0.48 when amount ≈ 0.5 */
  const triggerRoll = 0.1 + a * 0.82;
  const cooldownMin = 0.025 + (1 - a) * 0.14;
  const cooldownSpan = 0.038 + (1 - a) * 0.1;

  st.cooldown = Math.max(0, st.cooldown - dt);

  if (!st.primed) {
    st.primed = true;
    return 0;
  }

  const th = tick.bandTransient.high;
  const hi = tick.bands.high;

  if (st.burstLeft <= 0 && st.cooldown <= 0) {
    if (
      th > HIGH_TRANSIENT_MIN &&
      hi > HIGH_BAND_MIN &&
      Math.random() < triggerRoll
    ) {
      const dur = randomBurstDurationSec();
      st.burstLeft = dur;
      st.burstTotal = dur;
      st.strobeHz = randomStrobeHz();
      st.phase = Math.random() * Math.PI * 2;
    }
  }

  if (st.burstLeft <= 0) {
    return 0;
  }

  const env =
    st.burstTotal > 1e-6 ? Math.max(0, st.burstLeft / st.burstTotal) : 0;
  st.phase += dt * st.strobeHz * (Math.PI * 2);
  const blink = Math.sin(st.phase) >= 0 ? 1 : 0.1;
  const out = Math.min(1, env * (0.3 + 0.7 * blink));

  st.burstLeft -= dt;
  if (st.burstLeft <= 0) {
    st.burstLeft = 0;
    st.cooldown = cooldownMin + Math.random() * cooldownSpan;
  }

  return out;
}
