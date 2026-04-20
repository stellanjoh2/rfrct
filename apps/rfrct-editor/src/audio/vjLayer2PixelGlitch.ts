import type { MicTickResult } from "./micAnalyzer";

type SpectralTick = Pick<MicTickResult, "bands" | "bandTransient">;

const BASS_TRANSIENT_MIN = 0.048;
const BASS_BAND_MIN = 0.038;
const TRIGGER_ROLL = 0.28;

const COOLDOWN_MIN_SEC = 1.4;
const COOLDOWN_MAX_SEC = 3.2;
const FLASH_HZ_MIN = 4.2;
const FLASH_HZ_MAX = 6.4;

function randomBurstDurationSec(): number {
  return 0.24 + Math.random() * 0.44;
}

export type VjLayer2PixelGlitchState = {
  primed: boolean;
  burstLeftSec: number;
  cooldownLeftSec: number;
  phase: number;
  flashHz: number;
  burstBoost: 2 | 4 | 8 | 12;
};

export function createVjLayer2PixelGlitchState(): VjLayer2PixelGlitchState {
  return {
    primed: false,
    burstLeftSec: 0,
    cooldownLeftSec: 0,
    phase: 0,
    flashHz: 5.2,
    burstBoost: 2,
  };
}

export function resetVjLayer2PixelGlitchState(
  st: VjLayer2PixelGlitchState,
): void {
  st.primed = false;
  st.burstLeftSec = 0;
  st.cooldownLeftSec = 0;
  st.phase = 0;
  st.burstBoost = 2;
}

function armBurst(st: VjLayer2PixelGlitchState): void {
  st.burstLeftSec = randomBurstDurationSec();
  st.flashHz = FLASH_HZ_MIN + Math.random() * (FLASH_HZ_MAX - FLASH_HZ_MIN);
  st.phase = Math.random() * Math.PI * 2;
  const roll = Math.random();
  if (roll < 0.42) st.burstBoost = 2;
  else if (roll < 0.74) st.burstBoost = 4;
  else if (roll < 0.93) st.burstBoost = 8;
  else st.burstBoost = 12;
}

export function stepVjLayer2PixelGlitch(
  tick: SpectralTick,
  dt: number,
  st: VjLayer2PixelGlitchState,
): 0 | 2 | 4 | 8 | 12 {
  st.cooldownLeftSec = Math.max(0, st.cooldownLeftSec - dt);

  if (!st.primed) {
    st.primed = true;
    return 0;
  }

  if (st.burstLeftSec > 0) {
    st.burstLeftSec = Math.max(0, st.burstLeftSec - dt);
    st.phase += dt * st.flashHz * Math.PI * 2;
    if (st.burstLeftSec <= 0) {
      st.cooldownLeftSec =
        COOLDOWN_MIN_SEC + Math.random() * (COOLDOWN_MAX_SEC - COOLDOWN_MIN_SEC);
      return 0;
    }
    return Math.sin(st.phase) >= 0 ? st.burstBoost : 0;
  }

  const bassTransient = tick.bandTransient.bass;
  const bassBand = tick.bands.bass;
  if (
    st.cooldownLeftSec <= 0 &&
    bassTransient > BASS_TRANSIENT_MIN &&
    bassBand > BASS_BAND_MIN &&
    Math.random() < TRIGGER_ROLL
  ) {
    armBurst(st);
    return st.burstBoost;
  }

  return 0;
}
