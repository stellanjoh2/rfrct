import type { RendererSyncSource } from "@refrct/core";
import { publicUrl } from "./publicUrl";

/**
 * Bundled hero SVG — file: `public/Images/blood.svg` (URL respects Vite `base`).
 */
export const HERO_DEFAULT_SVG_URL = publicUrl("Images/blood.svg");

/** Default SVG / image zoom; not part of `RendererSyncSource` (matches refrct-editor `imageScale`). */
export const HERO_DEFAULT_IMAGE_SCALE = 0.9;

/** Starting point for hero art direction; tweak in dev, then copy into `lockedHeroPreset.ts`. */
export function createDefaultHeroSync(): RendererSyncSource {
  return {
    bgHex: "#000000",
    blobSize: 0.99,
    pauseAnimation: false,
    blobSpeed: 0.3,
    waveFreq: 4,
    waveAmp: 0.16,
    refract: 0.135,
    edgeSoft: 0.072,
    frostBlur: 1.75,
    blurQuality: 1,
    chroma: 0.54,
    shapeMode: 0,
    filterMode: 3,
    filterStrength: 0.14,
    filterScale: 0.5,
    filterMotionSpeed: 1,
    blobCenterX: 0.72,
    blobCenterY: 0,
    bloomStrength: 0.85,
    bloomRadius: 0.95,
    bloomThreshold: 0.1,
    svgSourceUrl: HERO_DEFAULT_SVG_URL,
    svgTintMode: "replace",
    svgTintHex: "#8a0000",
    micDrivingRefraction: false,
    micRefractBoost: 0.65,
    micEnvelope: 0,
    vjMode: false,
    vjDupVertical: false,
    vjDupGap: 0,
    vjDupHorizStep: 0.03,
    vjDupScrollSpeed: 0.11,
    vjPathScale: 1,
    vjPathSpeed: 0.056,
    youtubeEmbedActive: false,
    vjGlassGradeMode: "off",
    vjGlassNeonAHex: "#ff00ee",
    vjGlassNeonBHex: "#1a0055",
    vjGlassGradeIntensity: 0,
    detailDistortionEnabled: true,
    detailDistortionStrength: 1,
    detailDistortionScale: 3.2,
    detailDirtStrength: 1,
    detailDirtHex: "#0f0200",
    lensMouseInput: false,
    fluidDensity: 0.45,
  };
}
