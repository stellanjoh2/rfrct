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
  };
}

export function resetVjLayer2RandomBurstState(st: VjLayer2RandomBurstState): void {
  st.primed = false;
  st.burstLeft = 0;
  st.interGroupCooldown = 0;
  st.microCooldown = 0;
  st.burstsLeftInGroup = 0;
}

function armBurst(st: VjLayer2RandomBurstState): void {
  st.burstLeft = randomBurstDurationSec();
  st.strobeHz = randomStrobeHz();
  st.phase = Math.random() * Math.PI * 2;
}

/**
 * @returns Opacity multiplier — **0 or 1 only** (hard alpha). 0 between bursts.
 */
export function stepVjLayer2RandomBurst(
  tick: SpectralTick,
  dt: number,
  st: VjLayer2RandomBurstState,
): number {
  st.interGroupCooldown = Math.max(0, st.interGroupCooldown - dt);
  st.microCooldown = Math.max(0, st.microCooldown - dt);

  if (!st.primed) {
    st.primed = true;
    return 0;
  }

  const tb = tick.bandTransient.bass;
  const bb = tick.bands.bass;

  const strobeFrame = (): number => {
    st.phase += dt * st.strobeHz * (Math.PI * 2);
    return Math.sin(st.phase) >= 0.0 ? 1.0 : 0.0;
  };

  if (st.burstLeft > 0) {
    const flash = strobeFrame();
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
    return flash;
  }

  // Between bursts in a group: after micro gap, chain the next burst (no bass required).
  if (st.microCooldown <= 0 && st.burstsLeftInGroup > 0) {
    armBurst(st);
    return strobeFrame();
  }

  // Idle between groups: bass may start a new group.
  if (
    st.interGroupCooldown <= 0 &&
    st.burstsLeftInGroup === 0 &&
    tb > BASS_TRANSIENT_MIN &&
    bb > BASS_BAND_MIN &&
    Math.random() < TRIGGER_ROLL
  ) {
    st.burstsLeftInGroup = randomBurstsInGroup();
    armBurst(st);
    return strobeFrame();
  }

  return 0;
}
