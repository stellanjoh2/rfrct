/** 0 = blob, 1 = 3D cube slice, 2 = metaballs, 3 = water, 4 = vertical reeds, 5 = horizontal reeds */
export type ShapeMode = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Full-screen glass displacement layered after the lens (screen-space UV offset).
 * 0 = none, 1 = horizontal reeds, 2 = bullseye, 3 = speckle, 4 = halftone dots, 5 = vertical reeds,
 * 6 = pixels uniform, 7 = pixels random, 8 = bubbles, 9 = dots, 10 = cross fluted (both reed axes)
 */
export type FilterMode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

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
  /** 1–5 → 25 / 49 / 121 / 225 / 529 taps (binomial; 4–5 use dense ±5s footprint like 11×11, smoother). */
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

/**
 * 0 = original, 1 = multiply by solid tint, 2 = replace rgb with solid tint (alpha preserved),
 * 3 = multiply by linear gradient, 4 = replace rgb with linear gradient.
 */
export type SvgTintMode = 0 | 1 | 2 | 3 | 4;

export type SvgTintParams = {
  mode: SvgTintMode;
  /** sRGB 0–1 — stop 1 for gradients; solid tint when mode is 1 or 2. */
  rgb: [number, number, number];
  /** Gradient stop 2 (modes 3–4). */
  gradientRgb2: [number, number, number];
  /** Gradient stop 3 — middle when `gradientStops` is 3 (modes 3–4). */
  gradientRgb3: [number, number, number];
  /** 2 = rgb ↔ rgb2; 3 = rgb → rgb2 → rgb3. */
  gradientStops: 2 | 3;
  /** Radians — CSS convention: 0 = toward +v (up in texture space), π/2 = +u (right). */
  gradientAngleRad: number;
  /**
   * Spread of the gradient along its axis (modes 3–4). 1 = default.
   * Values below 1 pinch transitions toward the centre; above 1 soften and widen the blend.
   */
  gradientScale: number;
  /** Slide along gradient direction (logo UV); added to projection before normalizing to t. */
  gradientOffset: number;
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

/** High-frequency normal map inside the lens: UV warp and/or dirt multiply (independently ramped). */
export type DetailDistortionParams = {
  /** True when either warp strength or dirt strength uses the detail texture. */
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
