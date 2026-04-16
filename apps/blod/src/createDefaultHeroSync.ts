import type { RendererSyncSource } from "@rfrct/core";
import { BLOD_BRAND_BONE, BLOD_BRAND_RED } from "./brandColor";
import { publicUrl } from "./publicUrl";

/**
 * Bundled hero SVG — file: `public/Images/blood.svg` (URL respects Vite `base`).
 */
export const HERO_DEFAULT_SVG_URL = publicUrl("Images/blood.svg");

/** Default SVG / image zoom (`0.90`); not part of `RendererSyncSource` (matches rfrct-editor `imageScale`). */
export const HERO_DEFAULT_IMAGE_SCALE = 0.90;

/**
 * Starting point for hero art direction (`LOCKED_HERO_SYNC`).
 * Sync fields match art-direction export `blodArtDirectionExportVersion: 1` (2026-04-14, 08:20Z);
 * `svgSourceUrl` stays the bundled `HERO_DEFAULT_SVG_URL`, not a dev `blob:` URL.
 * SVG: replace tint with brand red. PNG underlay (flash logo): multiply rgb by official white in shader.
 */
export function createDefaultHeroSync(): RendererSyncSource {
  return {
    bgHex: "#000000",
    blobSize: 0.565,
    pauseAnimation: false,
    blobSpeed: 0.45,
    waveFreq: 2,
    waveAmp: 0.47,
    refract: 0.1,
    edgeSoft: 0.14,
    frostBlur: 4.5,
    blurQuality: 1,
    globalHueShift: 0,
    chroma: 0,
    shapeMode: 0,
    filterMode: 3,
    filterStrength: 0,
    filterScale: 0,
    filterMotionSpeed: 0.85,
    blobCenterX: 0.63,
    blobCenterY: 0,
    bloomStrength: 1.75,
    bloomRadius: 1.25,
    bloomThreshold: 0.65,
    svgSourceUrl: HERO_DEFAULT_SVG_URL,
    svgTintMode: "replace",
    svgTintHex: BLOD_BRAND_RED,
    underlayTintHex: BLOD_BRAND_BONE,
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
    detailDistortionStrength: 0.88,
    detailDistortionScale: 5,
    detailDirtStrength: 0.72,
    detailDirtHex: "#0f0200",
    lensMouseInput: true,
    fluidDensity: 0.94,
  };
}
