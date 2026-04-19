/**
 * Secondary layer: mostly invisible; bass-gated square-wave strobes up to ~1 s.
 * Opacity is strictly 0 or 1 — no ramp, no in-between alpha.
 *
 * Fires **groups** of 1–3 burst windows in quick succession; **2–3 s minimum**
 * pause between groups (breather), with short gaps only *within* a group.
 * Group size, duration, strobe rate, and micro-gaps are heavily randomized for
 * an irregular, “human-operated” feel.
 */

import type { MicTickResult } from "./micAnalyzer";

const BASS_TRANSIENT_MIN = 0.055;
const BASS_BAND_MIN = 0.042;
const TRIGGER_ROLL = 0.46;

/** Symmetric swing: scale starts at 1 − this and ends at 1 + this (e.g. 0.85 → 1.15). */
const STROBE_SCALE_DELTA = 0.15;
const STROBE_SCALE_LOW = 1 - STROBE_SCALE_DELTA;
const STROBE_SCALE_HIGH = 1 + STROBE_SCALE_DELTA;
/**
 * Full sweep duration (wall clock). Longer than typical on-screen strobes so the ramp
 * keeps running after the burst opacity has gone dark.
 */
const STROBE_SCALE_TOTAL_SEC = 1.35;

/** In-group gap after a burst (wider spread = less machine-like). */
function randomMicroGapSec(): number {
  const r = Math.random();
  if (r < 0.35) return 0.03 + Math.random() * 0.06;
  if (r < 0.72) return 0.07 + Math.random() * 0.12;
  return 0.16 + Math.random() * 0.22;
}

/** Pause after a full group finishes before the next group can start (seconds). */
const INTER_GROUP_MIN = 2.0;
const INTER_GROUP_MAX = 3.0;

/** How many strobes in a row — strong bias toward solo vs triple for contrast (not flat ⅓ each). */
function randomBurstsInGroup(): number {
  const r = Math.random();
  if (r < 0.38) return 1;
  if (r < 0.58) return 2;
  return 3;
}

/** Macro burst length — tri-modal: snappy hits vs sustained washes. */
function randomBurstDurationSec(): number {
  const r = Math.random();
  if (r < 0.34) return 0.12 + Math.random() * 0.28;
  if (r < 0.68) return 0.36 + Math.random() * 0.4;
  return 0.68 + Math.random() * 0.58;
}

/**
 * Strobe Hz — wide spread (slow crawl vs quicker chop) while staying mostly
 * below harsh display-beat speeds on 60 Hz.
 */
function randomStrobeHz(): number {
  const r = Math.random();
  if (r < 0.2) return 5 + Math.random() * 5;
  if (r < 0.48) return 8 + Math.random() * 7;
  if (r < 0.78) return 12 + Math.random() * 8;
  return 15 + Math.random() * 9;
}

type SpectralTick = Pick<MicTickResult, "bands" | "bandTransient">;

export type VjLayer2RandomBurstState = {
  primed: boolean;
  burstLeft: number;
  phase: number;
  strobeHz: number;
  /** Seconds until a new group can be started (after a group fully ends). */
  interGroupCooldown: number;
  /** Seconds until the next burst in the same group (after a burst ends, if more follow). */
  microCooldown: number;
  /** Bursts remaining in the current group (including the active one while it plays). */
  burstsLeftInGroup: number;
  /** True while the extended strobe-scale sweep is running (may outlast the burst). */
  strobeScaleAnimPlaying: boolean;
  /** Elapsed seconds in the sweep (0 = −15% scale; end of sweep = +15%). */
  strobeScaleAnimElapsed: number;
};

export function createVjLayer2RandomBurstState(): VjLayer2RandomBurstState {
  return {
    primed: false,
    burstLeft: 0,
    phase: 0,
    strobeHz: 12,
    interGroupCooldown: 0,
    microCooldown: 0,
    burstsLeftInGroup: 0,
    strobeScaleAnimPlaying: false,
    strobeScaleAnimElapsed: 0,
  };
}

