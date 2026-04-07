import { parseHexColor } from "../color";
import type {
  BlobParams,
  BloomParams,
  FilterMode,
  ShapeMode,
  SvgTintParams,
} from "./types";

const BLOOM_SOFT_KNEE = 0.1;
/** Max refraction slider matches Lens UI (0.35). */
const REFRACT_CAP = 0.35;
/** Extra refraction at envelope=1, boost=1 (keeps usable range below cap). */
const MIC_REFRACT_GAIN = 0.48;

export type RendererSyncParams = {
  bgColor: [number, number, number, number];
  blob: BlobParams;
  bloom: BloomParams;
  svgTint: SvgTintParams;
  /** 0/1 — tile & scroll texture vertically in image space (VJ duplicate). */
  vjDupVertical: number;
  /** Normalized viewport height: extra gap between dup rows (0 = edge-to-edge). */
  vjDupGap: number;
  /** Horizontal stair step per row (viewport width); offset uses mod(row, 8). */
  vjDupHorizStep: number;
  /** Dup scroll rate (UV y units per second); drives internal scroll time, not blob speed. */
  vjDupScrollSpeed: number;
};

/** Mutable renderer fields the app syncs each frame (avoids importing `RefractRenderer` here). */
export type RendererStateTarget = {
  bgColor: [number, number, number, number];
  blob: BlobParams;
  bloom: BloomParams;
  svgTint: SvgTintParams;
  vjDupVertical: number;
  vjDupGap: number;
  vjDupHorizStep: number;
  vjDupScrollSpeed: number;
};

export function applyRendererState(
  r: RendererStateTarget,
  p: RendererSyncParams,
): void {
  r.bgColor = p.bgColor;
  Object.assign(r.blob, p.blob);
  r.bloom = { ...p.bloom };
  r.svgTint = {
    mode: p.svgTint.mode,
    rgb: [p.svgTint.rgb[0], p.svgTint.rgb[1], p.svgTint.rgb[2]],
  };
  r.vjDupVertical = p.vjDupVertical;
  r.vjDupGap = p.vjDupGap;
  r.vjDupHorizStep = p.vjDupHorizStep;
  r.vjDupScrollSpeed = p.vjDupScrollSpeed;
}

export type RendererSyncSource = {
  bgHex: string;
  blobSize: number;
  pauseAnimation: boolean;
  blobSpeed: number;
  waveFreq: number;
  waveAmp: number;
  refract: number;
  edgeSoft: number;
  frostBlur: number;
  blurQuality: number;
  chroma: number;
  shapeMode: ShapeMode;
  filterMode: FilterMode;
  filterStrength: number;
  filterScale: number;
  filterMotionSpeed: number;
  blobCenterX: number;
  blobCenterY: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  svgSourceUrl: string | null;
  svgTintMode: "original" | "multiply" | "replace";
  svgTintHex: string;
  /** When true, refraction adds micEnvelope × micRefractBoost × scale (clamped to max refraction). */
  micDrivingRefraction: boolean;
  micRefractBoost: number;
  micEnvelope: number;
  vjMode: boolean;
  vjDupVertical: boolean;
  /** 0–1 UI scale; gap in normalized viewport height between dup rows. */
  vjDupGap: number;
  /** Horizontal stair step (normalized viewport width per row phase). */
  vjDupHorizStep: number;
  /** Dup vertical scroll speed (UV units per second). */
  vjDupScrollSpeed: number;
  /** VJ orbit / lens path scale (1 = default squircle radius; &gt;1 pushes motion toward the edges). */
  vjPathScale: number;
};

export function buildRendererSyncParams(
  s: RendererSyncSource,
): RendererSyncParams {
  const bg = parseHexColor(s.bgHex);

  const svgTint: SvgTintParams = !s.svgSourceUrl
    ? { mode: 0, rgb: [1, 1, 1] }
    : {
        mode:
          s.svgTintMode === "original"
            ? 0
            : s.svgTintMode === "multiply"
              ? 1
              : 2,
        rgb: (() => {
          const c = parseHexColor(s.svgTintHex);
          return [c[0], c[1], c[2]] as [number, number, number];
        })(),
      };

  const bloom: BloomParams = {
    strength: s.bloomStrength,
    radius: s.bloomRadius,
    threshold: s.bloomThreshold,
    softKnee: BLOOM_SOFT_KNEE,
  };

  const refractStrength = s.micDrivingRefraction
    ? Math.min(
        REFRACT_CAP,
        s.refract +
          s.micEnvelope * s.micRefractBoost * MIC_REFRACT_GAIN,
      )
    : s.refract;

  const filterStrength = s.micDrivingRefraction
    ? Math.min(1, s.micEnvelope * s.filterStrength)
    : s.filterStrength;

  const blob: BlobParams = {
    centerX: s.blobCenterX,
    centerY: s.blobCenterY,
    radius: s.blobSize,
    speed: s.pauseAnimation ? 0 : s.blobSpeed,
    waveFreq: s.waveFreq,
    waveAmp: s.waveAmp,
    refractStrength,
    edgeSoftness: s.edgeSoft,
    frostBlur: s.frostBlur,
    blurQuality: s.blurQuality,
    chroma: s.chroma,
    shapeMode: s.shapeMode,
    filterMode: s.filterMode,
    filterStrength,
    filterScale: s.filterScale,
    filterMotionSpeed: s.filterMotionSpeed,
  };

  const vjTex =
    Boolean(s.svgSourceUrl) && s.vjMode;

  return {
    bgColor: [bg[0], bg[1], bg[2], bg[3]],
    blob,
    bloom,
    svgTint,
    vjDupVertical: vjTex && s.vjDupVertical ? 1 : 0,
    vjDupGap:
      vjTex && s.vjDupVertical ? Math.max(0, s.vjDupGap) : 0,
    vjDupHorizStep:
      vjTex && s.vjDupVertical ? Math.max(0, s.vjDupHorizStep) : 0,
    vjDupScrollSpeed:
      vjTex && s.vjDupVertical ? Math.max(0, s.vjDupScrollSpeed) : 0,
  };
}
