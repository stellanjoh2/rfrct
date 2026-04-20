/**
 * VJ: fullscreen black over the YouTube backdrop (binary on/off). Bass hits trigger black;
 * optional intro double/triple strobe; sustained black until the next strong bass hit.
 * Sensitivity controls how often transients count as hits (plus timing), not overlay strength.
 */

import { AUDIBLE_DB_NORM_MIN } from "./audibleGate";
import type { MicTickResult } from "./micAnalyzer";

/** Minimum bass energy (same order as duplicate speed-shift). */
const BASS_LEVEL_FLOOR = 0.035;
/** Base debounce — scales down slightly at sensitivity 1 so hits can register a bit faster. */
const BEAT_DEBOUNCE_SEC_MAX = 0.072;
const BEAT_DEBOUNCE_SEC_MIN = 0.038;

/** Low sensitivity = longer holds before release can fire (fewer flashes per minute). */
const MIN_BLACKOUT_MS_LO = 420;
const MIN_BLACKOUT_MS_HI = 200;
const REVEAL_AFTER_MS_LO = 1100;
const REVEAL_AFTER_MS_HI = 440;

type SpectralTick = Pick<
  MicTickResult,
  "envelope" | "dbNorm" | "bands" | "bandTransient"
>;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * @param sensitivity 0–1 — higher = more bass events count as hits (flashes more often).
 */
function isStrongBassHit(tick: SpectralTick, sensitivity: number): boolean {
  const s = clamp01(sensitivity);
  const { bands, bandTransient } = tick;
  const tb = bandTransient.bass;
  const tl = bandTransient.lowMid;

  const strongTb = lerp(0.055, 0.028, s);
  const strongTbAlt = lerp(0.02, 0.012, s);
  const strongBassBand = lerp(0.14, 0.08, s);
  const strongTl = lerp(0.07, 0.04, s);
  const strongBassBand2 = lerp(0.1, 0.055, s);

  const strongBass =
    tb > strongTb ||
    (tb > strongTbAlt && bands.bass > strongBassBand) ||
    (tl > strongTl && bands.bass > strongBassBand2);

  const softTb = lerp(0.018, 0.01, s);
  const softTl = lerp(0.045, 0.026, s);
  const softLm = lerp(0.12, 0.07, s);
  const softTb2 = lerp(0.012, 0.006, s);
  const softBass =
    tb > softTb ||
    tl > softTl ||
    (bands.lowMid > softLm && tb > softTb2);

  const floor = lerp(BASS_LEVEL_FLOOR, 0.02, s);
  const envMin = lerp(0.075, 0.045, s);
  const hasSignal = bands.bass >= floor || tick.envelope > envMin;

  const softPass = lerp(0.38, 0.88, s);
  const transient = strongBass || (softBass && Math.random() < softPass);
  return hasSignal && transient;
}

function beatDebounceSec(sensitivity: number): number {
  const s = clamp01(sensitivity);
  return lerp(BEAT_DEBOUNCE_SEC_MAX, BEAT_DEBOUNCE_SEC_MIN, s);
}

function blackSegmentMs(sensitivity: number): number {
  const s = clamp01(sensitivity);
  const lo = lerp(92, 44, s);
  const hi = lerp(125, 72, s);
  return lo + Math.random() * (hi - lo);
}

function gapSegmentMs(sensitivity: number): number {
  const s = clamp01(sensitivity);
  const lo = lerp(56, 20, s);
  const hi = lerp(88, 38, s);
  return lo + Math.random() * (hi - lo);
}

/** Probability of a 2- or 3-pulse strobe intro (higher at high sensitivity). */
function rollIntroStrobe(
  nowMs: number,
  sensitivity: number,
): IntroStrobeState | null {
  const s = clamp01(sensitivity);
  const chance = lerp(0.05, 0.78, s);
  if (Math.random() >= chance) {
    return null;
  }
  const tripleBias = lerp(0.18, 0.72, s);
  const pulseCount = Math.random() < tripleBias ? 3 : 2;
  const totalSegments = 2 * pulseCount - 1;
  return {
    totalSegments,
    segmentIdx: 0,
    phaseEndMs: nowMs + blackSegmentMs(sensitivity),
  };
}

