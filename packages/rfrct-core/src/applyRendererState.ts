import { parseHexColor } from "./color";
import type {
  BlobParams,
  BloomParams,
  DetailDistortionParams,
  FilterMode,
  GlassGradeParams,
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
  /** When true, WebGL composites with alpha (YouTube / external layer behind canvas). */
  transparentSceneBg: boolean;
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
  /** Dup horizontal scroll rate (UV x units per second; signed). */
  vjDupScrollSpeedX: number;
  /** VJ-only neon colour grade inside the lens (independent of SVG tint). */
  glassGrade: GlassGradeParams;
  /** Normal-map micro-refraction layered on the main lens displacement. */
  detailDistortion: DetailDistortionParams;
  /** Multiply hero underlay (PNG) rgb in shader; default white = no change. */
  underlayTintRgb: [number, number, number];
  /** Degrees — post-process hue rotation on final composite (scene + bloom). */
  globalHueShift: number;
  /** 0–1 — overlay film grain on final composite (after bloom). */
  grainStrength: number;
};

/** Mutable renderer fields the app syncs each frame (avoids importing `RfrctRenderer` here). */
export type RendererStateTarget = {
  bgColor: [number, number, number, number];
  transparentSceneBg: boolean;
  blob: BlobParams;
  bloom: BloomParams;
  svgTint: SvgTintParams;
  vjDupVertical: number;
  vjDupGap: number;
  vjDupHorizStep: number;
  vjDupScrollSpeed: number;
  vjDupScrollSpeedX: number;
  glassGrade: GlassGradeParams;
  detailDistortion: DetailDistortionParams;
  underlayTintRgb: [number, number, number];
  globalHueShift: number;
  grainStrength: number;
};

export function applyRendererState(
  r: RendererStateTarget,
  p: RendererSyncParams,
): void {
  r.bgColor = p.bgColor;
  r.transparentSceneBg = p.transparentSceneBg;
  Object.assign(r.blob, p.blob);
  r.bloom = { ...p.bloom };
  r.svgTint = {
    mode: p.svgTint.mode,
    rgb: [p.svgTint.rgb[0], p.svgTint.rgb[1], p.svgTint.rgb[2]],
    gradientRgb2: [
      p.svgTint.gradientRgb2[0],
      p.svgTint.gradientRgb2[1],
      p.svgTint.gradientRgb2[2],
    ],
    gradientRgb3: [
      p.svgTint.gradientRgb3[0],
      p.svgTint.gradientRgb3[1],
      p.svgTint.gradientRgb3[2],
    ],
    gradientStops: p.svgTint.gradientStops,
    gradientAngleRad: p.svgTint.gradientAngleRad,
    gradientScale: p.svgTint.gradientScale,
    gradientOffset: p.svgTint.gradientOffset,
  };
  r.vjDupVertical = p.vjDupVertical;
  r.vjDupGap = p.vjDupGap;
  r.vjDupHorizStep = p.vjDupHorizStep;
  r.vjDupScrollSpeed = p.vjDupScrollSpeed;
  r.vjDupScrollSpeedX = p.vjDupScrollSpeedX;
  r.glassGrade = {
    mode: p.glassGrade.mode,
    rgbA: [p.glassGrade.rgbA[0], p.glassGrade.rgbA[1], p.glassGrade.rgbA[2]],
    rgbB: [p.glassGrade.rgbB[0], p.glassGrade.rgbB[1], p.glassGrade.rgbB[2]],
    strength: p.glassGrade.strength,
  };
  r.detailDistortion = {
    enabled: p.detailDistortion.enabled,
    strength: p.detailDistortion.strength,
    scale: p.detailDistortion.scale,
    dirtStrength: p.detailDistortion.dirtStrength,
    dirtRgb: [
      p.detailDistortion.dirtRgb[0],
      p.detailDistortion.dirtRgb[1],
      p.detailDistortion.dirtRgb[2],
    ],
  };
  r.underlayTintRgb = [
    p.underlayTintRgb[0],
    p.underlayTintRgb[1],
    p.underlayTintRgb[2],
  ];
  r.globalHueShift = p.globalHueShift;
  r.grainStrength = p.grainStrength;
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
  /** 0–360 — global output hue (export-friendly). */
  globalHueShift: number;
  /** 0–1 — film grain overlay on final output. */
  grainStrength?: number;
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
  /**
   * When true, a logo texture is on the lens (SVG or raster). Used for duplicate tiling;
   * if omitted, falls back to `Boolean(svgSourceUrl)` for backward compatibility.
   */
  hasLensTexture?: boolean;
  svgSourceUrl: string | null;
  svgTintMode: "original" | "multiply" | "replace" | "gradient";
  svgTintHex: string;
  /**
   * When `svgTintMode` is `"gradient"`: multiply vs replace (same meaning as Tint / Fill).
   * @default "replace"
   */
  svgGradientBlend?: "multiply" | "replace";
  /** Second stop (hex). */
  svgGradientHex2?: string;
  /** Third stop — middle colour when `svgGradientThreeStops` is true. */
  svgGradientHex3?: string;
  /** When true, use three stops along the gradient line. */
  svgGradientThreeStops?: boolean;
  /**
   * Degrees — CSS `linear-gradient` convention: 0 = up, 90 = right, 180 = down, 270 = left.
   * @default 90
   */
  svgGradientAngleDeg?: number;
  /**
   * Gradient spread along the colour axis (gradient mode only). 1 = default.
   * Lower pinches transitions toward the centre; higher softens and widens the blend.
   */
  svgGradientScale?: number;
  /** Slide gradient along its axis (logo UV); default 0. */
  svgGradientPosition?: number;
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
  /**
   * Dup horizontal scroll speed (UV x / s, signed). Usually 0; VJ speed-shift sets this from audio.
   */
  vjDupScrollSpeedX?: number;
  /** When true with live audio, duplicate-stack scroll speeds follow dB with random bursts. */
  vjDupSpeedShift?: boolean;
  /** When true with live audio, horizontal stair spacing is randomized (VJ Extras). */
  vjDupRandomHoriz?: boolean;
  /** VJ orbit / lens path scale (1 = default squircle radius; &gt;1 pushes motion toward the edges). */
  vjPathScale: number;
  /** VJ squircle orbit rate in full laps per second (0 = hold start angle). */
  vjPathSpeed: number;
  /** Fullscreen YouTube embed behind the canvas (transparent WebGL pass-through). */
  youtubeEmbedActive: boolean;
  /**
   * Same RGBA composite as `youtubeEmbedActive`: canvas can be transparent where the scene
   * texture is transparent so a DOM layer behind the canvas shows through (e.g. hero flash).
   */
  transparentSceneDomUnderlay?: boolean;
  /** VJ glass neon: off | tint | duotone */
  vjGlassGradeMode: "off" | "tint" | "duotone";
  vjGlassNeonAHex: string;
  vjGlassNeonBHex: string;
  /** 0–2 — intensity before audio envelope. */
  vjGlassGradeIntensity: number;
  detailDistortionEnabled: boolean;
  /** 0–1 — amplitude of normal-map micro-displacement. */
  detailDistortionStrength: number;
  /** Screen-space tiling of the normal texture. */
  detailDistortionScale: number;
  /** 0–1 — dirt / stain from normal-derived height proxy (same texture as detail). */
  detailDirtStrength?: number;
  /** Multiply tint for dirt (hex). */
  detailDirtHex?: string;
  /** When true, lens center follows pointer with fluid delay (overrides VJ path for center). */
  lensMouseInput: boolean;
  /** 0–1 — heavier / slower liquid when using mouse follow. */
  fluidDensity: number;
  /**
   * When set, hero underlay bitmap (PNG) rgb *= this colour in the fragment shader (multiply).
   * SVG tint is separate (`svgTintHex`). Omit or empty for white (no change to underlay).
   */
  underlayTintHex?: string;
};