export function resetVjLayer2RandomBurstState(st: VjLayer2RandomBurstState): void {
  st.primed = false;
  st.burstLeft = 0;
  st.interGroupCooldown = 0;
  st.microCooldown = 0;
  st.burstsLeftInGroup = 0;
  st.strobeScaleAnimPlaying = false;
  st.strobeScaleAnimElapsed = 0;
}

function armBurst(st: VjLayer2RandomBurstState): void {
  st.burstLeft = randomBurstDurationSec();
  st.strobeHz = randomStrobeHz();
  st.phase = Math.random() * Math.PI * 2;
}

export type VjLayer2RandomBurstStepResult = {
  /** Opacity multiplier — **0 or 1 only** (hard alpha). 0 between bursts. */
  opacity: number;
  /**
   * Layer scale: linear −15% → +15% over an extended wall-clock sweep; starts on burst frame zero
   * and keeps going after the on-screen strobe ends, then returns to 1.
   */
  strobeScaleMul: number;
};

/**
 * @returns Opacity (0/1) plus optional strobe-time scale multiplier for Layer 2.
 */
export function stepVjLayer2RandomBurst(
  tick: SpectralTick,
  dt: number,
  st: VjLayer2RandomBurstState,
): VjLayer2RandomBurstStepResult {
  st.interGroupCooldown = Math.max(0, st.interGroupCooldown - dt);
  st.microCooldown = Math.max(0, st.microCooldown - dt);

  const burstLeftAtStart = st.burstLeft;

  let opacity = 0;

  if (!st.primed) {
    st.primed = true;
    opacity = 0;
  } else {
    const tb = tick.bandTransient.bass;
    const bb = tick.bands.bass;

    const strobeFrame = (): number => {
      st.phase += dt * st.strobeHz * (Math.PI * 2);
      return Math.sin(st.phase) >= 0.0 ? 1.0 : 0.0;
    };

    if (st.burstLeft > 0) {
      opacity = strobeFrame();
      st.burstLeft -= dt;
      if (st.burstLeft <= 0) {
        st.burstLeft = 0;
        st.burstsLeftInGroup -= 1;
        if (st.burstsLeftInGroup > 0) {
          st.microCooldown = randomMicroGapSec();
        } else {
          st.interGroupCooldown =
            INTER_GROUP_MIN +
            Math.random() * (INTER_GROUP_MAX - INTER_GROUP_MIN);
        }
      }
    } else if (st.microCooldown <= 0 && st.burstsLeftInGroup > 0) {
      armBurst(st);
      opacity = strobeFrame();
    } else if (
      st.interGroupCooldown <= 0 &&
      st.burstsLeftInGroup === 0 &&
      tb > BASS_TRANSIENT_MIN &&
      bb > BASS_BAND_MIN &&
      Math.random() < TRIGGER_ROLL
    ) {
      st.burstsLeftInGroup = randomBurstsInGroup();
      armBurst(st);
      opacity = strobeFrame();
    } else {
      opacity = 0;
    }
  }

  const burstStarted = st.burstLeft > 0 && burstLeftAtStart <= 0;
  if (burstStarted) {
    st.strobeScaleAnimPlaying = true;
    st.strobeScaleAnimElapsed = 0;
  }

  let strobeScaleMul = 1;
  if (st.strobeScaleAnimPlaying) {
    const p = Math.min(1, st.strobeScaleAnimElapsed / STROBE_SCALE_TOTAL_SEC);
    strobeScaleMul = STROBE_SCALE_LOW + (STROBE_SCALE_HIGH - STROBE_SCALE_LOW) * p;
    st.strobeScaleAnimElapsed += dt;
    if (st.strobeScaleAnimElapsed >= STROBE_SCALE_TOTAL_SEC) {
      st.strobeScaleAnimPlaying = false;
      st.strobeScaleAnimElapsed = 0;
      strobeScaleMul = 1;
    }
  }

  return { opacity, strobeScaleMul };
}
