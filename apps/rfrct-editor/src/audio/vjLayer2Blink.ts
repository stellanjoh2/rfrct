/**
 * Random HF-gated bursts on the secondary layer — shared timing for dip vs inverse flash.
 */

import type { MicTickResult } from "./micAnalyzer";

const HIGH_TRANSIENT_MIN = 0.088;
const HIGH_BAND_MIN = 0.034;
const TRIGGER_ROLL = 0.42;

function randomBurstDurationSec(): number {
  const ms = 72 + Math.random() * 160;
  return ms / 1000;
}

type SpectralTick = Pick<MicTickResult, "bands" | "bandTransient">;

export type VjLayer2BlinkState = {
  primed: boolean;
  burstLeft: number;
  burstTotal: number;
  phase: number;
  flickerHz: number;
  cooldown: number;
};

export function createVjLayer2BlinkState(): VjLayer2BlinkState {
  return {
    primed: false,
    burstLeft: 0,
    burstTotal: 0,
    phase: 0,
    flickerHz: 11,
    cooldown: 0,
  };
}

export function resetVjLayer2BlinkState(st: VjLayer2BlinkState): void {
  st.primed = false;
  st.burstLeft = 0;
  st.burstTotal = 0;
  st.cooldown = 0;
}

export type VjLayer2BlinkPair = {
  /** Multiply — dips during bursts (normal “Layer blink”). Idle = 1. */
  dip: number;
  /**
   * Multiply — mostly 0; flashes during the **same** bursts on the opposite half of the
   * flicker cycle so the logo is on screen less often (“Layer blink inverse”).
   */
  inverse: number;
};

/**
 * Advances burst state once. Use {@link dip} and/or {@link inverse} depending on which toggles are on.
 */
export function stepVjLayer2BlinkPair(
  tick: SpectralTick,
  dt: number,
  st: VjLayer2BlinkState,
): VjLayer2BlinkPair {
  st.cooldown = Math.max(0, st.cooldown - dt);

  if (!st.primed) {
    st.primed = true;
    return { dip: 1, inverse: 0 };
  }

  const th = tick.bandTransient.high;
  const hi = tick.bands.high;

  if (st.burstLeft <= 0 && st.cooldown <= 0) {
    if (
      th > HIGH_TRANSIENT_MIN &&
      hi > HIGH_BAND_MIN &&
      Math.random() < TRIGGER_ROLL
    ) {
      const dur = randomBurstDurationSec();
      st.burstLeft = dur;
      st.burstTotal = dur;
      st.flickerHz = 7 + Math.random() * 14;
      st.phase = Math.random() * Math.PI * 2;
    }
  }

  if (st.burstLeft <= 0) {
    return { dip: 1, inverse: 0 };
  }

  const env =
    st.burstTotal > 1e-6 ? Math.max(0, st.burstLeft / st.burstTotal) : 0;
  st.phase += dt * st.flickerHz * (Math.PI * 2);
  const hiHalf = Math.sin(st.phase) >= 0;
  const blink = hiHalf ? 1 : 0.12;
  const dip = Math.min(1, Math.max(0.08, 0.2 + 0.8 * env * blink));

  /** Inverse flashes when the dip waveform is in its “dark” half (sparse on-screen time). */
  const inverse = hiHalf ? 0 : env;

  st.burstLeft -= dt;
  if (st.burstLeft <= 0) {
    st.burstLeft = 0;
    st.cooldown = 0.04 + Math.random() * 0.09;
  }

  return { dip, inverse: Math.min(1, Math.max(0, inverse)) };
}

/** @deprecated Prefer {@link stepVjLayer2BlinkPair} — opacity multiplier for dip-only mode. */
export function stepVjLayer2Blink(
  tick: SpectralTick,
  dt: number,
  st: VjLayer2BlinkState,
): number {
  return stepVjLayer2BlinkPair(tick, dt, st).dip;
}