export function buildRendererSyncParams(
  s: RendererSyncSource,
): RendererSyncParams {
  const transparentSceneBg =
    s.youtubeEmbedActive || Boolean(s.transparentSceneDomUnderlay);
  const bg = transparentSceneBg
    ? ([0, 0, 0, 0] as [number, number, number, number])
    : parseHexColor(s.bgHex);

  const svgTintIdle: SvgTintParams = {
    mode: 0,
    rgb: [1, 1, 1],
    gradientRgb2: [1, 1, 1],
    gradientRgb3: [1, 1, 1],
    gradientStops: 2,
    gradientAngleRad: 0,
    gradientScale: 1,
    gradientOffset: 0,
  };

  const svgTint: SvgTintParams = !s.svgSourceUrl
    ? svgTintIdle
    : s.svgTintMode === "gradient"
      ? (() => {
          const c1 = parseHexColor(s.svgTintHex);
          const c2 = parseHexColor(s.svgGradientHex2 ?? "#000000");
          const c3 = parseHexColor(s.svgGradientHex3 ?? "#ffffff");
          const three = Boolean(s.svgGradientThreeStops);
          const angleDeg = Number.isFinite(s.svgGradientAngleDeg ?? NaN)
            ? (s.svgGradientAngleDeg as number)
            : 90;
          const angleRad = (angleDeg * Math.PI) / 180;
          const rawScale = Number(s.svgGradientScale ?? 1);
          const gradientScale = Number.isFinite(rawScale)
            ? Math.min(10, Math.max(0.05, rawScale))
            : 1;
          const rawPos = Number(s.svgGradientPosition ?? 0);
          const gradientOffset = Number.isFinite(rawPos)
            ? Math.min(3, Math.max(-3, rawPos))
            : 0;
          const gradMult = s.svgGradientBlend === "multiply";
          return {
            mode: (gradMult ? 3 : 4) as SvgTintParams["mode"],
            rgb: [c1[0], c1[1], c1[2]] as [number, number, number],
            gradientRgb2: [c2[0], c2[1], c2[2]] as [number, number, number],
            gradientRgb3: [c3[0], c3[1], c3[2]] as [number, number, number],
            gradientStops: (three ? 3 : 2) as 2 | 3,
            gradientAngleRad: angleRad,
            gradientScale,
            gradientOffset,
          };
        })()
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
          gradientRgb2: [1, 1, 1],
          gradientRgb3: [1, 1, 1],
          gradientStops: 2,
          gradientAngleRad: 0,
          gradientScale: 1,
          gradientOffset: 0,
        };

  const underlayTintRgb = (() => {
    const h = s.underlayTintHex?.trim();
    if (!h) return [1, 1, 1] as [number, number, number];
    const c = parseHexColor(h);
    return [c[0], c[1], c[2]] as [number, number, number];
  })();

  const bloom: BloomParams = {
    strength: s.bloomStrength,
    radius: s.bloomRadius,
    threshold: s.bloomThreshold,
    softKnee: BLOOM_SOFT_KNEE,
  };

  /**
   * Mic adds only within headroom below {@link REFRACT_CAP}, scaled by envelope × boost,
   * so Audio boost stays meaningful even when the Lens refraction slider is not at zero.
   */
  const refractStrength = s.micDrivingRefraction
    ? (() => {
        const room = Math.max(0, REFRACT_CAP - s.refract);
        const audioAdd =
          room > 0
            ? room *
              Math.min(1, s.micEnvelope) *
              s.micRefractBoost *
              (MIC_REFRACT_GAIN / REFRACT_CAP)
            : 0;
        return Math.min(REFRACT_CAP, s.refract + audioAdd);
      })()
    : s.refract;

  const filterStrength = s.micDrivingRefraction
    ? Math.min(
        1,
        s.micEnvelope * s.micRefractBoost * s.filterStrength,
      )
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
    blurQuality: Math.min(5, Math.max(1, s.blurQuality)),
    chroma: s.chroma,
    shapeMode: s.shapeMode,
    filterMode: s.filterMode,
    filterStrength,
    filterScale: s.filterScale,
    filterMotionSpeed: s.filterMotionSpeed,
  };

  const lensTexForDup = s.hasLensTexture ?? Boolean(s.svgSourceUrl);
  const dupShaderOn = lensTexForDup && s.vjDupVertical;

  const glassGrade: GlassGradeParams = (() => {
    const off: GlassGradeParams = {
      mode: 0,
      rgbA: [1, 1, 1],
      rgbB: [0, 0, 0],
      strength: 0,
    };
    if (
      !s.vjMode ||
      s.vjGlassGradeIntensity < 1e-4 ||
      s.vjGlassGradeMode === "off"
    ) {
      return off;
    }
    const ca = parseHexColor(s.vjGlassNeonAHex);
    const cb = parseHexColor(s.vjGlassNeonBHex);
    const envMod =
      s.micDrivingRefraction && s.vjMode
        ? 0.1 + 0.9 * s.micEnvelope * s.micRefractBoost
        : 1.0;
    const strength = Math.min(2, s.vjGlassGradeIntensity * envMod);
    return {
      mode: s.vjGlassGradeMode === "tint" ? 1 : 2,
      rgbA: [ca[0], ca[1], ca[2]] as [number, number, number],
      rgbB: [cb[0], cb[1], cb[2]] as [number, number, number],
      strength,
    };
  })();

  const detailStrength = Math.max(
    0,
    Math.min(1, s.detailDistortionStrength ?? 0),
  );
  const detailEnabled = detailStrength > 1e-6;

  return {
    bgColor: [bg[0], bg[1], bg[2], bg[3]],
    transparentSceneBg,
    blob,
    bloom,
    svgTint,
    vjDupVertical: dupShaderOn ? 1 : 0,
    vjDupGap: dupShaderOn ? Math.max(0, s.vjDupGap) : 0,
    vjDupHorizStep: dupShaderOn ? Math.max(0, s.vjDupHorizStep) : 0,
    vjDupScrollSpeed: dupShaderOn ? Math.max(0, s.vjDupScrollSpeed) : 0,
    vjDupScrollSpeedX: dupShaderOn ? s.vjDupScrollSpeedX ?? 0 : 0,
    glassGrade,
    detailDistortion: {
      enabled: detailEnabled,
      strength: detailStrength,
      scale: Math.max(
        0.25,
        Math.min(14, s.detailDistortionScale ?? 3.2),
      ),
      dirtStrength: detailEnabled
        ? Math.max(0, Math.min(1, s.detailDirtStrength ?? 0))
        : 0,
      dirtRgb: (() => {
        const c = parseHexColor(s.detailDirtHex ?? "#665648");
        return [c[0], c[1], c[2]] as [number, number, number];
      })(),
    },
    underlayTintRgb,
    globalHueShift: (() => {
      const x = Number(s.globalHueShift);
      if (!Number.isFinite(x)) return 0;
      return ((x % 360) + 360) % 360;
    })(),
    grainStrength: (() => {
      const x = Number(s.grainStrength ?? 0);
      if (!Number.isFinite(x)) return 0;
      return Math.max(0, Math.min(1, x));
    })(),
  };
}
