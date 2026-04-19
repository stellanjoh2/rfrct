/**
 * Momentary vertical scroll spikes driven by spectral transients:
 * large hits from bass, snappier smaller hits from high frequencies.
 */

import { AUDIBLE_DB_NORM_MIN } from "./audibleGate";
import type { MicTickResult } from "./micAnalyzer";

/** Count bass-dominant transient candidates before firing a big shift. */
const HIGH_BEATS_PER_SHIFT = 3;
/** Minimum bass energy to count toward the tally (not global dB). */
const BASS_LEVEL_FLOOR = 0.035;
/** Min time between counted bass beats (same drum hit → one tally). */
const BEAT_DEBOUNCE_SEC = 0.065;

/** Return to baseline scroll this fast after a spike (~40–90 ms effective). */
const IMPULSE_DECAY_PER_SEC = 48;
/**
 * When RMS loudness ({@link MicTickResult.dbNorm}) is below the audible floor,
 * speed-shift does not add new spikes and decays existing impulse quickly.
 */
const SILENCE_IMPULSE_DECAY_PER_SEC = 150;

/**
 * Peak extra multiplier for bass-driven tallies (on top of 1× base scroll).
 */
function drawBassImpulsePeak(): number {
  return 72 + Math.random() * 140;
}

/**
 * Smaller, faster-acting peaks for high-frequency transients (hats, crack).
 */
function drawHighImpulsePeak(): number {
  return 20 + Math.random() * 48;
}

export type VjDupSpeedShiftState = {
  /** Extra multiplier on top of 1 (0 = exactly base scroll from slider). */
  impulse: number;
  /** Seconds until pulse cooldown (after a bass tally fire). */
  cooldown: number;
  /** After reset, skip one frame so we don’t treat startup as a transient. */
  primed: boolean;
  highBeatTally: number;
  beatDebounce: number;
  /** Short cooldown so high-band snappy hits don’t stack every frame. */
  highSnappyCooldown: number;
};

export function createVjDupSpeedShiftState(): VjDupSpeedShiftState {
  return {
    impulse: 0,
    cooldown: 0,
    primed: false,
    highBeatTally: 0,
    beatDebounce: 0,
    highSnappyCooldown: 0,
  };
}

export function resetVjDupSpeedShiftState(st: VjDupSpeedShiftState): void {
  st.impulse = 0;
  st.cooldown = 0;
  st.primed = false;
  st.highBeatTally = 0;
  st.beatDebounce = 0;
  st.highSnappyCooldown = 0;
}

type SpectralTick = Pick<
  MicTickResult,
  "envelope" | "dbNorm" | "bands" | "bandTransient"
>;

/**
 * @param base — Duplicate stack scroll speed from the Design slider (UV / s).
 * @param tick — Must include FFT-derived {@link MicTickResult.bands} and {@link MicTickResult.bandTransient}.
 */
export function stepVjDupSpeedShift(
  base: number,
  tick: SpectralTick,
  dt: number,
  st: VjDupSpeedShiftState,
): { vy: number; vx: number } {
  const audible = tick.dbNorm >= AUDIBLE_DB_NORM_MIN;
  const decay = audible
    ? IMPULSE_DECAY_PER_SEC
    : SILENCE_IMPULSE_DECAY_PER_SEC;
  st.impulse *= Math.exp(-dt * decay);
  if (st.impulse < 1e-4) {
    st.impulse = 0;
  }

  st.cooldown = Math.max(0, st.cooldown - dt);
  st.beatDebounce = Math.max(0, st.beatDebounce - dt);
  st.highSnappyCooldown = Math.max(0, st.highSnappyCooldown - dt);

  if (!st.primed) {
    st.primed = true;
    return { vy: base * (1 + st.impulse), vx: 0 };
  }

  if (!audible) {
    st.highBeatTally = 0;
    st.cooldown = 0;
    st.beatDebounce = 0;
    st.highSnappyCooldown = 0;
    return { vy: base * (1 + st.impulse), vx: 0 };
  }

  const { bands, bandTransient } = tick;
  const tb = bandTransient.bass;
  const th = bandTransient.high;
  const tl = bandTransient.lowMid;

  /** Snappy high-frequency hits: add moderate impulse without bass tally. */
  if (
    st.highSnappyCooldown <= 0 &&
    th > 0.09 &&
    bands.high > 0.045
  ) {
    st.impulse = Math.max(st.impulse, drawHighImpulsePeak());
    st.highSnappyCooldown = 0.045;
  }

  /** Big bass-driven shifts: energy can read well in bass even when overall dB is moderate. */
  const strongBass =
    tb > 0.055 ||
    (tb > 0.02 && bands.bass > 0.14) ||
    (tl > 0.07 && bands.bass > 0.1);
  const softBass =
    tb > 0.018 ||
    tl > 0.045 ||
    (bands.lowMid > 0.12 && tb > 0.012);

  const hasSignal =
    bands.bass >= BASS_LEVEL_FLOOR ||
    tick.envelope > 0.075;

  const transient = strongBass || (softBass && Math.random() < 0.38);

  if (
    st.cooldown <= 0 &&
    hasSignal &&
    transient &&
    st.beatDebounce <= 0
  ) {
    st.beatDebounce = BEAT_DEBOUNCE_SEC;
    st.highBeatTally += 1;
    if (st.highBeatTally >= HIGH_BEATS_PER_SHIFT) {
      st.highBeatTally = 0;
      st.impulse = Math.max(st.impulse, drawBassImpulsePeak());
      st.cooldown = 0.065;
    }
  }

  const vy = base * (1 + st.impulse);
  return { vy, vx: 0 };
}
