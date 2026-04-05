/** 0 = blob, 1 = 3D cube slice, 2 = metaballs */
export type ShapeMode = 0 | 1 | 2;

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
