/**
 * Periodically picks new duplicate horizontal stair spacing and slews there quickly
 * (matches Design slider max 0–18%).
 */

import { AUDIBLE_DB_NORM_MIN } from "./audibleGate";

/** Same upper bound as Duplicate → Spacing (horizontal) in the Design panel. */
const HORIZ_STEP_MAX = 0.18;

/**
 * Seconds between new targets (~50% less often than the original 0.12–0.5s band).
 */
const PICK_INTERVAL_MIN = 0.24;
const PICK_INTERVAL_SPAN = 0.76;

/**
 * Approach rate toward the new target (1/s), same ballpark as speed-shift impulse decay
 * (~40–90 ms to almost settle).
 */
const SLEW_PER_SEC = 40;
/** When inaudible, settle horizontal stagger to 0 faster than normal target slew. */
const SILENCE_SLEW_PER_SEC = 100;

export type VjDupHorizRandomState = {
  /** Current smoothed step (fed to GPU). */
  value: number;
  /** Next horizontal step to ease toward. */
  target: number;
  untilNextPick: number;
};

export function createVjDupHorizRandomState(): VjDupHorizRandomState {
  return { value: 0, target: 0, untilNextPick: 0 };
}

export function resetVjDupHorizRandomState(st: VjDupHorizRandomState): void {
  st.value = 0;
  st.target = 0;
  st.untilNextPick = 0;
}

/**
 * Advance timer, maybe pick a new target, ease {@link VjDupHorizRandomState.value} toward it.
 * Optional high-band activity pulls the next pick sooner (snappier VJ).
 * {@link opts.dbNorm} — when below the audible floor, freezes new picks and eases to 0 (no horizontal stagger).
 * Returns effective `vjDupHorizStep` for the GPU.
 */
export function stepVjDupHorizRandom(
  dt: number,
  st: VjDupHorizRandomState,
  opts?: { highTransient?: number; dbNorm?: number },
): number {
  const dbNorm = opts?.dbNorm ?? 1;
  const audible = dbNorm >= AUDIBLE_DB_NORM_MIN;

  if (!audible) {
    st.target = 0;
    const alpha = 1 - Math.exp(-dt * SILENCE_SLEW_PER_SEC);
    st.value += (st.target - st.value) * alpha;
    if (Math.abs(st.value) < 1e-5) {
      st.value = 0;
    }
    return st.value;
  }

  st.untilNextPick -= dt;
  const ht = opts?.highTransient ?? 0;
  if (ht > 0.06) {
    st.untilNextPick -= dt * (1.1 + ht * 4);
  }
  if (st.untilNextPick <= 0) {
    st.untilNextPick = PICK_INTERVAL_MIN + Math.random() * PICK_INTERVAL_SPAN;
    st.target = Math.random() * HORIZ_STEP_MAX;
  }

  const alpha = 1 - Math.exp(-dt * SLEW_PER_SEC);
  st.value += (st.target - st.value) * alpha;
  if (Math.abs(st.target - st.value) < 1e-5) {
    st.value = st.target;
  }

  return st.value;
}
