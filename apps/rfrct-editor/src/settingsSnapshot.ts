import { DEFAULT_VJ_PATH_SPEED, type FilterMode, type ShapeMode } from "@rfrct/core";
import type { AudioInputMode } from "./audio/micAnalyzer";
import type {
  SecondaryLayerBlendMode,
  SecondaryLayerTintMode,
} from "./components/settings/SecondaryLayerSection";
import {
  BACKDROP_BLEND_OPTIONS,
  type BackdropBlendMode,
} from "./videoBackdrop";

export const SETTINGS_SNAPSHOT_SCHEMA = "rfrct-editor-settings" as const;
export const SETTINGS_SNAPSHOT_VERSION = 1 as const;

const BLEND_VALUES = new Set(
  BACKDROP_BLEND_OPTIONS.map((o) => o.value),
) as Set<BackdropBlendMode>;

function blendMode(v: unknown, fallback: BackdropBlendMode): BackdropBlendMode {
  return typeof v === "string" && BLEND_VALUES.has(v as BackdropBlendMode)
    ? (v as BackdropBlendMode)
    : fallback;
}

/** Serializable app settings (no image / SVG file data). */
export type RfrctEditorSettingsSnapshotV1 = {
  schema: typeof SETTINGS_SNAPSHOT_SCHEMA;
  version: typeof SETTINGS_SNAPSHOT_VERSION;
  bgHex: string;
  imageScale: number;
  imagePan: { x: number; y: number };
  svgTintMode: "original" | "multiply" | "replace" | "gradient";
  svgTintHex: string;
  svgGradientBlend: "multiply" | "replace";
  svgGradientHex2: string;
  svgGradientHex3: string;
  svgGradientThreeStops: boolean;
  svgGradientAngleDeg: number;
  svgGradientScale: number;
  svgGradientPosition: number;
  blobCenter: { x: number; y: number };
  blobSize: number;
  pauseAnimation: boolean;
  blobSpeed: number;
  waveFreq: number;
  waveAmp: number;
  refract: number;
  edgeSoft: number;
  frostBlur: number;
  blurQuality: number;
  globalHueShift: number;
  /** 0–1 film grain overlay; omitted in older snapshots → 0. */
  grainStrength: number;
  chroma: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  shapeMode: ShapeMode;
  filterMode: FilterMode;
  filterStrength: number;
  filterScale: number;
  filterMotionSpeed: number;
  detailDistortionEnabled: boolean;
  detailDistortionStrength: number;
  detailDistortionScale: number;
  detailDirtStrength: number;
  detailDirtHex: string;
  lensMouseInput: boolean;
  fluidDensity: number;
  exportTransparent: boolean;
  exportRegion: "full" | "image";
  /** Export tab — animated GIF defaults (folder handle is never stored). */
  gifFps: number;
  gifMaxWidthEnabled: boolean;
  gifMaxWidth: number;
  gifMaxColors: 128 | 256;
  gifDurationSec: number;
  gifPixelArtResize: boolean;
  gifInfiniteLoop: boolean;
  youtubeVideoId: string | null;
  youtubeUrlDraft: string;
  canvasBackdropBlend: BackdropBlendMode;
  solidOverlayHex: string;
  solidOverlayOpacity: number;
  solidOverlayBlend: BackdropBlendMode;
  solidOverlayVjHueShift: boolean;
  solidOverlayHueAudio: boolean;
  /** Stored for repro; paste does not auto-start the mic. */
  audioInputMode: AudioInputMode;
  micRefractBoost: number;
  vjMode: boolean;
  vjDupVertical: boolean;
  vjDupGap: number;
  vjDupHorizStep: number;
  vjDupScrollSpeed: number;
  /** VJ: dB-driven dup scroll bursts (optional in older snapshots). */
  vjDupSpeedShift: boolean;
  /** VJ: random duplicate horizontal spacing while audio runs (optional in older snapshots). */
  vjDupRandomHoriz: boolean;
  /** VJ Extras: HF difference invert bursts (optional in older snapshots). */
  vjInvertStrobe: boolean;
  /** 0–1 — how often invert strobe bursts may fire (optional in older snapshots). */
  vjInvertStrobeAmount: number;
  vjPathScale: number;
  vjPathSpeed: number;
  vjGlassGradeMode: "off" | "tint" | "duotone";
  vjGlassNeonAHex: string;
  vjGlassNeonBHex: string;
  vjGlassGradeIntensity: number;
  /** Secondary layer (Design) — no SVG data in snapshot. */
  layer2Scale: number;
  layer2TintMode: SecondaryLayerTintMode;
  layer2TintHex: string;
  layer2BlendMode: SecondaryLayerBlendMode;
  layer2FollowDistort: boolean;
  layer2BaseOpacity: number;
  /** VJ tab — secondary layer. */
  vjLayer2RandomBlink: boolean;
  vjLayer2BlinkInverse: boolean;
  vjLayer2RandomScale: boolean;
  vjLayer2RandomBurst: boolean;
};

