/** 0 = blob, 1 = 3D cube slice, 2 = metaballs, 3 = water (rolling waves) */
export type ShapeMode = 0 | 1 | 2 | 3;

/**
 * Full-screen glass displacement layered after the lens (screen-space UV offset).
 * 0 = none, 1 = horizontal reeds, 2 = bullseye, 3 = speckle, 4 = halftone dots, 5 = vertical reeds
 */
export type FilterMode = 0 | 1 | 2 | 3 | 4 | 5;

export type BlobParams = {
  centerX: number;
  centerY: number;
  radius: number;
  waveFreq: number;
  waveAmp: number;
  /** Multiplier on animation time (1 = default speed, 0 = frozen). */
  speed: number;
  refractStrength: number;
  edgeSoftness: number;
  /** Extra Gaussian blur in framebuffer pixels (lens / frost). */
  frostBlur: number;
  /** 1 = 9 taps, 2 = 25, 3 = 49 (binomial kernels; higher = softer, heavier GPU). */
  blurQuality: number;
  chroma: number;
  shapeMode: ShapeMode;
  filterMode: FilterMode;
  /** 0–1 UI strength; shader applies 2× so max displacement is 2× the original baseline. */
  filterStrength: number;
  /** 0–1 feature size: 0 = finest/thinnest/smallest, 1 = coarsest/widest (all glass filter modes). */
  filterScale: number;
  /** Multiplier on glass filter motion only (0 = frozen pattern, >1 = faster drift / phase). */
  filterMotionSpeed: number;
};

export type ImageLayout = {
  rect: { x: number; y: number; w: number; h: number };
  naturalWidth: number;
  naturalHeight: number;
};

/** Same fields as Dreams `FxSettings.bloom` (Candy Lands / three.js BloomNode-style tuning). */
export type BloomParams = {
  strength: number;
  radius: number;
  threshold: number;
  /** Soft knee for threshold curve (fixed default in UI; matches Unreal-style bloom). */
  softKnee: number;
};

/** 0 = original, 1 = multiply by tint, 2 = replace rgb with tint (alpha preserved). */
export type SvgTintMode = 0 | 1 | 2;

export type SvgTintParams = {
  mode: SvgTintMode;
  /** sRGB 0–1 channels (same as CSS hex). */
  rgb: [number, number, number];
};

/** 0 = off, 1 = neon tint (screen-ish), 2 = duotone (shadows → highlights). Lens only; independent of SVG tint. */
export type GlassGradeMode = 0 | 1 | 2;

export type GlassGradeParams = {
  mode: GlassGradeMode;
  /** Bright / highlight neon (sRGB). */
  rgbA: [number, number, number];
  /** Dark / shadow neon (sRGB); duotone only. */
  rgbB: [number, number, number];
  /** Effective strength 0–2 after audio; applied only inside lens when VJ mode. */
  strength: number;
};

/** High-frequency UV warp from a tangent-space normal map (lens interior only). */
export type DetailDistortionParams = {
  enabled: boolean;
  /** 0–1 UI; mapped to displacement amplitude in the renderer. */
  strength: number;
  /** Screen-UV repeats of the map; higher = smaller / busier detail. */
  scale: number;
  /**
   * 0–1 stain from the same map: tilt/cavity proxy (1−Nz) × multiply tint — “dirt” in recesses.
   */
  dirtStrength: number;
  /** sRGB 0–1 multiply colour for dirt (typically warm / grey-brown). */
  dirtRgb: [number, number, number];
};
