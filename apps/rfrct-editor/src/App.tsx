import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsSidebar } from "./components/settings/SettingsSidebar";
import { Focus } from "./focus";
import {
  applyPanToRect,
  applyRendererState,
  buildRendererSyncParams,
  computeImageRect,
  DEFAULT_PNG_EXPORT_PARAMS,
  DEFAULT_VJ_PATH_SPEED,
  isSvgFile,
  mergePngExportParams,
  parseHexColor,
  rasterizeSvgForRfrct,
  removeSolidBackgroundForPng,
  RfrctRenderer,
  trimCanvasToAlphaBounds,
  type FilterMode,
  type RendererSyncSource,
  type ShapeMode,
  stepLensMouseFluid,
} from "@rfrct/core";
import {
  INACTIVE_MIC_TICK,
  MicAnalyzer,
  type AudioInputMode,
  audioCaptureErrorMessage,
} from "./audio/micAnalyzer";
import {
  createVjDupHorizRandomState,
  resetVjDupHorizRandomState,
} from "./audio/vjDupHorizRandom";
import {
  createVjDupSpeedShiftState,
  resetVjDupSpeedShiftState,
} from "./audio/vjDupSpeedShift";
import {
  createVjInvertStrobeState,
  resetVjInvertStrobeState,
} from "./audio/vjInvertStrobe";
import {
  createVjYoutubeBeatBlackoutState,
  resetVjYoutubeBeatBlackoutState,
} from "./audio/vjYoutubeBeatBlackout";
import {
  createVjLayer2BlinkState,
  resetVjLayer2BlinkState,
} from "./audio/vjLayer2Blink";
import {
  createVjLayer2ScaleAudioState,
  resetVjLayer2ScaleAudioState,
} from "./audio/vjLayer2ScaleAudio";
import {
  createVjLayer2RandomBurstState,
  resetVjLayer2RandomBurstState,
} from "./audio/vjLayer2RandomBurst";
import {
  createVjLayer2PixelGlitchState,
  resetVjLayer2PixelGlitchState,
} from "./audio/vjLayer2PixelGlitch";
import type { BackdropBlendMode } from "./videoBackdrop";
import { postYoutubeMute, postYoutubePlayback } from "./youtube/forceMuteIframe";
import {
  createSettingsSnapshot,
  parseSettingsSnapshot,
  serializeSettingsSnapshot,
  vjLayer2ModeFromLegacyBools,
  vjLayer2ModeToLegacyBools,
  type HueApplyScope,
  type RfrctEditorSettingsSnapshotCopyPayload,
  type RfrctEditorSettingsSnapshotV1,
  type VjLayer2AutomationMode,
} from "./settingsSnapshot";
import { DESIGN_TEMPLATES, type DesignTemplateId } from "./designTemplates";
import { recordAnimatedGif } from "./export/recordAnimatedGif";
import { saveGifBlob } from "./export/saveGifBlob";
import { composeViewportFrame } from "./export/composeViewportFrame";
import { buildYoutubeEmbedSrc, parseYoutubeVideoId } from "./youtube/embedUrl";
import type {
  SecondaryLayerBlendMode,
  SecondaryLayerTintMode,
} from "./components/settings/secondaryLayerBlend";
import { secondaryLayerBlendToShaderId } from "./components/settings/secondaryLayerBlend";
import { revokeSvgObjectUrlIfBlob } from "./app/blobUrl";
import {
  captureExactViewportPng,
  downloadCanvasAsPng,
} from "./app/capturePng";
import {
  applyMicDrivingRendererFrame,
  type MicDrivingFrameRefs,
} from "./app/micDrivingFrame";
import { normalizeHueDeg, parseHueRotateDegrees } from "./app/hueUtils";

/** Pause lens shader time while scroll-zooming; resume after last wheel event. */
const ZOOM_ANIM_RESUME_MS = 120;
/** SVG re-raster is expensive (canvas + alpha scan + optional refine); debounce while zoom stays live via syncLayout. */
const SVG_RASTER_DEBOUNCE_MS = 320;

