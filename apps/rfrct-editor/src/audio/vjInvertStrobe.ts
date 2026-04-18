/**
 * Short random “invert strobe” bursts: fullscreen difference blend, gated on
 * high-band FFT transients only (hats, crack, air).
 */

import type { MicTickResult } from "./micAnalyzer";

/** Min high-band transient to consider a hit (frame delta, ~0–1). */
const HIGH_TRANSIENT_MIN = 0.092;
/** Min sustained high-band energy so noise alone does not fire. */
const HIGH_BAND_MIN = 0.036;
/** Chance to actually start a burst when the above pass (keeps it sparse / random). */
const TRIGGER_ROLL = 0.48;

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
    strobeHz: 22,
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
 * @returns Opacity 0–1 for a white fullscreen layer with `mix-blend-mode: difference`.
 */
export function stepVjInvertStrobe(
  tick: SpectralTick,
  dt: number,
  st: VjInvertStrobeState,
): number {
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
      Math.random() < TRIGGER_ROLL
    ) {
      const dur = 0.032 + Math.random() * 0.1;
      st.burstLeft = dur;
      st.burstTotal = dur;
      st.strobeHz = 12 + Math.random() * 46;
      st.phase = Math.random() * Math.PI * 2;
    }
  }

  if (st.burstLeft <= 0) {
    return 0;
  }

  const env =
    st.burstTotal > 1e-6 ? Math.max(0, st.burstLeft / st.burstTotal) : 0;
  st.phase += dt * st.strobeHz * (Math.PI * 2);
  const blink = Math.sin(st.phase) >= 0 ? 1 : 0.07;
  const out = Math.min(1, env * (0.22 + 0.78 * blink));

  st.burstLeft -= dt;
  if (st.burstLeft <= 0) {
    st.burstLeft = 0;
    st.cooldown = 0.038 + Math.random() * 0.1;
  }

  return out;
}
