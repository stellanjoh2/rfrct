/**
 * Momentary vertical scroll spikes on loudness transients, then snap back to base speed.
 */

/** Count “high dB” transient candidates; fire once every this many. */
const HIGH_BEATS_PER_SHIFT = 3;
/** Smoothed loudness floor — only tallies toward the counter above this. */
const HIGH_DB_FOR_BEAT = 0.4;
/** Min time between counted beats (avoids one drum hit spanning many frames). */
const BEAT_DEBOUNCE_SEC = 0.065;

export type VjDupSpeedShiftState = {
  /** Extra multiplier on top of 1 (0 = exactly base scroll from slider). */
  impulse: number;
  prevDbNorm: number;
  prevEnvelope: number;
  /** Seconds until pulse cooldown (after a real fire). */
  cooldown: number;
  /** After reset, skip one frame so we don’t treat startup as a transient. */
  primed: boolean;
  /** Counts high-dB beat candidates; fires after {@link HIGH_BEATS_PER_SHIFT} tallies. */
  highBeatTally: number;
  /** Time until another frame can register as a beat candidate. */
  beatDebounce: number;
};

export function createVjDupSpeedShiftState(): VjDupSpeedShiftState {
  return {
    impulse: 0,
    prevDbNorm: 0,
    prevEnvelope: 0,
    cooldown: 0,
    primed: false,
    highBeatTally: 0,
    beatDebounce: 0,
  };
}

export function resetVjDupSpeedShiftState(st: VjDupSpeedShiftState): void {
  st.impulse = 0;
  st.prevDbNorm = 0;
  st.prevEnvelope = 0;
  st.cooldown = 0;
  st.primed = false;
  st.highBeatTally = 0;
  st.beatDebounce = 0;
}

/** Return to baseline scroll this fast after a spike (~40–90 ms effective). */
const IMPULSE_DECAY_PER_SEC = 48;

/**
 * Peak extra multiplier (on top of 1× base). Large values = much more vertical travel per spike.
 */
function drawImpulsePeak(): number {
  return 72 + Math.random() * 140;
}

/**
 * @param base — Duplicate stack scroll speed from the Design slider (UV / s).
 * @param dbNorm — Smoothed loudness 0–1 from {@link MicAnalyzer.tick}.
 * @param envelope — Smoothed RMS 0–1 from {@link MicAnalyzer.tick} (good for transients).
 */
export function stepVjDupSpeedShift(
  base: number,
  dbNorm: number,
  envelope: number,
  dt: number,
  st: VjDupSpeedShiftState,
): { vy: number; vx: number } {
  st.impulse *= Math.exp(-dt * IMPULSE_DECAY_PER_SEC);
  if (st.impulse < 1e-4) {
    st.impulse = 0;
  }

  st.cooldown = Math.max(0, st.cooldown - dt);
  st.beatDebounce = Math.max(0, st.beatDebounce - dt);

  if (!st.primed) {
    st.prevEnvelope = envelope;
    st.prevDbNorm = dbNorm;
    st.primed = true;
    return { vy: base * (1 + st.impulse), vx: 0 };
  }

  const envDelta = envelope - st.prevEnvelope;
  const dbDelta = dbNorm - st.prevDbNorm;
  st.prevEnvelope = envelope;
  st.prevDbNorm = dbNorm;

  const strongHit =
    envDelta > 0.07 ||
    (dbDelta > 0.045 && dbNorm > 0.38);
  const softHit =
    envDelta > 0.028 ||
    (dbDelta > 0.018 && dbNorm > 0.32);

  const transient =
    strongHit || (softHit && Math.random() < 0.35);

  if (
    st.cooldown <= 0 &&
    envelope > 0.1 &&
    dbNorm >= HIGH_DB_FOR_BEAT &&
    transient &&
    st.beatDebounce <= 0
  ) {
    st.beatDebounce = BEAT_DEBOUNCE_SEC;
    st.highBeatTally += 1;
    if (st.highBeatTally >= HIGH_BEATS_PER_SHIFT) {
      st.highBeatTally = 0;
      st.impulse = Math.max(st.impulse, drawImpulsePeak());
      st.cooldown = 0.065;
    }
  }

  const vy = base * (1 + st.impulse);
  return { vy, vx: 0 };
}
