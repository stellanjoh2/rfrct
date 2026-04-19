/**
 * Secondary layer: scale wobble from loudness + strong bass-kick punch on transients.
 */

import type { MicTickResult } from "./micAnalyzer";

type SpectralTick = Pick<MicTickResult, "envelope" | "bands" | "bandTransient">;

export type VjLayer2ScaleAudioState = {
  phase: number;
  wander: number;
};

export function createVjLayer2ScaleAudioState(): VjLayer2ScaleAudioState {
  return { phase: 0, wander: 0 };
}

export function resetVjLayer2ScaleAudioState(st: VjLayer2ScaleAudioState): void {
  st.phase = 0;
  st.wander = 0;
}

/**
 * @param micRefractBoost — same gain as other VJ audio paths.
 * @returns Scale multiplier applied on top of Design layer scale (wide range so kicks read clearly).
 */
export function stepVjLayer2ScaleAudio(
  tick: SpectralTick,
  dt: number,
  st: VjLayer2ScaleAudioState,
  micRefractBoost: number,
): number {
  const env = Math.min(1, Math.max(0, tick.envelope * micRefractBoost));
  st.phase += dt * (1.05 + tick.bands.mid * 2.2);
  st.wander += dt * (tick.bands.bass - 0.5) * 0.7;
  st.wander = Math.max(-1, Math.min(1, st.wander));

  const wobble = Math.sin(st.phase) * 0.1 * env;
  const roam = st.wander * 0.06 * env;
  const pulse = (tick.bands.high + tick.bands.mid) * 0.04 * env;

  /** Bass transient + level — dominant term on kick drums. */
  const kick =
    tick.bandTransient.bass *
    (0.75 + tick.bands.bass * 0.45) *
    (0.45 + 0.55 * env);
  const kickScale = 0.42 * kick;

  let m = 1 + kickScale + wobble + roam + pulse;
  m = Math.max(0.38, Math.min(1.95, m));
  return m;
}
