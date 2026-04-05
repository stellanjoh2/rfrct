import { parseHexColor } from "../color";
import type {
  BlobParams,
  BloomParams,
  ShapeMode,
  SvgTintParams,
} from "./types";

const BLOOM_SOFT_KNEE = 0.1;

export type RendererSyncParams = {
  bgColor: [number, number, number, number];
  blob: BlobParams;
  bloom: BloomParams;
  svgTint: SvgTintParams;
};

/** Mutable renderer fields the app syncs each frame (avoids importing `RefractRenderer` here). */
export type RendererStateTarget = {
  bgColor: [number, number, number, number];
  blob: BlobParams;
  bloom: BloomParams;
  svgTint: SvgTintParams;
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
  blobCenterX: number;
  blobCenterY: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  svgSourceUrl: string | null;
  svgTintMode: "original" | "multiply" | "replace";
  svgTintHex: string;
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

  const blob: BlobParams = {
    centerX: s.blobCenterX,
    centerY: s.blobCenterY,
    radius: s.blobSize,
    speed: s.pauseAnimation ? 0 : s.blobSpeed,
    waveFreq: s.waveFreq,
    waveAmp: s.waveAmp,
    refractStrength: s.refract,
    edgeSoftness: s.edgeSoft,
    frostBlur: s.frostBlur,
    blurQuality: s.blurQuality,
    chroma: s.chroma,
    shapeMode: s.shapeMode,
  };

  return {
    bgColor: [bg[0], bg[1], bg[2], bg[3]],
    blob,
    bloom,
    svgTint,
  };
}
