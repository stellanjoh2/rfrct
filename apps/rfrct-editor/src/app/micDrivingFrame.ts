import type { MutableRefObject } from "react";
import {
  applyRendererState,
  applyVjDrive,
  buildRendererSyncParams,
  stepLensMouseFluid,
  type RfrctRenderer,
  type RendererSyncSource,
} from "@rfrct/core";
import { scaleTickForAudioBoost, type MicTickResult } from "../audio/micAnalyzer";
import { AUDIBLE_DB_NORM_MIN } from "../audio/audibleGate";
import {
  resetVjDupHorizRandomState,
  stepVjDupHorizRandom,
  type VjDupHorizRandomState,
} from "../audio/vjDupHorizRandom";
import {
  resetVjDupSpeedShiftState,
  stepVjDupSpeedShift,
  type VjDupSpeedShiftState,
} from "../audio/vjDupSpeedShift";
import {
  resetVjInvertStrobeState,
  stepVjInvertStrobe,
  type VjInvertStrobeState,
} from "../audio/vjInvertStrobe";
import {
  resetVjYoutubeBeatBlackoutState,
  stepVjYoutubeBeatBlackout,
  type VjYoutubeBeatBlackoutState,
} from "../audio/vjYoutubeBeatBlackout";
import {
  resetVjLayer2BlinkState,
  stepVjLayer2BlinkPair,
  type VjLayer2BlinkState,
} from "../audio/vjLayer2Blink";
import {
  resetVjLayer2ScaleAudioState,
  stepVjLayer2ScaleAudio,
  type VjLayer2ScaleAudioState,
} from "../audio/vjLayer2ScaleAudio";
import {
  resetVjLayer2RandomBurstState,
  stepVjLayer2RandomBurst,
  type VjLayer2RandomBurstState,
} from "../audio/vjLayer2RandomBurst";
import {
  resetVjLayer2PixelGlitchState,
  stepVjLayer2PixelGlitch,
  type VjLayer2PixelGlitchState,
} from "../audio/vjLayer2PixelGlitch";
import type { VjLayer2AutomationMode } from "../settingsSnapshot";

export type MicDrivingFrameRefs = {
  vjDupSpeedShiftStateRef: MutableRefObject<VjDupSpeedShiftState>;
  vjDupHorizRandomStateRef: MutableRefObject<VjDupHorizRandomState>;
  vjLayer2BlinkStateRef: MutableRefObject<VjLayer2BlinkState>;
  vjLayer2ScaleAudioStateRef: MutableRefObject<VjLayer2ScaleAudioState>;
  vjLayer2RandomBurstStateRef: MutableRefObject<VjLayer2RandomBurstState>;
  vjLayer2PixelGlitchStateRef: MutableRefObject<VjLayer2PixelGlitchState>;
  vjLayer3BlinkStateRef: MutableRefObject<VjLayer2BlinkState>;
  vjLayer3ScaleAudioStateRef: MutableRefObject<VjLayer2ScaleAudioState>;
  vjLayer3RandomBurstStateRef: MutableRefObject<VjLayer2RandomBurstState>;
  vjLayer3PixelGlitchStateRef: MutableRefObject<VjLayer2PixelGlitchState>;
  vjInvertStrobeStateRef: MutableRefObject<VjInvertStrobeState>;
  vjYoutubeBeatBlackoutStateRef: MutableRefObject<VjYoutubeBeatBlackoutState>;
  mouseLensTargetRef: MutableRefObject<{ x: number; y: number }>;
  mouseFluidPosRef: MutableRefObject<{ x: number; y: number }>;
  mouseFluidVelRef: MutableRefObject<{ x: number; y: number }>;
  blobCenterRef: MutableRefObject<{ x: number; y: number }>;
  layer2ReadyRef: MutableRefObject<boolean>;
  layer3ReadyRef: MutableRefObject<boolean>;
  vjLayer2AutomationModeRef: MutableRefObject<VjLayer2AutomationMode>;
  vjLayer3AutomationModeRef: MutableRefObject<VjLayer2AutomationMode>;
  vjLayer2StrobeScaleRef: MutableRefObject<boolean>;
  vjLayer3StrobeScaleRef: MutableRefObject<boolean>;
  vjLayer2PixelGlitchRef: MutableRefObject<boolean>;
  vjLayer3PixelGlitchRef: MutableRefObject<boolean>;
  vjInvertStrobeEnabledRef: MutableRefObject<boolean>;
  vjInvertStrobeAmountRef: MutableRefObject<number>;
  vjYoutubeBeatBlackoutEnabledRef: MutableRefObject<boolean>;
  vjYoutubeBeatBlackoutSensitivityRef: MutableRefObject<number>;
  vjInvertStrobeOverlayRef: MutableRefObject<HTMLDivElement | null>;
  vjYoutubeBeatBlackoutOverlayRef: MutableRefObject<HTMLDivElement | null>;
  layer2VjOpacityMulRef: MutableRefObject<number>;
  layer2VjScaleMulRef: MutableRefObject<number>;
  layer2VjBurstOpacityMulRef: MutableRefObject<number>;
  layer3VjOpacityMulRef: MutableRefObject<number>;
  layer3VjScaleMulRef: MutableRefObject<number>;
  layer3VjBurstOpacityMulRef: MutableRefObject<number>;
  syncSecondaryOverlayRef: MutableRefObject<() => void>;
};