/** Default wordmark in `public/`; `BASE_URL` keeps paths valid on GitHub Pages (`base: "./"`). */
const TEMPLATE_LOGO_SVG_URL = `${import.meta.env.BASE_URL}rfrct-logo.svg`;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RfrctRenderer | null>(null);

  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [layer1FileName, setLayer1FileName] = useState<string | null>(null);
  const [svgSourceUrl, setSvgSourceUrl] = useState<string | null>(
    TEMPLATE_LOGO_SVG_URL,
  );
  const [svgTintMode, setSvgTintMode] = useState<
    "original" | "multiply" | "replace" | "gradient"
  >("original");
  const [svgTintHex, setSvgTintHex] = useState("#ffffff");
  const [svgGradientBlend, setSvgGradientBlend] = useState<
    "multiply" | "replace"
  >("replace");
  const [svgGradientHex2, setSvgGradientHex2] = useState("#000000");
  const [svgGradientHex3, setSvgGradientHex3] = useState("#ffffff");
  const [svgGradientThreeStops, setSvgGradientThreeStops] = useState(false);
  const [svgGradientAngleDeg, setSvgGradientAngleDeg] = useState(90);
  const [svgGradientScale, setSvgGradientScale] = useState(1);
  const [svgGradientPosition, setSvgGradientPosition] = useState(0);
  const [viewportPx, setViewportPx] = useState({ w: 0, h: 0 });

  const [bgHex, setBgHex] = useState("#000000");
  const [backdropImageUrl, setBackdropImageUrl] = useState<string | null>(null);
  const [backdropImageFileName, setBackdropImageFileName] = useState<string | null>(
    null,
  );
  const [imageScale, setImageScale] = useState(1);
  const imageScaleRef = useRef(1);
  imageScaleRef.current = imageScale;
  /** Target resolution for SVG texture; debounced from imageScale so wheel-zoom stays smooth. */
  const [svgRasterScale, setSvgRasterScale] = useState(1);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSvgRasterScale(imageScale);
    }, SVG_RASTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [imageScale]);

  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const imagePanRef = useRef(imagePan);
  imagePanRef.current = imagePan;
  const [blobSize, setBlobSize] = useState(0.22);
  const [blobSpeed, setBlobSpeed] = useState(1);
  const [pauseAnimation, setPauseAnimation] = useState(false);
  const [waveFreq, setWaveFreq] = useState(5);
  const [waveAmp, setWaveAmp] = useState(0.16);
  const [refract, setRefract] = useState(0.12);
  const [edgeSoft, setEdgeSoft] = useState(0.012);
  const [frostBlur, setFrostBlur] = useState(0);
  const [blurQuality, setBlurQuality] = useState(1);
  const [globalHueShift, setGlobalHueShift] = useState(0);
  const [hueApplyScope, setHueApplyScope] = useState<HueApplyScope>("scene");
  const [grainStrength, setGrainStrength] = useState(0);
  const [chroma, setChroma] = useState(0);
  const [bloomStrength, setBloomStrength] = useState(0);
  const [bloomRadius, setBloomRadius] = useState(0.2);
  const [bloomThreshold, setBloomThreshold] = useState(0.88);
  const [shapeMode, setShapeMode] = useState<ShapeMode>(0);
  const [filterMode, setFilterMode] = useState<FilterMode>(0);
  const [filterStrength, setFilterStrength] = useState(0);
  const [filterScale, setFilterScale] = useState(0.5);
  const [filterMotionSpeed, setFilterMotionSpeed] = useState(1);
  const [detailDistortionStrength, setDetailDistortionStrength] =
    useState(0);
  const [detailDistortionScale, setDetailDistortionScale] = useState(3.2);
  const [detailDirtStrength, setDetailDirtStrength] = useState(0);
  const [detailDirtHex, setDetailDirtHex] = useState("#665648");
  const detailDistortionEnabled = detailDistortionStrength > 1e-4;
  const [lensMouseInput, setLensMouseInput] = useState(false);
  /** 0 = light / snappy follow, 1 = heavy / sluggish liquid. */
  const [fluidDensity, setFluidDensity] = useState(0.45);

  const blobCenterRef = useRef({ x: 0.5, y: 0.5 });
  const dragModeRef = useRef<"none" | "pan" | "fx">("none");
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [pointerDrag, setPointerDrag] = useState<"pan" | "fx" | null>(null);

  const [uiVisible, setUiVisible] = useState(true);
  /** Hidden HUD — toggle with F (not listed in UI chrome). */
  const [fpsHudVisible, setFpsHudVisible] = useState(false);
  const [fpsHudValue, setFpsHudValue] = useState(0);
  const [webglError, setWebglError] = useState<string | null>(null);

  const [exportTransparent, setExportTransparent] = useState(false);
  const [exportRegion, setExportRegion] = useState<"full" | "image">("full");

  const [gifFps, setGifFps] = useState(24);
  const [gifMaxWidthEnabled, setGifMaxWidthEnabled] = useState(true);
  const [gifMaxWidth, setGifMaxWidth] = useState(600);
  const [gifMaxColors, setGifMaxColors] = useState<128 | 256>(256);
  const [gifDurationSec, setGifDurationSec] = useState(6);
  const [gifPixelArtResize, setGifPixelArtResize] = useState(false);
  const [gifInfiniteLoop, setGifInfiniteLoop] = useState(true);
  const [gifOutputFolderLabel, setGifOutputFolderLabel] = useState<
    string | null
  >(null);
  const [gifRecording, setGifRecording] = useState(false);
  const [gifRecordProgress, setGifRecordProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const gifDirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const gifAbortRef = useRef<AbortController | null>(null);
  const gifExportBusyRef = useRef(false);

  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeUrlDraft, setYoutubeUrlDraft] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [canvasBackdropBlend, setCanvasBackdropBlend] =
    useState<BackdropBlendMode>("normal");
  const [solidOverlayHex, setSolidOverlayHex] = useState("#000000");
  const [solidOverlayOpacity, setSolidOverlayOpacity] = useState(0);
  const [solidOverlayBlend, setSolidOverlayBlend] =
    useState<BackdropBlendMode>("normal");
  const [solidOverlayVjHueShift, setSolidOverlayVjHueShift] = useState(false);
  const [solidOverlayHueAudio, setSolidOverlayHueAudio] = useState(true);
  const solidOverlayRef = useRef<HTMLDivElement>(null);
  const youtubeEmbedActive = youtubeVideoId !== null;
  const youtubeEmbedSrc = useMemo(
    () =>
      youtubeVideoId
        ? buildYoutubeEmbedSrc(youtubeVideoId, {
            pageOrigin:
              typeof window !== "undefined" ? window.location.origin : undefined,
          })
        : "",
    [youtubeVideoId],
  );

  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);

  /** Embed is mute=1; re-send mute on load and on an interval so audio never stays on. */
  useEffect(() => {
    if (!youtubeVideoId) return;
    const iframe = youtubeIframeRef.current;
    if (!iframe) return;

    const tick = () => postYoutubeMute(iframe);

    tick();
    const onLoad = () => tick();
    iframe.addEventListener("load", onLoad);
    const interval = window.setInterval(tick, 1500);

    return () => {
      iframe.removeEventListener("load", onLoad);
      window.clearInterval(interval);
    };
  }, [youtubeVideoId, youtubeEmbedSrc]);

  const [micDrivingRefraction, setMicDrivingRefraction] = useState(false);
  const [audioInputMode, setAudioInputMode] =
    useState<AudioInputMode>("mic");
  const [micRefractBoost, setMicRefractBoost] = useState(0.65);
  const [vjMode, setVjMode] = useState(false);
  const [vjDupVertical, setVjDupVertical] = useState(false);
  /** Extra vertical space between dup rows (fraction of viewport height, 0 = touching). */
  const [vjDupGap, setVjDupGap] = useState(0);
  /** Horizontal stair step per row phase (cycles every 8 rows). */
  const [vjDupHorizStep, setVjDupHorizStep] = useState(0.03);
  /** Duplicate (stack) vertical scroll (UV y / sec); independent of blob animation speed. */
  const [vjDupScrollSpeed, setVjDupScrollSpeed] = useState(0.11);
  /** VJ: loudness-driven dup scroll bursts (Design → Duplicate stack). */
  const [vjDupSpeedShift, setVjDupSpeedShift] = useState(false);
  /** VJ: randomize duplicate horizontal stair spacing while audio is on. */
  const [vjDupRandomHoriz, setVjDupRandomHoriz] = useState(false);
  /** VJ: random duplicate-row blinking. */
  const [vjDupRandomBlink, setVjDupRandomBlink] = useState(false);
  /** Blink steps per second for random duplicate-row blinking. */
  const [vjDupRandomBlinkSpeed, setVjDupRandomBlinkSpeed] = useState(4);
  /** 0–1 — how strongly audio drives random duplicate blinking. */
  const [vjDupRandomBlinkSensitivity, setVjDupRandomBlinkSensitivity] =
    useState(0.65);
  /** VJ Extras: high-frequency–gated fullscreen difference invert bursts. */
  const [vjInvertStrobe, setVjInvertStrobe] = useState(false);
  /** 0–1 — how often invert strobe may fire (trigger odds + cooldown between bursts). */
  const [vjInvertStrobeAmount, setVjInvertStrobeAmount] = useState(0.5);
  /** VJ: black out YouTube backdrop on bass hits; clears on the next strong hit after ~1 s. */
  const [vjYoutubeBeatBlackout, setVjYoutubeBeatBlackout] = useState(false);
  /** 0–1 — lower spectral floor for bass “beats” (still FFT-driven). */
  const [vjYoutubeBeatBlackoutSensitivity, setVjYoutubeBeatBlackoutSensitivity] =
    useState(0);
  /** VJ: secondary layer — at most one automation mode (mutually exclusive in UI). */
  const [vjLayer2AutomationMode, setVjLayer2AutomationMode] =
    useState<VjLayer2AutomationMode>("off");
  /** Random burst only: ramp Layer 2 scale during each burst window, reset when it ends. */
  const [vjLayer2StrobeScale, setVjLayer2StrobeScale] = useState(false);
  /** Layer 2 VJ: intermittently flash Pixels random filter at full size/strength. */
  const [vjLayer2PixelGlitch, setVjLayer2PixelGlitch] = useState(false);
  /** VJ mode: squircle orbit radius multiplier (larger = lens travels closer to frame edges). */
  const [vjPathScale, setVjPathScale] = useState(1);
  const [vjPathSpeed, setVjPathSpeed] = useState(DEFAULT_VJ_PATH_SPEED);
  const [vjGlassGradeMode, setVjGlassGradeMode] = useState<
    "off" | "tint" | "duotone"
  >("off");
  const [vjGlassNeonAHex, setVjGlassNeonAHex] = useState("#ff00ee");
  const [vjGlassNeonBHex, setVjGlassNeonBHex] = useState("#1a0055");
  const [vjGlassGradeIntensity, setVjGlassGradeIntensity] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [featureHint, setFeatureHint] = useState<string | null>(null);
  /** JSON buffer for Share settings — literal paste (Cmd/Ctrl+V) into the textarea. */
  const [settingsPasteDraft, setSettingsPasteDraft] = useState("");
  const micAnalyzerRef = useRef<MicAnalyzer | null>(null);
  const micEnvelopeRef = useRef(0);
  const mouseLensTargetRef = useRef({ x: 0.5, y: 0.5 });
  const mouseFluidPosRef = useRef({ x: 0.5, y: 0.5 });
  const mouseFluidVelRef = useRef({ x: 0, y: 0 });
  const micLoopPrevTRef = useRef(performance.now());
  const vjDupSpeedShiftStateRef = useRef(createVjDupSpeedShiftState());
  const vjDupHorizRandomStateRef = useRef(createVjDupHorizRandomState());
  const vjInvertStrobeStateRef = useRef(createVjInvertStrobeState());
  const vjInvertStrobeOverlayRef = useRef<HTMLDivElement>(null);
  const vjInvertStrobeEnabledRef = useRef(false);
  vjInvertStrobeEnabledRef.current =
    micDrivingRefraction && vjMode && vjInvertStrobe;
  const vjYoutubeBeatBlackoutStateRef = useRef(createVjYoutubeBeatBlackoutState());
  const vjYoutubeBeatBlackoutOverlayRef = useRef<HTMLDivElement>(null);
  const vjYoutubeBeatBlackoutEnabledRef = useRef(false);
  vjYoutubeBeatBlackoutEnabledRef.current =
    micDrivingRefraction &&
    vjMode &&
    vjYoutubeBeatBlackout &&
    youtubeEmbedActive;
  const vjInvertStrobeAmountRef = useRef(0.5);
  vjInvertStrobeAmountRef.current = vjInvertStrobeAmount;
  const vjYoutubeBeatBlackoutSensitivityRef = useRef(0);
  vjYoutubeBeatBlackoutSensitivityRef.current = vjYoutubeBeatBlackoutSensitivity;
  const vjLayer2BlinkStateRef = useRef(createVjLayer2BlinkState());
  const vjLayer2ScaleAudioStateRef = useRef(createVjLayer2ScaleAudioState());
  const vjLayer2RandomBurstStateRef = useRef(createVjLayer2RandomBurstState());
  const vjLayer2PixelGlitchStateRef = useRef(createVjLayer2PixelGlitchState());
  const layer2VjOpacityMulRef = useRef(1);
  const layer2VjScaleMulRef = useRef(1);
  /** 1 when burst mode off; 0–1 strobe envelope when burst mode on. */
  const layer2VjBurstOpacityMulRef = useRef(1);

  const [layer2SourceUrl, setLayer2SourceUrl] = useState<string | null>(null);
  const [layer2FileName, setLayer2FileName] = useState<string | null>(null);
  const [layer2ImgDims, setLayer2ImgDims] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [layer2Scale, setLayer2Scale] = useState(0.55);
  const layer2ScaleRef = useRef(0.55);
  layer2ScaleRef.current = layer2Scale;
  const [layer2RasterScale, setLayer2RasterScale] = useState(0.55);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setLayer2RasterScale(layer2Scale);
    }, SVG_RASTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [layer2Scale]);
  const [layer2TintMode, setLayer2TintMode] =
    useState<SecondaryLayerTintMode>("original");
  const [layer2TintHex, setLayer2TintHex] = useState("#ffffff");
  const [layer2BlendMode, setLayer2BlendMode] =
    useState<SecondaryLayerBlendMode>("normal");
  const [layer2FollowDistort, setLayer2FollowDistort] = useState(true);
  const [layer2BaseOpacity, setLayer2BaseOpacity] = useState(1);
  const vjLayer2AutomationModeRef = useRef<VjLayer2AutomationMode>("off");
  vjLayer2AutomationModeRef.current = vjLayer2AutomationMode;
  const vjLayer2StrobeScaleRef = useRef(false);
  vjLayer2StrobeScaleRef.current = vjLayer2StrobeScale;
  const vjLayer2PixelGlitchRef = useRef(false);
  vjLayer2PixelGlitchRef.current = vjLayer2PixelGlitch;
  const layer2ReadyRef = useRef(false);
  layer2ReadyRef.current = Boolean(
    layer2SourceUrl && layer2ImgDims && imgDims,
  );
  const mouseLoopPrevTRef = useRef(performance.now());
  const zoomFxActiveRef = useRef(false);
  const pauseAnimationRef = useRef(pauseAnimation);
  pauseAnimationRef.current = pauseAnimation;
  /** True while the settings sidebar is scrolling (same GPU/CPU freeze intent as spacebar). */
  const settingsMenuScrollFreezeRef = useRef(false);
  const settingsSidebarRef = useRef<HTMLElement | null>(null);

  /** Freezes shader time + VJ dup scroll; wheel zoom, spacebar pause, or settings menu scroll. */
  const syncAnimationFrozen = useCallback(() => {
    rendererRef.current?.setAnimationTimeFrozen(
      zoomFxActiveRef.current ||
        pauseAnimationRef.current ||
        settingsMenuScrollFreezeRef.current,
    );
  }, []);

  const setZoomFxActive = useCallback(
    (active: boolean) => {
      zoomFxActiveRef.current = active;
      syncAnimationFrozen();
    },
    [syncAnimationFrozen],
  );

  useEffect(() => {
    syncAnimationFrozen();
  }, [pauseAnimation, syncAnimationFrozen]);

  useEffect(() => {
    const el = settingsSidebarRef.current;
    if (!el) return;

    let endTimer: ReturnType<typeof window.setTimeout> | null = null;
    const clearEndTimer = () => {
      if (endTimer !== null) {
        window.clearTimeout(endTimer);
        endTimer = null;
      }
    };

    const setMenuScrollFreeze = (frozen: boolean) => {
      if (settingsMenuScrollFreezeRef.current === frozen) return;
      settingsMenuScrollFreezeRef.current = frozen;
      syncAnimationFrozen();
    };

    const supportsScrollEnd = "onscrollend" in el;

    const onScroll = () => {
      setMenuScrollFreeze(true);
      if (!supportsScrollEnd) {
        clearEndTimer();
        endTimer = window.setTimeout(() => {
          endTimer = null;
          setMenuScrollFreeze(false);
        }, 400);
      }
    };

    const onScrollEnd = () => {
      clearEndTimer();
      setMenuScrollFreeze(false);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    if (supportsScrollEnd) {
      el.addEventListener("scrollend", onScrollEnd);
    }

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (supportsScrollEnd) {
        el.removeEventListener("scrollend", onScrollEnd);
      }
      clearEndTimer();
      settingsMenuScrollFreezeRef.current = false;
      syncAnimationFrozen();
    };
  }, [syncAnimationFrozen]);

  /** Match spacebar pause: freeze embed playback too (JS API; requires enablejsapi). */
  useEffect(() => {
    if (!youtubeVideoId) return;
    const iframe = youtubeIframeRef.current;
    if (!iframe) return;

    const apply = () =>
      postYoutubePlayback(iframe, pauseAnimation ? "pause" : "play");
    apply();
    const onLoad = () => apply();
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [pauseAnimation, youtubeVideoId, youtubeEmbedSrc]);

  useEffect(() => {
    if (!lensMouseInput) return;
    const p = blobCenterRef.current;
    mouseLensTargetRef.current = { ...p };
    mouseFluidPosRef.current = { ...p };
    mouseFluidVelRef.current = { x: 0, y: 0 };
  }, [lensMouseInput]);

  /**
   * Automate hue: CSS hue-rotate with slow drift + optional mic envelope.
   * When solid overlay opacity is high enough, animates that layer; otherwise
   * animates the WebGL canvas so hue works without any backdrop tint.
   */
  useEffect(() => {
    const run = solidOverlayVjHueShift && vjMode;
    const solidEl = solidOverlayRef.current;
    const canvasEl = canvasRef.current;

    const clearHue = (node: HTMLElement | null) => {
      if (!node) return;
      node.style.filter = "";
      node.style.removeProperty("will-change");
    };

    if (!run) {
      clearHue(solidEl);
      clearHue(canvasEl);
      return;
    }

    const useSolid =
      solidOverlayOpacity > 0.02 && solidEl !== null;
    const el = useSolid ? solidEl! : canvasEl;
    if (!el) {
      clearHue(solidEl);
      clearHue(canvasEl);
      return;
    }

    if (useSolid) clearHue(canvasEl);
    else clearHue(solidEl);

    let id = 0;
    let prevNow = performance.now();
    let huePhaseDeg = 0;
    const degPerSec = 7.5;
    const envDeg = 130;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - prevNow) / 1000);
      prevNow = now;
      if (
        zoomFxActiveRef.current ||
        pauseAnimationRef.current ||
        settingsMenuScrollFreezeRef.current
      ) {
        id = requestAnimationFrame(loop);
        return;
      }
      huePhaseDeg = (huePhaseDeg + dt * degPerSec) % 360;
      let deg = huePhaseDeg;
      if (solidOverlayHueAudio && micDrivingRefraction) {
        deg += micEnvelopeRef.current * micRefractBoost * envDeg;
      }
      deg = ((deg % 360) + 360) % 360;
      el.style.filter = `hue-rotate(${deg}deg)`;
      el.style.willChange = "filter";
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(id);
      clearHue(solidEl);
      clearHue(canvasEl);
    };
  }, [
    solidOverlayOpacity,
    solidOverlayVjHueShift,
    solidOverlayHueAudio,
    vjMode,
    micDrivingRefraction,
    micRefractBoost,
  ]);

  const showFeatureHint = useCallback((message: string) => {
    setFeatureHint(message);
  }, []);

  useEffect(() => {
    if (!featureHint) return;
    const id = window.setTimeout(() => setFeatureHint(null), 4200);
    return () => window.clearTimeout(id);
  }, [featureHint]);

  useEffect(() => {
    if (vjInvertStrobe) return;
    resetVjInvertStrobeState(vjInvertStrobeStateRef.current);
    const el = vjInvertStrobeOverlayRef.current;
    if (el) el.style.opacity = "0";
  }, [vjInvertStrobe]);

  useEffect(() => {
    if (vjYoutubeBeatBlackout) return;
    resetVjYoutubeBeatBlackoutState(vjYoutubeBeatBlackoutStateRef.current);
    const el = vjYoutubeBeatBlackoutOverlayRef.current;
    if (el) el.style.opacity = "0";
  }, [vjYoutubeBeatBlackout]);

  const latestSyncRef = useRef<RendererSyncSource | null>(null);

  const syncLayout = useCallback(() => {
    const canvas = canvasRef.current;
    const r = rendererRef.current;
    if (!canvas || !r || !imgDims) return;
    const base = computeImageRect(
      canvas.width,
      canvas.height,
      imgDims.w,
      imgDims.h,
      imageScale,
    );
    const rect = applyPanToRect(base, imagePan.x, imagePan.y);
    r.imageLayout = {
      rect,
      naturalWidth: imgDims.w,
      naturalHeight: imgDims.h,
    };
  }, [imgDims, imageScale, imagePan]);

  const syncSecondaryOverlay = useCallback(() => {
    const r = rendererRef.current;
    const canvas = canvasRef.current;
    if (!r || !canvas || !imgDims || !layer2SourceUrl || !layer2ImgDims) {
      rendererRef.current?.clearOverlay();
      return;
    }
    const layout = r.imageLayout;
    if (!layout) {
      r.clearOverlay();
      return;
    }
    const rect = layout.rect;
    const c = parseHexColor(layer2TintHex);
    r.overlayTintMode =
      layer2TintMode === "original" ? 0 : layer2TintMode === "multiply" ? 1 : 2;
    r.overlayTintRgb = [c[0], c[1], c[2]];
    r.overlayBlendMode = secondaryLayerBlendToShaderId(layer2BlendMode);
    r.overlayFollowDistortion = layer2FollowDistort ? 1 : 0;
    const op =
      layer2BaseOpacity *
      layer2VjOpacityMulRef.current *
      layer2VjBurstOpacityMulRef.current;
    r.overlayOpacity = Math.max(0, Math.min(1, op));
    r.syncOverlayLayout(
      canvas.width,
      canvas.height,
      rect,
      layer2ImgDims.w,
      layer2ImgDims.h,
      { scale: layer2Scale * layer2VjScaleMulRef.current },
    );
  }, [
    imgDims,
    layer2SourceUrl,
    layer2ImgDims,
    layer2TintHex,
    layer2TintMode,
    layer2BlendMode,
    layer2FollowDistort,
    layer2BaseOpacity,
    layer2Scale,
  ]);

  const syncSecondaryOverlayRef = useRef(syncSecondaryOverlay);
  syncSecondaryOverlayRef.current = syncSecondaryOverlay;

  /** Ref bundle for {@link applyMicDrivingRendererFrame}; ref objects are stable — empty deps intentional. */
  const micDrivingFrameRefs = useMemo(
    (): MicDrivingFrameRefs => ({
      vjDupSpeedShiftStateRef,
      vjDupHorizRandomStateRef,
      vjLayer2BlinkStateRef,
      vjLayer2ScaleAudioStateRef,
      vjLayer2RandomBurstStateRef,
      vjLayer2PixelGlitchStateRef,
      vjInvertStrobeStateRef,
      vjYoutubeBeatBlackoutStateRef,
      mouseLensTargetRef,
      mouseFluidPosRef,
      mouseFluidVelRef,
      blobCenterRef,
      layer2ReadyRef,
      vjLayer2AutomationModeRef,
      vjLayer2StrobeScaleRef,
      vjLayer2PixelGlitchRef,
      vjInvertStrobeEnabledRef,
      vjInvertStrobeAmountRef,
      vjYoutubeBeatBlackoutEnabledRef,
      vjYoutubeBeatBlackoutSensitivityRef,
      vjInvertStrobeOverlayRef,
      vjYoutubeBeatBlackoutOverlayRef,
      layer2VjOpacityMulRef,
      layer2VjScaleMulRef,
      layer2VjBurstOpacityMulRef,
      syncSecondaryOverlayRef,
    }),
    [],
  );

  useEffect(() => {
    if (vjLayer2AutomationMode === "randomBurst") return;
    resetVjLayer2RandomBurstState(vjLayer2RandomBurstStateRef.current);
    layer2VjBurstOpacityMulRef.current = 1;
    syncSecondaryOverlayRef.current();
  }, [vjLayer2AutomationMode]);

  useEffect(() => {
    if (vjLayer2PixelGlitch) return;
    resetVjLayer2PixelGlitchState(vjLayer2PixelGlitchStateRef.current);
  }, [vjLayer2PixelGlitch]);

  const runPngExport = useCallback(
    (scale: 1 | 2) => {
      const r = rendererRef.current;
      const sourceCanvas = canvasRef.current;
      if (!r || !sourceCanvas) return;
      const fallbackRenderExport = () => {
        const bg = parseHexColor(bgHex);
        const solidFilter = solidOverlayRef.current
          ? window.getComputedStyle(solidOverlayRef.current).filter ?? ""
          : "";
        const hasSolidOverlay = solidOverlayOpacity > 1e-5;
        const hasViewportHue =
          hueApplyScope === "viewport" &&
          Math.abs(((globalHueShift % 360) + 360) % 360) > 1e-4;
        const hasViewportFx =
          canvasBackdropBlend !== "normal" ||
          hasSolidOverlay ||
          hasViewportHue ||
          vjInvertStrobe;
        if (hasViewportFx) {
          const composite = composeViewportFrame({
            sourceCanvas,
            backgroundRgb: [bg[0], bg[1], bg[2]],
            canvasBlendMode: canvasBackdropBlend,
            viewportHueDeg:
              hueApplyScope === "viewport" ? normalizeHueDeg(globalHueShift) : 0,
            solidOverlay: {
              enabled: hasSolidOverlay,
              rgb: (() => {
                const c = parseHexColor(solidOverlayHex);
                return [c[0], c[1], c[2]] as [number, number, number];
              })(),
              opacity: solidOverlayOpacity,
              blendMode: solidOverlayBlend,
              hueRotateDeg: parseHueRotateDegrees(solidFilter),
            },
            invertStrobeOverlay: {
              enabled: vjInvertStrobe,
              opacity: Number(
                vjInvertStrobeOverlayRef.current
                  ? window.getComputedStyle(vjInvertStrobeOverlayRef.current).opacity
                  : "0",
              ),
            },
          });
          const out =
            scale === 1
              ? composite
              : (() => {
                  const c = document.createElement("canvas");
                  c.width = Math.max(1, composite.width * 2);
                  c.height = Math.max(1, composite.height * 2);
                  const cctx = c.getContext("2d");
                  if (!cctx) return composite;
                  cctx.imageSmoothingEnabled = false;
                  cctx.drawImage(composite, 0, 0, c.width, c.height);
                  return c;
                })();
          if (exportTransparent) {
            let target = removeSolidBackgroundForPng(out, [bg[0], bg[1], bg[2]]);
            if (imgDims && exportRegion === "image") {
              target = trimCanvasToAlphaBounds(target, 1, 8);
            }
            downloadCanvasAsPng(target, "refrct");
          } else {
            downloadCanvasAsPng(out, "refrct");
          }
          return;
        }
        r.exportPng(
          mergePngExportParams(DEFAULT_PNG_EXPORT_PARAMS, {
            scale,
            transparentBackground: exportTransparent,
            region: imgDims && exportRegion === "image" ? "image" : "full",
          }),
          "refrct",
          () => {
            syncLayout();
          },
        );
      };
      if (
        scale === 1 &&
        !exportTransparent &&
        exportRegion === "full" &&
        wrapRef.current
      ) {
        void captureExactViewportPng(wrapRef.current, "refrct").catch((e) => {
          console.error(e);
          setFeatureHint("Exact screenshot failed — using render export.");
          fallbackRenderExport();
        });
        return;
      }
      fallbackRenderExport();
    },
    [
      bgHex,
      canvasBackdropBlend,
      exportTransparent,
      exportRegion,
      globalHueShift,
      hueApplyScope,
      imgDims,
      solidOverlayBlend,
      solidOverlayHex,
      solidOverlayOpacity,
      syncLayout,
      vjInvertStrobe,
      setFeatureHint,
    ],
  );

  const captureScreenshot = useCallback(() => {
    runPngExport(2);
  }, [runPngExport]);

  const pickGifOutputFolder = useCallback(async () => {
    if (typeof window.showDirectoryPicker !== "function") {
      setFeatureHint(
        "Folder pick needs Chrome or Edge. GIFs download to your default folder instead.",
      );
      return;
    }
    if (!window.isSecureContext) {
      setFeatureHint(
        "Folder pick needs HTTPS or localhost (secure page). GIFs download instead.",
      );
      return;
    }
    try {
      const h = await window.showDirectoryPicker();
      gifDirHandleRef.current = h;
      setGifOutputFolderLabel(h.name);
      setFeatureHint("Output folder set — GIFs will save there.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setFeatureHint("Could not use that folder.");
    }
  }, []);

  const clearGifOutputFolder = useCallback(() => {
    gifDirHandleRef.current = null;
    setGifOutputFolderLabel(null);
  }, []);

  const cancelGifRecording = useCallback(() => {
    gifAbortRef.current?.abort();
  }, []);

  const startGifRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || gifExportBusyRef.current) return;
    gifAbortRef.current?.abort();
    const ac = new AbortController();
    gifAbortRef.current = ac;
    gifExportBusyRef.current = true;
    setGifRecording(true);
    setGifRecordProgress(null);
    try {
      const blob = await recordAnimatedGif({
        canvas,
        getFrameCanvas: () => {
          const needsDomComposite =
            canvasBackdropBlend !== "normal" ||
            (solidOverlayOpacity > 0 && solidOverlayBlend !== "normal");
          if (!needsDomComposite) {
            return canvas;
          }
          const bg = parseHexColor(bgHex);
          const solidFilter = solidOverlayRef.current
            ? window.getComputedStyle(solidOverlayRef.current).filter ?? ""
            : "";
          return composeViewportFrame({
            sourceCanvas: canvas,
            backgroundRgb: [bg[0], bg[1], bg[2]],
            canvasBlendMode: canvasBackdropBlend,
            viewportHueDeg:
              hueApplyScope === "viewport" ? normalizeHueDeg(globalHueShift) : 0,
            solidOverlay: {
              enabled: solidOverlayOpacity > 1e-5,
              rgb: (() => {
                const c = parseHexColor(solidOverlayHex);
                return [c[0], c[1], c[2]] as [number, number, number];
              })(),
              opacity: solidOverlayOpacity,
              blendMode: solidOverlayBlend,
              hueRotateDeg: parseHueRotateDegrees(solidFilter),
            },
            invertStrobeOverlay: {
              enabled: vjInvertStrobe,
              opacity: Number(
                vjInvertStrobeOverlayRef.current
                  ? window.getComputedStyle(vjInvertStrobeOverlayRef.current).opacity
                  : "0",
              ),
            },
          });
        },
        fps: gifFps,
        durationSec: gifDurationSec,
        maxWidth: gifMaxWidthEnabled ? gifMaxWidth : null,
        maxColors: gifMaxColors,
        pixelArt: gifPixelArtResize,
        infiniteLoop: gifInfiniteLoop,
        signal: ac.signal,
        onProgress: (current, total) =>
          setGifRecordProgress({ current, total }),
      });
      if (ac.signal.aborted) return;
      const { filename, mode } = await saveGifBlob(
        blob,
        gifDirHandleRef.current,
        "refrct",
      );
      setFeatureHint(
        mode === "directory"
          ? `Saved ${filename} to the selected folder.`
          : `Downloaded ${filename}.`,
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setFeatureHint("GIF recording cancelled.");
      } else {
        console.error(e);
        setFeatureHint("GIF export failed — see console.");
      }
    } finally {
      gifExportBusyRef.current = false;
      setGifRecording(false);
      setGifRecordProgress(null);
      gifAbortRef.current = null;
    }
  }, [
    gifFps,
    gifDurationSec,
    gifMaxWidthEnabled,
    gifMaxWidth,
    gifMaxColors,
    gifPixelArtResize,
    gifInfiniteLoop,
    bgHex,
    canvasBackdropBlend,
    globalHueShift,
    hueApplyScope,
    solidOverlayHex,
    solidOverlayOpacity,
    solidOverlayBlend,
    vjInvertStrobe,
  ]);

  const focusImage = useCallback(() => {
    if (!imgDims) return;
    const t = Focus();
    const hasLayer2Loaded = Boolean(layer2SourceUrl && layer2ImgDims);
    const focusScale = hasLayer2Loaded
      ? Math.min(20, Math.max(0.25, t.scale / Math.max(layer2Scale, 1e-4)))
      : t.scale;
    setImagePan(t.pan);
    setImageScale(focusScale);
  }, [imgDims, layer2SourceUrl, layer2ImgDims, layer2Scale]);

  const onYoutubeApply = useCallback(() => {
    const id = parseYoutubeVideoId(youtubeUrlDraft);
    if (!id) {
      setYoutubeError("Could not read a video ID from that URL.");
      return;
    }
    setYoutubeError(null);
    setYoutubeVideoId(id);
  }, [youtubeUrlDraft]);

  const onYoutubeClear = useCallback(() => {
    setYoutubeVideoId(null);
    setYoutubeError(null);
  }, []);

  useEffect(() => {
    if (!fpsHudVisible) return;
    let raf = 0;
    let frames = 0;
    let lastT = performance.now();
    const loop = (t: number) => {
      frames++;
      const elapsed = t - lastT;
      if (elapsed >= 500) {
        setFpsHudValue(Math.round((frames / elapsed) * 1000));
        frames = 0;
        lastT = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fpsHudVisible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;

      // Space: pause — must run before the "select blocks all shortcuts" guard, otherwise
      // focus on a <select> (e.g. after a file download) prevents unpause.
      if (e.key === " ") {
        if (el?.closest("textarea, [contenteditable='true']")) return;
        const textInput = el?.closest("input");
        if (textInput instanceof HTMLInputElement) {
          const ty = (textInput.type || "text").toLowerCase();
          if (
            ["text", "search", "email", "password", "url", "tel", "number"].includes(
              ty,
            )
          ) {
            return;
          }
        }
        if (el?.closest("button, a[href]")) return;
        e.preventDefault();
        setPauseAnimation((v) => !v);
        return;
      }

      if (el?.closest("input, textarea, select, [contenteditable='true']"))
        return;

      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setUiVisible((v) => !v);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        focusImage();
        return;
      }
      if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        setFpsHudVisible((v) => !v);
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        captureScreenshot();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "1") {
        e.preventDefault();
        setShapeMode(0);
        return;
      }
      if (e.key === "2") {
        e.preventDefault();
        setShapeMode(1);
        return;
      }
      if (e.key === "3") {
        e.preventDefault();
        setShapeMode(2);
        return;
      }
      if (e.key === "4") {
        e.preventDefault();
        setShapeMode(3);
        return;
      }
      if (e.key === "5") {
        e.preventDefault();
        setShapeMode(4);
        return;
      }
      if (e.key === "6") {
        e.preventDefault();
        setShapeMode(5);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureScreenshot, focusImage]);

  useEffect(() => {
    if (!imgDims) {
      setExportRegion("full");
    }
  }, [imgDims]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const zoomResumeTimerRef = { current: 0 as number | null };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = rendererRef.current;
      if (r) {
        r.blob.speed = 0;
      }
      setZoomFxActive(true);
      if (zoomResumeTimerRef.current !== null) {
        window.clearTimeout(zoomResumeTimerRef.current);
      }
      zoomResumeTimerRef.current = window.setTimeout(() => {
        zoomResumeTimerRef.current = null;
        setZoomFxActive(false);
        const rr = rendererRef.current;
        const src = latestSyncRef.current;
        if (!rr || !src) return;
        applyRendererState(
          rr,
          buildRendererSyncParams({
            ...src,
            blobCenterX: blobCenterRef.current.x,
            blobCenterY: blobCenterRef.current.y,
          }),
        );
      }, ZOOM_ANIM_RESUME_MS);

      const zoomIntensity = 0.00115;
      const factor = Math.exp(-e.deltaY * zoomIntensity);
      setImageScale((s) => Math.min(20, Math.max(0.25, s * factor)));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      if (zoomResumeTimerRef.current !== null) {
        window.clearTimeout(zoomResumeTimerRef.current);
      }
      setZoomFxActive(false);
      const rr = rendererRef.current;
      const src = latestSyncRef.current;
      if (rr && src) {
        applyRendererState(
          rr,
          buildRendererSyncParams({
            ...src,
            blobCenterX: blobCenterRef.current.x,
            blobCenterY: blobCenterRef.current.y,
          }),
        );
      }
      el.removeEventListener("wheel", onWheel);
    };
  }, [setZoomFxActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let renderer: RfrctRenderer;
    try {
      renderer = new RfrctRenderer(canvas);
    } catch (e) {
      setWebglError(
        e instanceof Error ? e.message : "WebGL2 is required for this demo.",
      );
      return;
    }
    setWebglError(null);
    rendererRef.current = renderer;
    syncAnimationFrozen();
    renderer.blob.centerX = blobCenterRef.current.x;
    renderer.blob.centerY = blobCenterRef.current.y;
    renderer.startLoop();

    const ro = new ResizeObserver(() => {
      const b = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(b.width));
      const h = Math.max(1, Math.floor(b.height));
      setViewportPx({ w, h });
      renderer.resize(w, h);
    });
    ro.observe(wrap);

    const b = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.floor(b.width));
    const h = Math.max(1, Math.floor(b.height));
    setViewportPx({ w, h });
    renderer.resize(w, h);

    return () => {
      ro.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [syncAnimationFrozen]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    if (micDrivingRefraction) {
      return;
    }
    applyRendererState(
      r,
      buildRendererSyncParams({
        bgHex,
        blobSize,
        pauseAnimation,
        blobSpeed,
        waveFreq,
        waveAmp,
        refract,
        edgeSoft,
        frostBlur,
        blurQuality,
        globalHueShift,
        hueApplyScope,
        grainStrength,
        chroma,
        shapeMode,
        filterMode,
        filterStrength,
        filterScale,
        filterMotionSpeed,
        blobCenterX: blobCenterRef.current.x,
        blobCenterY: blobCenterRef.current.y,
        bloomStrength,
        bloomRadius,
        bloomThreshold,
        hasLensTexture: Boolean(imgDims),
        svgSourceUrl,
        svgTintMode,
        svgTintHex,
        svgGradientBlend,
        svgGradientHex2,
        svgGradientHex3,
        svgGradientThreeStops,
        svgGradientAngleDeg,
        svgGradientScale,
        svgGradientPosition,
        micDrivingRefraction,
        micRefractBoost,
        micEnvelope: 0,
        vjMode,
        vjDupVertical,
        vjDupGap,
        vjDupHorizStep,
        vjDupScrollSpeed,
        vjDupRandomBlink,
        vjDupRandomBlinkSpeed,
        vjDupRandomBlinkSensitivity,
        vjPathScale,
        vjPathSpeed,
        youtubeEmbedActive,
        transparentSceneDomUnderlay:
          Boolean(backdropImageUrl) && !youtubeEmbedActive,
        vjGlassGradeMode,
        vjGlassNeonAHex,
        vjGlassNeonBHex,
        vjGlassGradeIntensity,
        detailDistortionEnabled,
        detailDistortionStrength,
        detailDistortionScale,
        detailDirtStrength,
        detailDirtHex,
        lensMouseInput,
        fluidDensity,
      }),
    );
    syncSecondaryOverlay();
  }, [
    bgHex,
    blobSize,
    pauseAnimation,
    blobSpeed,
    waveFreq,
    waveAmp,
    refract,
    edgeSoft,
    frostBlur,
    blurQuality,
    globalHueShift,
    hueApplyScope,
    grainStrength,
    chroma,
    shapeMode,
    filterMode,
    filterStrength,
    filterScale,
    filterMotionSpeed,
    bloomStrength,
    bloomRadius,
    bloomThreshold,
    svgSourceUrl,
    imgDims,
    svgTintMode,
    svgTintHex,
    svgGradientBlend,
    svgGradientHex2,
    svgGradientHex3,
    svgGradientThreeStops,
    svgGradientAngleDeg,
    svgGradientScale,
    svgGradientPosition,
    backdropImageUrl,
    micDrivingRefraction,
    micRefractBoost,
    vjMode,
    vjDupVertical,
    vjDupGap,
    vjDupHorizStep,
    vjDupScrollSpeed,
    vjDupSpeedShift,
    vjDupRandomHoriz,
    vjDupRandomBlink,
    vjDupRandomBlinkSpeed,
    vjDupRandomBlinkSensitivity,
    vjPathScale,
    vjPathSpeed,
    youtubeEmbedActive,
    backdropImageUrl,
    vjGlassGradeMode,
    vjGlassNeonAHex,
    vjGlassNeonBHex,
    vjGlassGradeIntensity,
    detailDistortionEnabled,
    detailDistortionStrength,
    detailDistortionScale,
    detailDirtStrength,
    detailDirtHex,
    lensMouseInput,
    fluidDensity,
    syncSecondaryOverlay,
  ]);

  useEffect(() => {
    if (!micDrivingRefraction) {
      micEnvelopeRef.current = 0;
      resetVjDupSpeedShiftState(vjDupSpeedShiftStateRef.current);
      resetVjDupHorizRandomState(vjDupHorizRandomStateRef.current);
      resetVjInvertStrobeState(vjInvertStrobeStateRef.current);
      resetVjYoutubeBeatBlackoutState(vjYoutubeBeatBlackoutStateRef.current);
      resetVjLayer2BlinkState(vjLayer2BlinkStateRef.current);
      resetVjLayer2ScaleAudioState(vjLayer2ScaleAudioStateRef.current);
      resetVjLayer2RandomBurstState(vjLayer2RandomBurstStateRef.current);
      resetVjLayer2PixelGlitchState(vjLayer2PixelGlitchStateRef.current);
      layer2VjOpacityMulRef.current = 1;
      layer2VjScaleMulRef.current = 1;
      layer2VjBurstOpacityMulRef.current = 1;
      const invEl = vjInvertStrobeOverlayRef.current;
      if (invEl) invEl.style.opacity = "0";
      const ytBlackEl = vjYoutubeBeatBlackoutOverlayRef.current;
      if (ytBlackEl) ytBlackEl.style.opacity = "0";
      return;
    }
    micLoopPrevTRef.current = performance.now();
    let id = 0;
    const loop = () => {
      const a = micAnalyzerRef.current;
      const tick = a ? a.tick() : INACTIVE_MIC_TICK;
      micEnvelopeRef.current = tick.envelope;
      const r = rendererRef.current;
      const raw = latestSyncRef.current;
      if (r && raw) {
        if (
          pauseAnimationRef.current ||
          zoomFxActiveRef.current ||
          settingsMenuScrollFreezeRef.current
        ) {
          micLoopPrevTRef.current = performance.now();
          id = requestAnimationFrame(loop);
          return;
        }
        const now = performance.now();
        const dt = Math.min(0.05, (now - micLoopPrevTRef.current) / 1000);
        micLoopPrevTRef.current = now;
        const timeSec = now * 0.001;

        applyMicDrivingRendererFrame(
          r,
          raw,
          tick,
          now,
          dt,
          timeSec,
          micRefractBoost,
          vjMode,
          micDrivingRefraction,
          micDrivingFrameRefs,
        );
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [
    micDrivingRefraction,
    micRefractBoost,
    vjMode,
    lensMouseInput,
    fluidDensity,
    micDrivingFrameRefs,
  ]);

  useEffect(() => {
    if (!lensMouseInput || micDrivingRefraction) {
      return;
    }
    let id = 0;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - mouseLoopPrevTRef.current) / 1000);
      mouseLoopPrevTRef.current = now;
      const timeSec = now * 0.001;
      const freezeMotion =
        zoomFxActiveRef.current ||
        pauseAnimationRef.current ||
        settingsMenuScrollFreezeRef.current;
      const r = rendererRef.current;
      if (r) {
        const target = mouseLensTargetRef.current;
        const pos = mouseFluidPosRef.current;
        const vel = mouseFluidVelRef.current;
        const step = freezeMotion
          ? { x: pos.x, y: pos.y, vx: 0, vy: 0 }
          : stepLensMouseFluid(
              dt,
              target,
              pos,
              vel,
              fluidDensity,
              timeSec,
            );
        mouseFluidPosRef.current = { x: step.x, y: step.y };
        mouseFluidVelRef.current = { x: step.vx, y: step.vy };
        blobCenterRef.current = { x: step.x, y: step.y };
        r.blob.centerX = step.x;
        r.blob.centerY = step.y;
      }
      id = requestAnimationFrame(loop);
    };
    mouseLoopPrevTRef.current = performance.now();
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [lensMouseInput, micDrivingRefraction, fluidDensity]);

  useEffect(() => {
    return () => {
      micAnalyzerRef.current?.stop();
      micAnalyzerRef.current = null;
    };
  }, []);

  useEffect(() => {
    syncLayout();
    syncSecondaryOverlay();
  }, [syncLayout, syncSecondaryOverlay, viewportPx]);

  useEffect(() => {
    rendererRef.current?.reuploadTextureIfNeeded();
  }, [viewportPx]);

  useEffect(() => {
    if (!svgSourceUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const r = rendererRef.current;
      const canvas = canvasRef.current;
      if (!r || !canvas) return;
      const bw = Math.max(1, canvas.width);
      const bh = Math.max(1, canvas.height);
      const raster = rasterizeSvgForRfrct(
        img,
        bw,
        bh,
        imageScaleRef.current,
      );
      const w = raster.width;
      const h = raster.height;
      setImgDims({ w, h });
      const base = computeImageRect(
        bw,
        bh,
        w,
        h,
        imageScaleRef.current,
      );
      const rect = applyPanToRect(
        base,
        imagePanRef.current.x,
        imagePanRef.current.y,
      );
      r.setImageFromSource(raster, {
        rect,
        naturalWidth: w,
        naturalHeight: h,
      });
    };
    img.onerror = () => {};
    img.src = svgSourceUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [svgSourceUrl, viewportPx, svgRasterScale]);

  useEffect(() => {
    return () => {
      revokeSvgObjectUrlIfBlob(svgSourceUrl);
    };
  }, [svgSourceUrl]);

  useEffect(() => {
    if (!layer2SourceUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const r = rendererRef.current;
      const canvas = canvasRef.current;
      if (!r || !canvas) return;
      const bw = Math.max(1, canvas.width);
      const bh = Math.max(1, canvas.height);
      const raster = rasterizeSvgForRfrct(
        img,
        bw,
        bh,
        layer2ScaleRef.current,
      );
      setLayer2ImgDims({ w: raster.width, h: raster.height });
      r.setOverlayFromSource(raster);
    };
    img.onerror = () => {};
    img.src = layer2SourceUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [layer2SourceUrl, viewportPx, layer2RasterScale]);

  useEffect(() => {
    return () => {
      revokeSvgObjectUrlIfBlob(layer2SourceUrl);
    };
  }, [layer2SourceUrl]);

  useEffect(() => {
    return () => {
      revokeSvgObjectUrlIfBlob(backdropImageUrl);
    };
  }, [backdropImageUrl]);

  const onBackdropImageFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBackdropImageFileName(file.name);
      const url = URL.createObjectURL(file);
      setBackdropImageUrl((prev) => {
        revokeSvgObjectUrlIfBlob(prev);
        return url;
      });
      e.target.value = "";
    },
    [],
  );

  const removeBackdropImage = useCallback(() => {
    setBackdropImageUrl((prev) => {
      revokeSvgObjectUrlIfBlob(prev);
      return null;
    });
    setBackdropImageFileName(null);
  }, []);

  const onLayer2File = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLayer2FileName(file.name);
    const url = URL.createObjectURL(file);
    setLayer2SourceUrl((prev) => {
      revokeSvgObjectUrlIfBlob(prev);
      return url;
    });
    e.target.value = "";
  }, []);

  const removeLayer2 = useCallback(() => {
    setLayer2SourceUrl(null);
    setLayer2FileName(null);
    setLayer2ImgDims(null);
    rendererRef.current?.clearOverlay();
  }, []);

  const removeLayer1 = useCallback(() => {
    setSvgSourceUrl((prev) => {
      revokeSvgObjectUrlIfBlob(prev);
      return null;
    });
    setLayer1FileName(null);
    setImgDims(null);
    rendererRef.current?.clearImage();
    setImagePan({ x: 0, y: 0 });
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLayer1FileName(file.name);
    const url = URL.createObjectURL(file);

    if (isSvgFile(file)) {
      setImagePan({ x: 0, y: 0 });
      setSvgSourceUrl((prev) => {
        revokeSvgObjectUrlIfBlob(prev);
        return url;
      });
      e.target.value = "";
      return;
    }

    setSvgTintMode("original");
    setSvgSourceUrl((prev) => {
      revokeSvgObjectUrlIfBlob(prev);
      return null;
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const r = rendererRef.current;
      const canvas = canvasRef.current;
      if (!r || !canvas) {
        URL.revokeObjectURL(url);
        return;
      }
      setImagePan({ x: 0, y: 0 });
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      const base = computeImageRect(
        canvas.width,
        canvas.height,
        img.naturalWidth,
        img.naturalHeight,
        imageScaleRef.current,
      );
      const rect = applyPanToRect(base, 0, 0);
      r.setImageFromSource(img, {
        rect,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    e.target.value = "";
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      dragModeRef.current = "pan";
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setPointerDrag("pan");
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (e.button === 2) {
      if (lensMouseInput) {
        e.preventDefault();
        return;
      }
      dragModeRef.current = "fx";
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setPointerDrag("fx");
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragModeRef.current = "none";
    setPointerDrag(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && lensMouseInput) {
      const b = canvas.getBoundingClientRect();
      const nx = (e.clientX - b.left) / b.width;
      const ny = 1 - (e.clientY - b.top) / b.height;
      mouseLensTargetRef.current = {
        x: Math.min(1, Math.max(0, nx)),
        y: Math.min(1, Math.max(0, ny)),
      };
    }

    const mode = dragModeRef.current;
    if (mode === "none") return;
    const r = rendererRef.current;
    if (!canvas || !r) return;
    const bounds = canvas.getBoundingClientRect();
    const cw = bounds.width;
    const ch = bounds.height;

    if (mode === "pan") {
      const dx = (e.clientX - lastPointerRef.current.x) / cw;
      const dy = -(e.clientY - lastPointerRef.current.y) / ch;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setImagePan((p) => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }

    if (mode === "fx") {
      if (lensMouseInput) return;
      // Delta drag (same basis as pan) so a new right-drag doesn’t snap the blob to the
      // cursor on the first move — only motion while held updates position.
      const dx = (e.clientX - lastPointerRef.current.x) / cw;
      const dy = -(e.clientY - lastPointerRef.current.y) / ch;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      const nx = Math.min(1, Math.max(0, blobCenterRef.current.x + dx));
      const ny = Math.min(1, Math.max(0, blobCenterRef.current.y + dy));
      blobCenterRef.current = { x: nx, y: ny };
      r.blob.centerX = nx;
      r.blob.centerY = ny;
    }
  };

  const onCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  const toggleMicRefraction = useCallback(async () => {
    if (micDrivingRefraction) {
      micAnalyzerRef.current?.stop();
      micAnalyzerRef.current = null;
      micEnvelopeRef.current = 0;
      setVjMode(false);
      setVjPathScale(1);
      setVjPathSpeed(DEFAULT_VJ_PATH_SPEED);
      setMicDrivingRefraction(false);
      setMicError(null);
      return;
    }
    const m = new MicAnalyzer();
    setMicError(null);
    try {
      await m.start(audioInputMode);
      micAnalyzerRef.current = m;
      setMicDrivingRefraction(true);
    } catch (e) {
      m.stop();
      setMicError(audioCaptureErrorMessage(audioInputMode, e));
      setMicDrivingRefraction(false);
    }
  }, [micDrivingRefraction, audioInputMode]);

  const settingsSnapshotPayload = useMemo(
    (): RfrctEditorSettingsSnapshotCopyPayload => ({
      bgHex,
      imageScale,
      imagePan,
      svgTintMode,
      svgTintHex,
      svgGradientBlend,
      svgGradientHex2,
      svgGradientHex3,
      svgGradientThreeStops,
      svgGradientAngleDeg,
      svgGradientScale,
      svgGradientPosition,
      blobSize,
      pauseAnimation,
      blobSpeed,
      waveFreq,
      waveAmp,
      refract,
      edgeSoft,
      frostBlur,
      blurQuality,
      globalHueShift,
      hueApplyScope,
      grainStrength,
      chroma,
      bloomStrength,
      bloomRadius,
      bloomThreshold,
      shapeMode,
      filterMode,
      filterStrength,
      filterScale,
      filterMotionSpeed,
      detailDistortionEnabled,
      detailDistortionStrength,
      detailDistortionScale,
      detailDirtStrength,
      detailDirtHex,
      lensMouseInput,
      fluidDensity,
      exportTransparent,
      exportRegion,
      gifFps,
      gifMaxWidthEnabled,
      gifMaxWidth,
      gifMaxColors,
      gifDurationSec,
      gifPixelArtResize,
      gifInfiniteLoop,
      youtubeVideoId,
      youtubeUrlDraft,
      canvasBackdropBlend,
      solidOverlayHex,
      solidOverlayOpacity,
      solidOverlayBlend,
      solidOverlayVjHueShift,
      solidOverlayHueAudio,
      audioInputMode,
      micRefractBoost,
      vjMode,
      vjDupVertical,
      vjDupGap,
      vjDupHorizStep,
      vjDupScrollSpeed,
      vjDupSpeedShift,
      vjDupRandomHoriz,
      vjDupRandomBlink,
      vjDupRandomBlinkSpeed,
      vjDupRandomBlinkSensitivity,
      vjInvertStrobe,
      vjInvertStrobeAmount,
      vjYoutubeBeatBlackout,
      vjYoutubeBeatBlackoutSensitivity,
      vjPathScale,
      vjPathSpeed,
      vjGlassGradeMode,
      vjGlassNeonAHex,
      vjGlassNeonBHex,
      vjGlassGradeIntensity,
      layer2Scale,
      layer2TintMode,
      layer2TintHex,
      layer2BlendMode,
      layer2FollowDistort,
      layer2BaseOpacity,
      ...vjLayer2ModeToLegacyBools(vjLayer2AutomationMode),
      vjLayer2StrobeScale,
      vjLayer2PixelGlitch,
    }),
    [
      bgHex,
      backdropImageUrl,
      backdropImageFileName,
      onBackdropImageFile,
      removeBackdropImage,
      imageScale,
      imagePan,
      svgTintMode,
      svgTintHex,
      svgGradientBlend,
      svgGradientHex2,
      svgGradientHex3,
      svgGradientThreeStops,
      svgGradientAngleDeg,
      svgGradientScale,
      svgGradientPosition,
      blobSize,
      pauseAnimation,
      blobSpeed,
      waveFreq,
      waveAmp,
      refract,
      edgeSoft,
      frostBlur,
      blurQuality,
      globalHueShift,
      hueApplyScope,
      grainStrength,
      chroma,
      bloomStrength,
      bloomRadius,
      bloomThreshold,
      shapeMode,
      filterMode,
      filterStrength,
      filterScale,
      filterMotionSpeed,
      detailDistortionEnabled,
      detailDistortionStrength,
      detailDistortionScale,
      detailDirtStrength,
      detailDirtHex,
      lensMouseInput,
      fluidDensity,
      exportTransparent,
      exportRegion,
      gifFps,
      gifMaxWidthEnabled,
      gifMaxWidth,
      gifMaxColors,
      gifDurationSec,
      gifPixelArtResize,
      gifInfiniteLoop,
      youtubeVideoId,
      youtubeUrlDraft,
      canvasBackdropBlend,
      solidOverlayHex,
      solidOverlayOpacity,
      solidOverlayBlend,
      solidOverlayVjHueShift,
      solidOverlayHueAudio,
      audioInputMode,
      micRefractBoost,
      vjMode,
      vjDupVertical,
      vjDupGap,
      vjDupHorizStep,
      vjDupScrollSpeed,
      vjDupSpeedShift,
      vjDupRandomHoriz,
      vjDupRandomBlink,
      vjDupRandomBlinkSpeed,
      vjDupRandomBlinkSensitivity,
      vjInvertStrobe,
      vjInvertStrobeAmount,
      vjYoutubeBeatBlackout,
      vjYoutubeBeatBlackoutSensitivity,
      vjPathScale,
      vjPathSpeed,
      vjGlassGradeMode,
      vjGlassNeonAHex,
      vjGlassNeonBHex,
      vjGlassGradeIntensity,
      layer2Scale,
      layer2TintMode,
      layer2TintHex,
      layer2BlendMode,
      layer2FollowDistort,
      layer2BaseOpacity,
      vjLayer2AutomationMode,
      vjLayer2StrobeScale,
      vjLayer2PixelGlitch,
    ],
  );

  const copySettingsToClipboard = useCallback(async () => {
    const snap = createSettingsSnapshot({
      ...settingsSnapshotPayload,
      blobCenter: {
        x: blobCenterRef.current.x,
        y: blobCenterRef.current.y,
      },
    });
    try {
      await navigator.clipboard.writeText(serializeSettingsSnapshot(snap));
      setFeatureHint("Settings copied to clipboard.");
    } catch {
      setFeatureHint("Copy failed — clipboard blocked or unavailable.");
    }
  }, [settingsSnapshotPayload]);

  const applySettingsFromSnapshot = useCallback(
    (d: RfrctEditorSettingsSnapshotV1, mode: "full" | "designTemplate") => {
      const full = mode === "full";

      if (full) {
        micAnalyzerRef.current?.stop();
        micAnalyzerRef.current = null;
        micEnvelopeRef.current = 0;
        setMicDrivingRefraction(false);
        setMicError(null);

        blobCenterRef.current = { ...d.blobCenter };
        mouseLensTargetRef.current = { ...d.blobCenter };
        mouseFluidPosRef.current = { ...d.blobCenter };
        mouseFluidVelRef.current = { x: 0, y: 0 };

        setImageScale(d.imageScale);
        setImagePan(d.imagePan);
      }

      setBgHex(d.bgHex);
      setSvgTintMode(d.svgTintMode);
      setSvgTintHex(d.svgTintHex);
      setSvgGradientBlend(d.svgGradientBlend);
      setSvgGradientHex2(d.svgGradientHex2);
      setSvgGradientHex3(d.svgGradientHex3);
      setSvgGradientThreeStops(d.svgGradientThreeStops);
      setSvgGradientAngleDeg(d.svgGradientAngleDeg);
      setSvgGradientScale(d.svgGradientScale);
      setSvgGradientPosition(d.svgGradientPosition);
      setBlobSize(d.blobSize);
      setPauseAnimation(d.pauseAnimation);
      setBlobSpeed(d.blobSpeed);
      setWaveFreq(d.waveFreq);
      setWaveAmp(d.waveAmp);
      setRefract(d.refract);
      setEdgeSoft(d.edgeSoft);
      setFrostBlur(d.frostBlur);
      setBlurQuality(Math.round(Math.min(5, Math.max(1, d.blurQuality))));
      setGlobalHueShift(d.globalHueShift);
      setHueApplyScope(d.hueApplyScope);
      setGrainStrength(d.grainStrength);
      setChroma(d.chroma);
      setBloomStrength(d.bloomStrength);
      setBloomRadius(d.bloomRadius);
      setBloomThreshold(d.bloomThreshold);
      setShapeMode(d.shapeMode);
      setFilterMode(d.filterMode);
      setFilterStrength(d.filterStrength);
      setFilterScale(d.filterScale);
      setFilterMotionSpeed(d.filterMotionSpeed);
      setDetailDistortionStrength(d.detailDistortionStrength);
      setDetailDistortionScale(d.detailDistortionScale);
      setDetailDirtStrength(d.detailDirtStrength);
      setDetailDirtHex(d.detailDirtHex);
      setLensMouseInput(d.lensMouseInput);
      setFluidDensity(d.fluidDensity);
      if (full) {
        setExportTransparent(d.exportTransparent);
        setExportRegion(d.exportRegion);
        setGifFps(d.gifFps);
        setGifMaxWidthEnabled(d.gifMaxWidthEnabled);
        setGifMaxWidth(d.gifMaxWidth);
        setGifMaxColors(d.gifMaxColors);
        setGifDurationSec(d.gifDurationSec);
        setGifPixelArtResize(d.gifPixelArtResize);
        setGifInfiniteLoop(d.gifInfiniteLoop);
        setYoutubeVideoId(d.youtubeVideoId);
        setYoutubeUrlDraft(d.youtubeUrlDraft);
        setYoutubeError(null);
      }
      setCanvasBackdropBlend(d.canvasBackdropBlend);
      setSolidOverlayHex(d.solidOverlayHex);
      setSolidOverlayOpacity(d.solidOverlayOpacity);
      setSolidOverlayBlend(d.solidOverlayBlend);
      setSolidOverlayVjHueShift(d.solidOverlayVjHueShift);
      setSolidOverlayHueAudio(d.solidOverlayHueAudio);
      setAudioInputMode(d.audioInputMode);
      setMicRefractBoost(d.micRefractBoost);
      setVjMode(d.vjMode);
      setVjDupVertical(d.vjDupVertical);
      setVjDupGap(d.vjDupGap);
      setVjDupHorizStep(d.vjDupHorizStep);
      setVjDupScrollSpeed(d.vjDupScrollSpeed);
      setVjDupSpeedShift(d.vjDupSpeedShift);
      resetVjDupSpeedShiftState(vjDupSpeedShiftStateRef.current);
      setVjDupRandomHoriz(d.vjDupRandomHoriz);
      setVjDupRandomBlink(d.vjDupRandomBlink);
      setVjDupRandomBlinkSpeed(d.vjDupRandomBlinkSpeed);
      setVjDupRandomBlinkSensitivity(d.vjDupRandomBlinkSensitivity);
      resetVjDupHorizRandomState(vjDupHorizRandomStateRef.current);
      setVjInvertStrobe(d.vjInvertStrobe);
      setVjInvertStrobeAmount(d.vjInvertStrobeAmount);
      resetVjInvertStrobeState(vjInvertStrobeStateRef.current);
      setVjYoutubeBeatBlackout(d.vjYoutubeBeatBlackout);
      setVjYoutubeBeatBlackoutSensitivity(d.vjYoutubeBeatBlackoutSensitivity);
      resetVjYoutubeBeatBlackoutState(vjYoutubeBeatBlackoutStateRef.current);
      setVjPathScale(d.vjPathScale);
      setVjPathSpeed(d.vjPathSpeed);
      setVjGlassGradeMode(d.vjGlassGradeMode);
      setVjGlassNeonAHex(d.vjGlassNeonAHex);
      setVjGlassNeonBHex(d.vjGlassNeonBHex);
      setVjGlassGradeIntensity(d.vjGlassGradeIntensity);
      setLayer2Scale(d.layer2Scale);
      setLayer2TintMode(d.layer2TintMode);
      setLayer2TintHex(d.layer2TintHex);
      setLayer2BlendMode(d.layer2BlendMode);
      setLayer2FollowDistort(d.layer2FollowDistort);
      setLayer2BaseOpacity(d.layer2BaseOpacity);
      setVjLayer2AutomationMode(
        vjLayer2ModeFromLegacyBools(
          d.vjLayer2RandomBlink,
          d.vjLayer2BlinkInverse,
          d.vjLayer2RandomScale,
          d.vjLayer2RandomBurst,
        ),
      );
      setVjLayer2StrobeScale(d.vjLayer2StrobeScale);
      setVjLayer2PixelGlitch(d.vjLayer2PixelGlitch);

      if (full) {
        const r = rendererRef.current;
        if (r) {
          r.blob.centerX = d.blobCenter.x;
          r.blob.centerY = d.blobCenter.y;
        }

        setSettingsPasteDraft("");
        setFeatureHint("Settings applied.");
      } else {
        setFeatureHint("Template applied — colors and effects only; logos unchanged.");
      }
    },
    [],
  );

  const applyPastedSettingsFromDraft = useCallback(() => {
    const raw = settingsPasteDraft.trim();
    if (!raw) {
      setFeatureHint("Paste JSON into the box first (or copy from Copy settings).");
      return;
    }
    const parsed = parseSettingsSnapshot(raw);
    if (!parsed.ok) {
      setFeatureHint(parsed.error);
      return;
    }
    applySettingsFromSnapshot(parsed.data, "full");
  }, [settingsPasteDraft, applySettingsFromSnapshot, setFeatureHint]);

  const applyDesignTemplate = useCallback(
    (id: DesignTemplateId) => {
      const t = DESIGN_TEMPLATES.find((x) => x.id === id);
      if (!t) {
        return;
      }
      applySettingsFromSnapshot(t.snapshot, "designTemplate");
    },
    [applySettingsFromSnapshot],
  );

  const sidebar = useMemo(
    () => ({
      appearance: {
        imageScale,
        setImageScale,
        svgSourceUrl,
        svgTintMode,
        setSvgTintMode,
        svgTintHex,
        setSvgTintHex,
        svgGradientBlend,
        setSvgGradientBlend,
        svgGradientHex2,
        setSvgGradientHex2,
        svgGradientHex3,
        setSvgGradientHex3,
        svgGradientThreeStops,
        setSvgGradientThreeStops,
        svgGradientAngleDeg,
        setSvgGradientAngleDeg,
        svgGradientScale,
        setSvgGradientScale,
        svgGradientPosition,
        setSvgGradientPosition,
      },
      backdrop: {
        backdropHex: bgHex,
        setBackdropHex: setBgHex,
        backdropImageFileName,
        onBackdropImageFile,
        onRemoveBackdropImage: removeBackdropImage,
        hasBackdropImage: Boolean(backdropImageUrl),
      },
      secondaryLayer: {
        canUseLayer: Boolean(imgDims),
        layer2SourceUrl,
        layer2FileName,
        onLayer2File,
        onRemoveLayer2: removeLayer2,
        layer2Scale,
        setLayer2Scale,
        layer2TintMode,
        setLayer2TintMode,
        layer2TintHex,
        setLayer2TintHex,
        layer2BlendMode,
        setLayer2BlendMode,
        layer2FollowDistort,
        setLayer2FollowDistort,
        layer2BaseOpacity,
        setLayer2BaseOpacity,
      },
      videoBackdrop: {
        youtubeUrlDraft,
        setYoutubeUrlDraft,
        onYoutubeApply,
        onYoutubeClear,
        youtubeActive: youtubeEmbedActive,
        canvasBackdropBlend,
        setCanvasBackdropBlend,
        solidOverlayHex,
        setSolidOverlayHex,
        solidOverlayOpacity,
        setSolidOverlayOpacity,
        solidOverlayBlend,
        setSolidOverlayBlend,
      },
      lens: {
        shapeMode,
        setShapeMode,
        blobSize,
        setBlobSize,
        pauseAnimation,
        setPauseAnimation,
        blobSpeed,
        setBlobSpeed,
        waveFreq,
        setWaveFreq,
        waveAmp,
        setWaveAmp,
        refract,
        setRefract,
        edgeSoft,
        setEdgeSoft,
        filterMode,
        setFilterMode,
        filterStrength,
        setFilterStrength,
        filterScale,
        setFilterScale,
        filterMotionSpeed,
        setFilterMotionSpeed,
        detailDistortionEnabled,
        detailDistortionStrength,
        setDetailDistortionStrength,
        detailDistortionScale,
        setDetailDistortionScale,
        detailDirtStrength,
        setDetailDirtStrength,
        detailDirtHex,
        setDetailDirtHex,
      },
      mouseInput: {
        lensMouseInput,
        setLensMouseInput,
        fluidDensity,
        setFluidDensity,
      },
      bloom: {
        bloomStrength,
        setBloomStrength,
        bloomRadius,
        setBloomRadius,
        bloomThreshold,
        setBloomThreshold,
      },
      effects: {
        globalHueShift,
        setGlobalHueShift,
        hueApplyScope,
        setHueApplyScope,
        frostBlur,
        setFrostBlur,
        blurQuality,
        setBlurQuality,
        chroma,
        setChroma,
        grainStrength,
        setGrainStrength,
      },
      dupStack: {
        hasLensImage: Boolean(imgDims),
        vjDupVertical,
        setVjDupVertical,
        vjDupGap,
        setVjDupGap,
        vjDupHorizStep,
        setVjDupHorizStep,
        vjDupScrollSpeed,
        setVjDupScrollSpeed,
        onFeatureBlockedHint: showFeatureHint,
      },
      audio: {
        micDrivingRefraction,
        audioInputMode,
        setAudioInputMode,
        micRefractBoost,
        setMicRefractBoost,
        toggleMicRefraction,
        vjMode,
        setVjMode,
        vjPathScale,
        setVjPathScale,
        vjPathSpeed,
        setVjPathSpeed,
        vjGlassGradeMode,
        setVjGlassGradeMode,
        vjGlassNeonAHex,
        setVjGlassNeonAHex,
        vjGlassNeonBHex,
        setVjGlassNeonBHex,
        vjGlassGradeIntensity,
        setVjGlassGradeIntensity,
        solidOverlayOpacity,
        solidOverlayVjHueShift,
        setSolidOverlayVjHueShift,
        solidOverlayHueAudio,
        setSolidOverlayHueAudio,
        vjDupVertical,
        vjDupSpeedShift,
        setVjDupSpeedShift,
        vjDupRandomHoriz,
        setVjDupRandomHoriz,
        vjDupRandomBlink,
        setVjDupRandomBlink,
        vjDupRandomBlinkSpeed,
        setVjDupRandomBlinkSpeed,
        vjDupRandomBlinkSensitivity,
        setVjDupRandomBlinkSensitivity,
        vjInvertStrobe,
        setVjInvertStrobe,
        vjInvertStrobeAmount,
        setVjInvertStrobeAmount,
        vjYoutubeBeatBlackout,
        setVjYoutubeBeatBlackout,
        vjYoutubeBeatBlackoutSensitivity,
        setVjYoutubeBeatBlackoutSensitivity,
        youtubeBackdropActive: youtubeEmbedActive,
        hasSecondaryLayer: Boolean(layer2SourceUrl && layer2ImgDims),
        vjLayer2AutomationMode,
        setVjLayer2AutomationMode,
        vjLayer2StrobeScale,
        setVjLayer2StrobeScale,
        vjLayer2PixelGlitch,
        setVjLayer2PixelGlitch,
        onFeatureBlockedHint: showFeatureHint,
      },
      exportPage: {
        png: {
          transparentBackground: exportTransparent,
          setTransparentBackground: setExportTransparent,
          region: exportRegion,
          setRegion: setExportRegion,
          hasImage: !!imgDims,
          onExport1x: () => runPngExport(1),
          onExport2x: () => runPngExport(2),
        },
        gif: {
          fps: gifFps,
          setFps: setGifFps,
          maxWidthEnabled: gifMaxWidthEnabled,
          setMaxWidthEnabled: setGifMaxWidthEnabled,
          maxWidth: gifMaxWidth,
          setMaxWidth: setGifMaxWidth,
          maxColors: gifMaxColors,
          setMaxColors: setGifMaxColors,
          durationSec: gifDurationSec,
          setDurationSec: setGifDurationSec,
          pixelArtResize: gifPixelArtResize,
          setPixelArtResize: setGifPixelArtResize,
          infiniteLoop: gifInfiniteLoop,
          setInfiniteLoop: setGifInfiniteLoop,
          outputFolderLabel: gifOutputFolderLabel,
          onChooseOutputFolder: pickGifOutputFolder,
          onClearOutputFolder: clearGifOutputFolder,
          isRecording: gifRecording,
          recordProgress: gifRecordProgress,
          onStartRecord: startGifRecording,
          onCancelRecord: cancelGifRecording,
        },
        youtubeBackdropActive: youtubeEmbedActive,
      },
      shareSettings: {
        onCopySettings: copySettingsToClipboard,
        pasteDraft: settingsPasteDraft,
        onPasteDraftChange: setSettingsPasteDraft,
        onApplyPastedSettings: applyPastedSettingsFromDraft,
      },
    }),
    [
      bgHex,
      imageScale,
      svgSourceUrl,
      svgTintMode,
      svgTintHex,
      svgGradientBlend,
      svgGradientHex2,
      svgGradientHex3,
      svgGradientThreeStops,
      svgGradientAngleDeg,
      svgGradientScale,
      svgGradientPosition,
      shapeMode,
      blobSize,
      pauseAnimation,
      blobSpeed,
      waveFreq,
      waveAmp,
      refract,
      edgeSoft,
      filterMode,
      filterStrength,
      filterScale,
      filterMotionSpeed,
      detailDistortionEnabled,
      detailDistortionStrength,
      detailDistortionScale,
      detailDirtStrength,
      detailDirtHex,
      lensMouseInput,
      fluidDensity,
      bloomStrength,
      bloomRadius,
      bloomThreshold,
      frostBlur,
      blurQuality,
      globalHueShift,
      hueApplyScope,
      grainStrength,
      chroma,
      exportTransparent,
      exportRegion,
      imgDims,
      runPngExport,
      gifFps,
      gifMaxWidthEnabled,
      gifMaxWidth,
      gifMaxColors,
      gifDurationSec,
      gifPixelArtResize,
      gifInfiniteLoop,
      gifOutputFolderLabel,
      pickGifOutputFolder,
      clearGifOutputFolder,
      gifRecording,
      gifRecordProgress,
      startGifRecording,
      cancelGifRecording,
      micDrivingRefraction,
      audioInputMode,
      micRefractBoost,
      toggleMicRefraction,
      vjMode,
      vjDupVertical,
      vjDupGap,
      vjDupHorizStep,
      vjDupScrollSpeed,
      vjDupSpeedShift,
      vjDupRandomHoriz,
      vjDupRandomBlink,
      vjDupRandomBlinkSpeed,
      vjDupRandomBlinkSensitivity,
      vjInvertStrobe,
      vjInvertStrobeAmount,
      vjYoutubeBeatBlackout,
      vjYoutubeBeatBlackoutSensitivity,
      layer2SourceUrl,
      layer2FileName,
      layer2ImgDims,
      layer2Scale,
      layer2TintMode,
      layer2TintHex,
      layer2BlendMode,
      layer2FollowDistort,
      layer2BaseOpacity,
      vjLayer2AutomationMode,
      vjLayer2StrobeScale,
      vjLayer2PixelGlitch,
      vjPathScale,
      showFeatureHint,
      vjPathSpeed,
      vjGlassGradeMode,
      vjGlassNeonAHex,
      vjGlassNeonBHex,
      vjGlassGradeIntensity,
      youtubeUrlDraft,
      onYoutubeApply,
      onYoutubeClear,
      youtubeEmbedActive,
      canvasBackdropBlend,
      solidOverlayHex,
      solidOverlayOpacity,
      solidOverlayBlend,
      solidOverlayVjHueShift,
      solidOverlayHueAudio,
      copySettingsToClipboard,
      settingsPasteDraft,
      applyPastedSettingsFromDraft,
      onLayer2File,
      removeLayer2,
    ],
  );

  latestSyncRef.current = {
    bgHex,
    blobSize,
    pauseAnimation,
    blobSpeed,
    waveFreq,
    waveAmp,
    refract,
    edgeSoft,
    frostBlur,
    blurQuality,
    globalHueShift,
    hueApplyScope,
    grainStrength,
    chroma,
    shapeMode,
    filterMode,
    filterStrength,
    filterScale,
    filterMotionSpeed,
    blobCenterX: blobCenterRef.current.x,
    blobCenterY: blobCenterRef.current.y,
    bloomStrength,
    bloomRadius,
    bloomThreshold,
    hasLensTexture: Boolean(imgDims),
    svgSourceUrl,
    svgTintMode,
    svgTintHex,
    svgGradientBlend,
    svgGradientHex2,
    svgGradientHex3,
    svgGradientThreeStops,
    svgGradientAngleDeg,
    svgGradientScale,
    svgGradientPosition,
    micDrivingRefraction,
    micRefractBoost,
    micEnvelope: micDrivingRefraction ? micEnvelopeRef.current : 0,
    vjMode,
    vjDupVertical,
    vjDupGap,
    vjDupHorizStep,
    vjDupScrollSpeed,
    vjDupSpeedShift,
    vjDupRandomHoriz,
    vjDupRandomBlink,
    vjDupRandomBlinkSpeed,
    vjDupRandomBlinkSensitivity,
    vjPathScale,
    vjPathSpeed,
    youtubeEmbedActive,
    transparentSceneDomUnderlay:
      Boolean(backdropImageUrl) && !youtubeEmbedActive,
    vjGlassGradeMode,
    vjGlassNeonAHex,
    vjGlassNeonBHex,
    vjGlassGradeIntensity,
    detailDistortionEnabled,
    detailDistortionStrength,
    detailDistortionScale,
    detailDirtStrength,
    detailDirtHex,
    lensMouseInput,
    fluidDensity,
  };

  return (
    <div className="app">
      {webglError && (
        <div className="webgl-error-banner" role="alert">
          WebGL2 required — {webglError}
        </div>
      )}
      <div className="main">
        <div
          className="viewport"
          ref={wrapRef}
          style={{
            backgroundColor: youtubeEmbedActive ? "transparent" : bgHex,
            ...(backdropImageUrl && !youtubeEmbedActive
              ? {
                  backgroundImage: `url("${backdropImageUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }
              : {}),
            isolation: "isolate",
            ...(hueApplyScope === "viewport"
              ? {
                  filter: `hue-rotate(${normalizeHueDeg(globalHueShift)}deg)`,
                }
              : {}),
          }}
        >
          {youtubeVideoId && (
            <div className="viewport__youtube-wrap">
              <iframe
                ref={youtubeIframeRef}
                className="viewport__youtube"
                src={youtubeEmbedSrc}
                title="YouTube background"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
                allowFullScreen
              />
              {vjYoutubeBeatBlackout ? (
                <div
                  ref={vjYoutubeBeatBlackoutOverlayRef}
                  className="viewport__youtube-beat-blackout"
                  aria-hidden
                />
              ) : null}
            </div>
          )}
          {fpsHudVisible ? (
            <div className="fps-hud" aria-hidden>
              {fpsHudValue}
              <span className="fps-hud__unit"> fps</span>
            </div>
          ) : null}
          {solidOverlayOpacity > 0 && (
            <div
              ref={solidOverlayRef}
              className="viewport__solid-overlay"
              style={{
                backgroundColor: solidOverlayHex,
                opacity: solidOverlayOpacity,
                ...(solidOverlayBlend !== "normal" && {
                  mixBlendMode: solidOverlayBlend,
                }),
              }}
              aria-hidden
            />
          )}
          <canvas
            ref={canvasRef}
            tabIndex={-1}
            style={{
              cursor:
                pointerDrag === "pan"
                  ? "grabbing"
                  : pointerDrag === "fx"
                    ? "move"
                    : "grab",
              ...(canvasBackdropBlend !== "normal" && {
                mixBlendMode: canvasBackdropBlend,
              }),
            }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerUp}
            onContextMenu={onCanvasContextMenu}
          />
          {vjInvertStrobe ? (
            <div
              ref={vjInvertStrobeOverlayRef}
              className="viewport__vj-invert-strobe"
              aria-hidden
            />
          ) : null}
        </div>

        <SettingsSidebar
          ref={settingsSidebarRef}
          uiVisible={uiVisible}
          onFile={onFile}
          layer1FileName={layer1FileName}
          onRemoveLayer1={removeLayer1}
          appearance={sidebar.appearance}
          backdrop={sidebar.backdrop}
          secondaryLayer={sidebar.secondaryLayer}
          lens={sidebar.lens}
          dupStack={sidebar.dupStack}
          bloom={sidebar.bloom}
          effects={sidebar.effects}
          audio={sidebar.audio}
          videoBackdrop={sidebar.videoBackdrop}
          mouseInput={sidebar.mouseInput}
          shareSettings={sidebar.shareSettings}
          exportPage={sidebar.exportPage}
          templates={{ onApplyTemplate: applyDesignTemplate }}
        />
        {(micError || youtubeError || featureHint) && (
          <div
            className="app-toast-stack"
            role="region"
            aria-label="Messages"
            aria-live="polite"
          >
            {micError ? (
              <p className="app-toast app-toast--error" role="status">
                {micError}
              </p>
            ) : null}
            {youtubeError ? (
              <p className="app-toast app-toast--error" role="status">
                {youtubeError}
              </p>
            ) : null}
            {featureHint ? (
              <p className="app-toast app-toast--info" role="status">
                {featureHint}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