/**
 * All fields that **Copy settings** must include (`blobCenter` is merged at copy
 * time from refs). Adding a field to {@link RfrctEditorSettingsSnapshotV1} should
 * cause a type error here until the payload in `App.tsx` is updated.
 */
export type RfrctEditorSettingsSnapshotCopyPayload = Omit<
  RfrctEditorSettingsSnapshotV1,
  "schema" | "version" | "blobCenter"
>;

export function serializeSettingsSnapshot(
  s: RfrctEditorSettingsSnapshotV1,
): string {
  return JSON.stringify(s, null, 2);
}

/** Build a snapshot object with schema/version (for copy). */
export function createSettingsSnapshot(
  rest: Omit<RfrctEditorSettingsSnapshotV1, "schema" | "version">,
): RfrctEditorSettingsSnapshotV1 {
  return {
    schema: SETTINGS_SNAPSHOT_SCHEMA,
    version: SETTINGS_SNAPSHOT_VERSION,
    ...rest,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(n: unknown, fallback: number): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function str(n: unknown, fallback: string): string {
  return typeof n === "string" ? n : fallback;
}

function bool(n: unknown, fallback: boolean): boolean {
  return typeof n === "boolean" ? n : fallback;
}

/** At most one mode applies; legacy snapshots may have multiple booleans true — we normalize on load. */
export type VjLayer2AutomationMode =
  | "off"
  | "randomBlink"
  | "blinkInverse"
  | "randomScale"
  | "randomBurst";

export function vjLayer2ModeFromLegacyBools(
  vjLayer2RandomBlink: boolean,
  vjLayer2BlinkInverse: boolean,
  vjLayer2RandomScale: boolean,
  vjLayer2RandomBurst: boolean,
): VjLayer2AutomationMode {
  if (vjLayer2RandomBlink) return "randomBlink";
  if (vjLayer2BlinkInverse) return "blinkInverse";
  if (vjLayer2RandomScale) return "randomScale";
  if (vjLayer2RandomBurst) return "randomBurst";
  return "off";
}

export function vjLayer2ModeToLegacyBools(mode: VjLayer2AutomationMode): {
  vjLayer2RandomBlink: boolean;
  vjLayer2BlinkInverse: boolean;
  vjLayer2RandomScale: boolean;
  vjLayer2RandomBurst: boolean;
} {
  return {
    vjLayer2RandomBlink: mode === "randomBlink",
    vjLayer2BlinkInverse: mode === "blinkInverse",
    vjLayer2RandomScale: mode === "randomScale",
    vjLayer2RandomBurst: mode === "randomBurst",
  };
}

export function parseSettingsSnapshot(
  raw: string,
): { ok: true; data: RfrctEditorSettingsSnapshotV1 } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return { ok: false, error: "Not valid JSON." };
  }
  if (!isRecord(parsed)) {
    return { ok: false, error: "Root must be a JSON object." };
  }
  if (parsed.schema !== SETTINGS_SNAPSHOT_SCHEMA) {
    return {
      ok: false,
      error: `Unknown schema (expected "${SETTINGS_SNAPSHOT_SCHEMA}").`,
    };
  }
  if (parsed.version !== SETTINGS_SNAPSHOT_VERSION) {
    return {
      ok: false,
      error: `Unsupported version ${String(parsed.version)} (expected ${SETTINGS_SNAPSHOT_VERSION}).`,
    };
  }

  const p = parsed;
  const pan = isRecord(p.imagePan)
    ? { x: num(p.imagePan.x, 0), y: num(p.imagePan.y, 0) }
    : { x: 0, y: 0 };
  const bc = isRecord(p.blobCenter)
    ? { x: num(p.blobCenter.x, 0.5), y: num(p.blobCenter.y, 0.5) }
    : { x: 0.5, y: 0.5 };

  const svgTintMode = p.svgTintMode;
  const stm =
    svgTintMode === "multiply" ||
    svgTintMode === "replace" ||
    svgTintMode === "gradient"
      ? svgTintMode
      : "original";

  const svgGradientBlend: RfrctEditorSettingsSnapshotV1["svgGradientBlend"] =
    p.svgGradientBlend === "multiply" ? "multiply" : "replace";

  const exportRegion = p.exportRegion === "image" ? "image" : "full";

  const audioInputMode: AudioInputMode =
    p.audioInputMode === "display" ? "display" : "mic";

  const vjGlassGradeMode =
    p.vjGlassGradeMode === "tint" || p.vjGlassGradeMode === "duotone"
      ? p.vjGlassGradeMode
      : "off";

  const layer2TintMode: SecondaryLayerTintMode =
    p.layer2TintMode === "multiply" || p.layer2TintMode === "replace"
      ? p.layer2TintMode
      : "original";

  const LAYER2_BLEND = new Set<SecondaryLayerBlendMode>([
    "normal",
    "multiply",
    "screen",
    "plus-lighter",
    "overlay",
    "difference",
  ]);
  const layer2BlendMode: SecondaryLayerBlendMode =
    typeof p.layer2BlendMode === "string" &&
    LAYER2_BLEND.has(p.layer2BlendMode as SecondaryLayerBlendMode)
      ? (p.layer2BlendMode as SecondaryLayerBlendMode)
      : "normal";

  const shapeMode = Math.round(
    num(p.shapeMode, 0),
  ) as RfrctEditorSettingsSnapshotV1["shapeMode"];
  const filterMode = Math.round(
    num(p.filterMode, 0),
  ) as RfrctEditorSettingsSnapshotV1["filterMode"];

  const data: RfrctEditorSettingsSnapshotV1 = {
    schema: SETTINGS_SNAPSHOT_SCHEMA,
    version: SETTINGS_SNAPSHOT_VERSION,
    bgHex: str(p.bgHex, "#000000"),
    imageScale: num(p.imageScale, 1),
    imagePan: pan,
    svgTintMode: stm,
    svgTintHex: str(p.svgTintHex, "#ffffff"),
    svgGradientBlend,
    svgGradientHex2: str(p.svgGradientHex2, "#000000"),
    svgGradientHex3: str(p.svgGradientHex3, "#ffffff"),
    svgGradientThreeStops: bool(p.svgGradientThreeStops, false),
    svgGradientAngleDeg: num(p.svgGradientAngleDeg, 90),
    svgGradientScale: num(p.svgGradientScale, 1),
    svgGradientPosition: num(p.svgGradientPosition, 0),
    blobCenter: bc,
    blobSize: num(p.blobSize, 0.22),
    pauseAnimation: bool(p.pauseAnimation, false),
    blobSpeed: num(p.blobSpeed, 1),
    waveFreq: num(p.waveFreq, 5),
    waveAmp: num(p.waveAmp, 0.16),
    refract: num(p.refract, 0.12),
    edgeSoft: num(p.edgeSoft, 0.012),
    frostBlur: num(p.frostBlur, 0),
    blurQuality: num(p.blurQuality, 1),
    globalHueShift: num(p.globalHueShift, 0),
    grainStrength: num(p.grainStrength, 0),
    chroma: num(p.chroma, 0),
    bloomStrength: num(p.bloomStrength, 0),
    bloomRadius: num(p.bloomRadius, 0.2),
    bloomThreshold: num(p.bloomThreshold, 0.88),
    shapeMode: Math.min(5, Math.max(0, shapeMode)) as ShapeMode,
    filterMode: Math.min(10, Math.max(0, filterMode)) as FilterMode,
    filterStrength: num(p.filterStrength, 0),
    filterScale: num(p.filterScale, 0.5),
    filterMotionSpeed: num(p.filterMotionSpeed, 1),
    detailDistortionEnabled: bool(p.detailDistortionEnabled, false),
    detailDistortionStrength: num(p.detailDistortionStrength, 0),
    detailDistortionScale: num(p.detailDistortionScale, 3.2),
    detailDirtStrength: num(p.detailDirtStrength, 0),
    detailDirtHex: str(p.detailDirtHex, "#665648"),
    lensMouseInput: bool(p.lensMouseInput, false),
    fluidDensity: num(p.fluidDensity, 0.45),
    exportTransparent: bool(p.exportTransparent, false),
    exportRegion,
    gifFps: Math.round(
      Math.min(120, Math.max(1, num(p.gifFps, 24))),
    ),
    gifMaxWidthEnabled: bool(p.gifMaxWidthEnabled, true),
    gifMaxWidth: Math.round(
      Math.min(4096, Math.max(64, num(p.gifMaxWidth, 600))),
    ),
    gifMaxColors: p.gifMaxColors === 128 ? 128 : 256,
    gifDurationSec: Math.min(
      30,
      Math.max(0.5, num(p.gifDurationSec, 6)),
    ),
    gifPixelArtResize: bool(p.gifPixelArtResize, false),
    gifInfiniteLoop: bool(p.gifInfiniteLoop, true),
    youtubeVideoId:
      p.youtubeVideoId === null || typeof p.youtubeVideoId === "string"
        ? p.youtubeVideoId
        : null,
    youtubeUrlDraft: str(p.youtubeUrlDraft, ""),
    canvasBackdropBlend: blendMode(p.canvasBackdropBlend, "normal"),
    solidOverlayHex: str(p.solidOverlayHex, "#000000"),
    solidOverlayOpacity: num(p.solidOverlayOpacity, 0),
    solidOverlayBlend: blendMode(p.solidOverlayBlend, "normal"),
    solidOverlayVjHueShift: bool(p.solidOverlayVjHueShift, false),
    solidOverlayHueAudio: bool(p.solidOverlayHueAudio, true),
    audioInputMode,
    micRefractBoost: num(p.micRefractBoost, 0.65),
    vjMode: bool(p.vjMode, false),
    vjDupVertical: bool(p.vjDupVertical, false),
    vjDupGap: num(p.vjDupGap, 0),
    vjDupHorizStep: num(p.vjDupHorizStep, 0.03),
    vjDupScrollSpeed: num(p.vjDupScrollSpeed, 0.11),
    vjDupSpeedShift: bool(p.vjDupSpeedShift, false),
    vjDupRandomHoriz: bool(p.vjDupRandomHoriz, false),
    vjInvertStrobe: bool(p.vjInvertStrobe, false),
    vjInvertStrobeAmount: Math.min(
      1,
      Math.max(0, num(p.vjInvertStrobeAmount, 0.5)),
    ),
    vjPathScale: num(p.vjPathScale, 1),
    vjPathSpeed: num(p.vjPathSpeed, DEFAULT_VJ_PATH_SPEED),
    vjGlassGradeMode,
    vjGlassNeonAHex: str(p.vjGlassNeonAHex, "#ff00ee"),
    vjGlassNeonBHex: str(p.vjGlassNeonBHex, "#1a0055"),
    vjGlassGradeIntensity: num(p.vjGlassGradeIntensity, 0),
    layer2Scale: num(p.layer2Scale, 0.55),
    layer2TintMode,
    layer2TintHex: str(p.layer2TintHex, "#ffffff"),
    layer2BlendMode,
    layer2FollowDistort: bool(p.layer2FollowDistort, true),
    layer2BaseOpacity: num(p.layer2BaseOpacity, 1),
    ...vjLayer2ModeToLegacyBools(
      vjLayer2ModeFromLegacyBools(
        bool(p.vjLayer2RandomBlink, false),
        bool(p.vjLayer2BlinkInverse, false),
        bool(p.vjLayer2RandomScale, false),
        bool(p.vjLayer2RandomBurst, false),
      ),
    ),
  };

  return { ok: true, data };
}
