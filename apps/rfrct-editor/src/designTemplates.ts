import {
  parseSettingsSnapshot,
  type RfrctEditorSettingsSnapshotV1,
} from "./settingsSnapshot";

/**
 * Full snapshot JSON for validation; {@link applySettingsFromSnapshot} in App skips
 * image geometry, blob position, YouTube, and export/GIF when applying a design template.
 */
const ACID_SNAPSHOT_JSON = `{
  "schema": "rfrct-editor-settings",
  "version": 1,
  "bgHex": "#000000",
  "imageScale": 1.0876980218179273,
  "imagePan": { "x": -0.00006624634502923977, "y": 0 },
  "svgTintMode": "original",
  "svgTintHex": "#00ff91",
  "svgGradientBlend": "replace",
  "svgGradientHex2": "#000000",
  "svgGradientHex3": "#ffffff",
  "svgGradientThreeStops": false,
  "svgGradientAngleDeg": 90,
  "svgGradientScale": 1,
  "svgGradientPosition": 0,
  "blobSize": 0.905,
  "pauseAnimation": false,
  "blobSpeed": 0.35,
  "waveFreq": 1.5,
  "waveAmp": 0.53,
  "refract": 0.055,
  "edgeSoft": 0.147,
  "frostBlur": 0,
  "blurQuality": 1,
  "globalHueShift": 25,
  "hueApplyScope": "viewport",
  "grainStrength": 0.11,
  "chroma": 0.79,
  "bloomStrength": 1.5,
  "bloomRadius": 1.15,
  "bloomThreshold": 0.88,
  "shapeMode": 0,
  "filterMode": 2,
  "filterStrength": 1,
  "filterScale": 0.28,
  "filterMotionSpeed": 1,
  "detailDistortionEnabled": false,
  "detailDistortionStrength": 0,
  "detailDistortionScale": 3.2,
  "detailDirtStrength": 0,
  "detailDirtHex": "#665648",
  "lensMouseInput": false,
  "fluidDensity": 0.45,
  "exportTransparent": false,
  "exportRegion": "full",
  "gifFps": 24,
  "gifMaxWidthEnabled": true,
  "gifMaxWidth": 600,
  "gifMaxColors": 256,
  "gifDurationSec": 6,
  "gifPixelArtResize": false,
  "gifInfiniteLoop": true,
  "youtubeVideoId": "42DEVyxMf54",
  "youtubeUrlDraft": "https://www.youtube.com/watch?v=42DEVyxMf54",
  "canvasBackdropBlend": "difference",
  "solidOverlayHex": "#ff0000",
  "solidOverlayOpacity": 1,
  "solidOverlayBlend": "difference",
  "solidOverlayVjHueShift": true,
  "solidOverlayHueAudio": true,
  "audioInputMode": "mic",
  "micRefractBoost": 0.86,
  "vjMode": true,
  "vjDupVertical": true,
  "vjDupGap": 0.015,
  "vjDupHorizStep": 0.18,
  "vjDupScrollSpeed": 0.035,
  "vjDupSpeedShift": true,
  "vjDupRandomHoriz": true,
  "vjInvertStrobe": true,
  "vjInvertStrobeAmount": 1,
  "vjPathScale": 1,
  "vjPathSpeed": 0.056,
  "vjGlassGradeMode": "duotone",
  "vjGlassNeonAHex": "#ff00ee",
  "vjGlassNeonBHex": "#ff0040",
  "vjGlassGradeIntensity": 1.9,
  "layer2Scale": 3,
  "layer2TintMode": "replace",
  "layer2TintHex": "#00ffbf",
  "layer2BlendMode": "difference",
  "layer2FollowDistort": true,
  "layer2BaseOpacity": 1,
  "vjLayer2RandomBlink": false,
  "vjLayer2BlinkInverse": false,
  "vjLayer2RandomScale": false,
  "vjLayer2RandomBurst": true,
  "vjLayer2StrobeScale": true,
  "blobCenter": { "x": 0.9138045023489559, "y": 0.8427537162346044 }
}`;

function loadAcidSnapshot(): RfrctEditorSettingsSnapshotV1 {
  const r = parseSettingsSnapshot(ACID_SNAPSHOT_JSON);
  if (!r.ok) {
    throw new Error(`Acid template: ${r.error}`);
  }
  return r.data;
}

const ACID_DESIGN_SNAPSHOT = loadAcidSnapshot();

export const DESIGN_TEMPLATES = [
  { id: "acid" as const, label: "Acid", snapshot: ACID_DESIGN_SNAPSHOT },
] as const;

export type DesignTemplateId = (typeof DESIGN_TEMPLATES)[number]["id"];
