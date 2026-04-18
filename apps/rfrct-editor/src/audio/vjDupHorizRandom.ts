/**
 * Periodically picks new duplicate horizontal stair spacing and slews there quickly
 * (matches Design slider max 0–18%).
 */

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
 * Returns effective `vjDupHorizStep` for the GPU.
 */
export function stepVjDupHorizRandom(
  dt: number,
  st: VjDupHorizRandomState,
): number {
  st.untilNextPick -= dt;
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