export type IntroStrobeState = {
  totalSegments: number;
  segmentIdx: number;
  phaseEndMs: number;
};

export type VjYoutubeBeatBlackoutState = {
  primed: boolean;
  blackingOut: boolean;
  blackoutStartMs: number;
  beatDebounce: number;
  /** Strobe-style B–gap–B[–gap–B] before sustained blackout. */
  introStrobe: IntroStrobeState | null;
};

export function createVjYoutubeBeatBlackoutState(): VjYoutubeBeatBlackoutState {
  return {
    primed: false,
    blackingOut: false,
    blackoutStartMs: 0,
    beatDebounce: 0,
    introStrobe: null,
  };
}

export function resetVjYoutubeBeatBlackoutState(st: VjYoutubeBeatBlackoutState): void {
  st.primed = false;
  st.blackingOut = false;
  st.blackoutStartMs = 0;
  st.beatDebounce = 0;
  st.introStrobe = null;
}

function advanceIntroStrobe(
  st: VjYoutubeBeatBlackoutState,
  nowMs: number,
  sensitivity: number,
): void {
  const is = st.introStrobe;
  if (!is) return;
  const s = clamp01(sensitivity);
  while (is && nowMs >= is.phaseEndMs) {
    if (is.segmentIdx >= is.totalSegments - 1) {
      st.introStrobe = null;
      break;
    }
    is.segmentIdx += 1;
    const inGap = is.segmentIdx % 2 === 1;
    is.phaseEndMs = nowMs + (inGap ? gapSegmentMs(s) : blackSegmentMs(s));
  }
}

/** Black segments are fully opaque; gaps show 100% video. */
function opacityForIntro(intro: IntroStrobeState): number {
  return intro.segmentIdx % 2 === 0 ? 1 : 0;
}

/**
 * @param sensitivity 0–1 — how often bass transients trigger blackouts (spectral + timing).
 * @returns Opacity 0 or 1 for a layer above the iframe only (below the WebGL canvas).
 */
export function stepVjYoutubeBeatBlackout(
  tick: SpectralTick,
  dt: number,
  st: VjYoutubeBeatBlackoutState,
  nowMs: number,
  sensitivity: number,
): number {
  st.beatDebounce = Math.max(0, st.beatDebounce - dt);
  const s = clamp01(sensitivity);
  const debounce = beatDebounceSec(s);

  const minBlackMs = lerp(MIN_BLACKOUT_MS_LO, MIN_BLACKOUT_MS_HI, s);
  const revealAfterMs = lerp(REVEAL_AFTER_MS_LO, REVEAL_AFTER_MS_HI, s);

  const audible = tick.dbNorm >= AUDIBLE_DB_NORM_MIN;

  if (!audible) {
    st.blackingOut = false;
    st.beatDebounce = 0;
    st.introStrobe = null;
    return 0;
  }

  if (!st.primed) {
    st.primed = true;
    if (!st.blackingOut) return 0;
    advanceIntroStrobe(st, nowMs, s);
    if (st.introStrobe) return opacityForIntro(st.introStrobe);
    return 1;
  }

  const hit = isStrongBassHit(tick, sensitivity) && st.beatDebounce <= 0;

  if (st.blackingOut) {
    advanceIntroStrobe(st, nowMs, s);

    const elapsed = nowMs - st.blackoutStartMs;
    const canReveal =
      !st.introStrobe &&
      elapsed >= Math.max(minBlackMs, revealAfterMs) &&
      hit;

    if (canReveal) {
      st.blackingOut = false;
      st.introStrobe = null;
      st.beatDebounce = debounce;
      return 0;
    }

    if (st.introStrobe) {
      return opacityForIntro(st.introStrobe);
    }
    return 1;
  }

  if (hit) {
    st.blackingOut = true;
    st.blackoutStartMs = nowMs;
    st.beatDebounce = debounce;
    st.introStrobe = rollIntroStrobe(nowMs, sensitivity);
    if (st.introStrobe) {
      return opacityForIntro(st.introStrobe);
    }
    return 1;
  }

  return 0;
}