/**
 * One animation frame of mic-driven renderer + overlay updates (VJ dup stack, layer 2,
 * invert strobe, YouTube blackout). Caller supplies `tick`, `now`, `dt`, and lens/VJ refs.
 */
export function applyMicDrivingRendererFrame(
  r: RfrctRenderer,
  raw: RendererSyncSource,
  tick: MicTickResult,
  now: number,
  dt: number,
  timeSec: number,
  micRefractBoost: number,
  vjMode: boolean,
  micDrivingRefraction: boolean,
  refs: MicDrivingFrameRefs,
): void {
  const tickVj = scaleTickForAudioBoost(tick, micRefractBoost);

  const baseScroll = raw.vjDupScrollSpeed;
  let scrollVy = baseScroll;
  let scrollVx = 0;
  if (raw.vjDupSpeedShift && raw.vjMode && raw.vjDupVertical) {
    const stepped = stepVjDupSpeedShift(
      baseScroll,
      tickVj,
      dt,
      refs.vjDupSpeedShiftStateRef.current,
    );
    scrollVy = stepped.vy;
    scrollVx = stepped.vx;
  } else {
    resetVjDupSpeedShiftState(refs.vjDupSpeedShiftStateRef.current);
  }

  let horizStep = raw.vjDupHorizStep;
  if (raw.vjDupRandomHoriz && raw.vjMode && raw.vjDupVertical) {
    horizStep = stepVjDupHorizRandom(dt, refs.vjDupHorizRandomStateRef.current, {
      highTransient: tickVj.bandTransient.high,
      dbNorm: tickVj.dbNorm,
    });
  } else {
    resetVjDupHorizRandomState(refs.vjDupHorizRandomStateRef.current);
  }

  if (raw.vjMode && raw.vjDupVertical && tickVj.dbNorm < AUDIBLE_DB_NORM_MIN) {
    scrollVy = 0;
    scrollVx = 0;
  }

  let effectiveFilterMode = raw.filterMode;
  let effectiveFilterStrength = raw.filterStrength;
  let effectiveFilterScale = raw.filterScale;

  refs.layer2VjOpacityMulRef.current = 1;
  refs.layer2VjScaleMulRef.current = 1;
  refs.layer2VjBurstOpacityMulRef.current = 1;
  refs.layer3VjOpacityMulRef.current = 1;
  refs.layer3VjScaleMulRef.current = 1;
  refs.layer3VjBurstOpacityMulRef.current = 1;
  const applyLayerVj = (
    isReady: boolean,
    blinkStateRef: MutableRefObject<VjLayer2BlinkState>,
    scaleAudioStateRef: MutableRefObject<VjLayer2ScaleAudioState>,
    randomBurstStateRef: MutableRefObject<VjLayer2RandomBurstState>,
    pixelGlitchStateRef: MutableRefObject<VjLayer2PixelGlitchState>,
    modeRef: MutableRefObject<VjLayer2AutomationMode>,
    strobeScaleRef: MutableRefObject<boolean>,
    pixelGlitchRef: MutableRefObject<boolean>,
    opacityMulRef: MutableRefObject<number>,
    scaleMulRef: MutableRefObject<number>,
    burstOpacityMulRef: MutableRefObject<number>,
  ) => {
    const layerVj = raw.vjMode && isReady && micDrivingRefraction;
    if (!layerVj) return false;
    const l2Mode = modeRef.current;
    if (l2Mode === "randomBlink" || l2Mode === "blinkInverse") {
      const { dip, inverse } = stepVjLayer2BlinkPair(
        tickVj,
        dt,
        blinkStateRef.current,
      );
      let m = 1;
      if (l2Mode === "randomBlink") m *= dip;
      if (l2Mode === "blinkInverse") m *= inverse;
      opacityMulRef.current = Math.max(0, Math.min(1, m));
    } else {
      resetVjLayer2BlinkState(blinkStateRef.current);
    }
    if (l2Mode === "randomScale") {
      scaleMulRef.current = stepVjLayer2ScaleAudio(
        tickVj,
        dt,
        scaleAudioStateRef.current,
        micRefractBoost,
      );
    } else {
      resetVjLayer2ScaleAudioState(scaleAudioStateRef.current);
    }
    if (l2Mode === "randomBurst") {
      const burst = stepVjLayer2RandomBurst(
        tickVj,
        dt,
        randomBurstStateRef.current,
      );
      burstOpacityMulRef.current = burst.opacity;
      if (strobeScaleRef.current) {
        scaleMulRef.current *= burst.strobeScaleMul;
      }
    } else {
      resetVjLayer2RandomBurstState(randomBurstStateRef.current);
    }
    if (pixelGlitchRef.current) {
      const glitchBoost = stepVjLayer2PixelGlitch(
        tickVj,
        dt,
        pixelGlitchStateRef.current,
      );
      if (glitchBoost > 0) {
        effectiveFilterMode = 7;
        effectiveFilterStrength = glitchBoost;
        effectiveFilterScale = glitchBoost;
      }
    } else {
      resetVjLayer2PixelGlitchState(pixelGlitchStateRef.current);
    }
    return true;
  };
  const layer2Vj = applyLayerVj(
    refs.layer2ReadyRef.current,
    refs.vjLayer2BlinkStateRef,
    refs.vjLayer2ScaleAudioStateRef,
    refs.vjLayer2RandomBurstStateRef,
    refs.vjLayer2PixelGlitchStateRef,
    refs.vjLayer2AutomationModeRef,
    refs.vjLayer2StrobeScaleRef,
    refs.vjLayer2PixelGlitchRef,
    refs.layer2VjOpacityMulRef,
    refs.layer2VjScaleMulRef,
    refs.layer2VjBurstOpacityMulRef,
  );
  const layer3Vj = applyLayerVj(
    refs.layer3ReadyRef.current,
    refs.vjLayer3BlinkStateRef,
    refs.vjLayer3ScaleAudioStateRef,
    refs.vjLayer3RandomBurstStateRef,
    refs.vjLayer3PixelGlitchStateRef,
    refs.vjLayer3AutomationModeRef,
    refs.vjLayer3StrobeScaleRef,
    refs.vjLayer3PixelGlitchRef,
    refs.layer3VjOpacityMulRef,
    refs.layer3VjScaleMulRef,
    refs.layer3VjBurstOpacityMulRef,
  );
  if (!layer2Vj && !layer3Vj) {
    resetVjLayer2BlinkState(refs.vjLayer2BlinkStateRef.current);
    resetVjLayer2ScaleAudioState(refs.vjLayer2ScaleAudioStateRef.current);
    resetVjLayer2RandomBurstState(refs.vjLayer2RandomBurstStateRef.current);
    resetVjLayer2PixelGlitchState(refs.vjLayer2PixelGlitchStateRef.current);
    resetVjLayer2BlinkState(refs.vjLayer3BlinkStateRef.current);
    resetVjLayer2ScaleAudioState(refs.vjLayer3ScaleAudioStateRef.current);
    resetVjLayer2RandomBurstState(refs.vjLayer3RandomBurstStateRef.current);
    resetVjLayer2PixelGlitchState(refs.vjLayer3PixelGlitchStateRef.current);
  }

  const invEl = refs.vjInvertStrobeOverlayRef.current;
  if (invEl) {
    if (refs.vjInvertStrobeEnabledRef.current) {
      const op = stepVjInvertStrobe(
        tickVj,
        dt,
        refs.vjInvertStrobeStateRef.current,
        refs.vjInvertStrobeAmountRef.current,
      );
      invEl.style.opacity = String(op);
    } else {
      resetVjInvertStrobeState(refs.vjInvertStrobeStateRef.current);
      invEl.style.opacity = "0";
    }
  }

  const ytBlackEl = refs.vjYoutubeBeatBlackoutOverlayRef.current;
  if (ytBlackEl) {
    if (refs.vjYoutubeBeatBlackoutEnabledRef.current) {
      const opYt = stepVjYoutubeBeatBlackout(
        tickVj,
        dt,
        refs.vjYoutubeBeatBlackoutStateRef.current,
        now,
        refs.vjYoutubeBeatBlackoutSensitivityRef.current,
      );
      ytBlackEl.style.opacity = String(opYt);
    } else {
      resetVjYoutubeBeatBlackoutState(refs.vjYoutubeBeatBlackoutStateRef.current);
      ytBlackEl.style.opacity = "0";
    }
  }

  let driven: RendererSyncSource;
  if (raw.lensMouseInput) {
    const target = refs.mouseLensTargetRef.current;
    const pos = refs.mouseFluidPosRef.current;
    const vel = refs.mouseFluidVelRef.current;
    const step = stepLensMouseFluid(
      dt,
      target,
      pos,
      vel,
      raw.fluidDensity,
      timeSec,
    );
    refs.mouseFluidPosRef.current = { x: step.x, y: step.y };
    refs.mouseFluidVelRef.current = { x: step.vx, y: step.vy };
    refs.blobCenterRef.current = { x: step.x, y: step.y };
    driven = { ...raw, blobCenterX: step.x, blobCenterY: step.y };
  } else if (vjMode && micDrivingRefraction) {
    driven = applyVjDrive(raw, timeSec);
    refs.blobCenterRef.current = {
      x: driven.blobCenterX,
      y: driven.blobCenterY,
    };
  } else {
    driven = raw;
  }

  const blinkSensitivity = raw.vjDupRandomBlinkSensitivity ?? 0.65;
  const blinkAudioDrive =
    tick.envelope * (0.15 + blinkSensitivity * 2.4) +
    tickVj.bandTransient.high * (0.22 + blinkSensitivity * 2.8);
  const reactiveBlinkSpeed = Math.max(
    0.2,
    (raw.vjDupRandomBlinkSpeed ?? 4) * (0.15 + blinkAudioDrive),
  );

  applyRendererState(
    r,
    buildRendererSyncParams({
      ...driven,
      micDrivingRefraction: true,
      micRefractBoost,
      micEnvelope: tick.envelope,
      filterMode: effectiveFilterMode,
      filterStrength: effectiveFilterStrength,
      filterScale: effectiveFilterScale,
      vjDupScrollSpeed: scrollVy,
      vjDupScrollSpeedX: scrollVx,
      vjDupRandomBlink: raw.vjDupRandomBlink,
      vjDupRandomBlinkSpeed: reactiveBlinkSpeed,
      vjDupHorizStep: horizStep,
    }),
  );
  refs.syncSecondaryOverlayRef.current();
}
