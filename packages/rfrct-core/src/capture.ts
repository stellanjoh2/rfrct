const EPS = 1e-5;

const CHROMA_EDGE = 0.13;
const ALPHA_MIN_VISIBLE = 0.015;
const ALPHA_EDGE_LO = 0.02;
const ALPHA_EDGE_HI = 0.998;

function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chromaMixFromRgb(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const chroma = mx < 1e-6 ? 0 : (mx - mn) / mx;
  return Math.min(1, chroma / CHROMA_EDGE);
}

function blendLumAndMaxAlpha(
  aLum: number,
  aMax: number,
  chromaMix: number,
): number {
  const alpha = aLum * (1 - chromaMix) + aMax * chromaMix;
  return Math.min(1, Math.max(0, alpha));
}

function edgeHardenAlpha(alpha: number, gamma: number): number {
  if (alpha > ALPHA_EDGE_LO && alpha < ALPHA_EDGE_HI) {
    alpha = 1 - (1 - alpha) ** gamma;
  }
  return Math.min(1, Math.max(0, alpha));
}

/** Dark foreground on light background (e.g. black on white). */
function alphaLightFgOnLightBg(
  r: number,
  g: number,
  b: number,
  Br: number,
  Bg: number,
  Bb: number,
  bgLum: number,
): { aLum: number; aMax: number } {
  const aR = 1 - r / Math.max(Br, EPS);
  const aG = 1 - g / Math.max(Bg, EPS);
  const aB = 1 - b / Math.max(Bb, EPS);
  const aMax = Math.min(1, Math.max(0, Math.max(aR, aG, aB)));
  const Lv = lum(r, g, b);
  const Lb = bgLum;
  const aLum =
    Lb > EPS ? Math.min(1, Math.max(0, 1 - Lv / Lb)) : aMax;
  return { aLum, aMax };
}

/** Light foreground on dark background (e.g. white on black). */
function alphaLightFgOnDarkBg(
  r: number,
  g: number,
  b: number,
  Br: number,
  Bg: number,
  Bb: number,
  bgLum: number,
): { aLum: number; aMax: number } {
  const Lv = lum(r, g, b);
  const Lb = bgLum;
  const aR = (r - Br) / Math.max(1 - Br, EPS);
  const aG = (g - Bg) / Math.max(1 - Bg, EPS);
  const aB = (b - Bb) / Math.max(1 - Bb, EPS);
  const aMax = Math.min(1, Math.max(0, Math.max(aR, aG, aB)));
  const aLum =
    Lb < 1 - EPS
      ? Math.min(1, Math.max(0, (Lv - Lb) / (1 - Lb)))
      : aMax;
  return { aLum, aMax };
}

function recoverForeground(
  r: number,
  g: number,
  b: number,
  alpha: number,
  Br: number,
  Bg: number,
  Bb: number,
): [number, number, number] {
  const invA = 1 / alpha;
  let fr = (r - (1 - alpha) * Br) * invA;
  let fg = (g - (1 - alpha) * Bg) * invA;
  let fb = (b - (1 - alpha) * Bb) * invA;
  fr = Math.min(1, Math.max(0, fr));
  fg = Math.min(1, Math.max(0, fg));
  fb = Math.min(1, Math.max(0, fb));
  return [fr, fg, fb];
}

function defringeDarkOnLightBg(
  fr: number,
  fg: number,
  fb: number,
  alpha: number,
  Br: number,
  Bg: number,
  Bb: number,
  lightBg: boolean,
): [number, number, number] {
  if (!lightBg || alpha <= 0.04) {
    return [fr, fg, fb];
  }
  const fgMax = Math.max(fr, fg, fb);
  const bgMax = Math.max(Br, Bg, Bb);
  if (fgMax >= bgMax * 0.9) {
    return [fr, fg, fb];
  }
  const bleed = 0.24 * (1 - alpha);
  fr -= bleed * Br;
  fg -= bleed * Bg;
  fb -= bleed * Bb;
  return [
    Math.min(1, Math.max(0, fr)),
    Math.min(1, Math.max(0, fg)),
    Math.min(1, Math.max(0, fb)),
  ];
}

function setPixelRgba(
  d: Uint8ClampedArray,
  i: number,
  fr: number,
  fg: number,
  fb: number,
  alpha: number,
): void {
  d[i] = Math.round(fr * 255);
  d[i + 1] = Math.round(fg * 255);
  d[i + 2] = Math.round(fb * 255);
  d[i + 3] = Math.round(alpha * 255);
}

function setTransparent(d: Uint8ClampedArray, i: number): void {
  d[i] = 0;
  d[i + 1] = 0;
  d[i + 2] = 0;
  d[i + 3] = 0;
}

/**
 * Straight-alpha RGBA composited over a solid background (full opacity). Used after de-matte
 * so opaque PNG exports get the same edge recovery as transparent exports.
 */
export function compositeStraightAlphaOverBackground(
  rgba: HTMLCanvasElement,
  bg: [number, number, number],
): HTMLCanvasElement {
  const w = rgba.width;
  const h = rgba.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) {
    return rgba;
  }
  const rr = Math.round(bg[0] * 255);
  const gg = Math.round(bg[1] * 255);
  const bb = Math.round(bg[2] * 255);
  ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(rgba, 0, 0);
  return out;
}

/**
 * Copies WebGL output to a 2D canvas and removes the known solid background for PNG alpha.
 * Uses de-matting: V ≈ α·F + (1−α)·B with known B, so anti-aliased edges get partial α and
 * straight RGB without baked-in background (fixes light halos on dark logos on white).
 *
 * Light bg (dark art): luminance + channel α; dark bg (light art): α from (V−B)/(1−B) so
 * white-on-black exports do not collapse to transparent.
 */
export function removeSolidBackgroundForPng(
  source: HTMLCanvasElement,
  bg: [number, number, number],
  tolerance = 0.03,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) {
    return source;
  }
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const Br = bg[0];
  const Bg = bg[1];
  const Bb = bg[2];
  const minB = Math.min(Br, Bg, Bb);
  /** Dark-on-light de-matte needs Bc > 0 in every channel. */
  const useDematte = minB > 0.02;
  /** Extra background subtraction for dark strokes on light backgrounds (reduces gray fringe). */
  const lightBg = minB > 0.18;
  /**
   * Dark ink on light paper: α ≈ 1 − V/B. Light logo on dark bg: α ≈ (V−B)/(1−B) for F≈1 — mixing
   * the two breaks white-on-black (e.g. #0a0a0a) and wipes the export to transparent.
   */
  const bgLum = lum(Br, Bg, Bb);
  const lightBackground = bgLum > 0.5;

  const tol = tolerance * 255;

  /** Slightly harden edge α to shrink semi-transparent halos (foreground recovered after). */
  const EDGE_ALPHA_GAMMA = 1.09;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;

    if (useDematte && lightBackground) {
      const { aLum, aMax } = alphaLightFgOnLightBg(r, g, b, Br, Bg, Bb, bgLum);
      const cm = chromaMixFromRgb(r, g, b);
      let alpha = blendLumAndMaxAlpha(aLum, aMax, cm);
      alpha = edgeHardenAlpha(alpha, EDGE_ALPHA_GAMMA);
      if (alpha < ALPHA_MIN_VISIBLE) {
        setTransparent(d, i);
        continue;
      }
      let [fr, fg, fb] = recoverForeground(r, g, b, alpha, Br, Bg, Bb);
      [fr, fg, fb] = defringeDarkOnLightBg(
        fr,
        fg,
        fb,
        alpha,
        Br,
        Bg,
        Bb,
        lightBg,
      );
      setPixelRgba(d, i, fr, fg, fb, alpha);
    } else if (useDematte) {
      const { aLum, aMax } = alphaLightFgOnDarkBg(r, g, b, Br, Bg, Bb, bgLum);
      const cm = chromaMixFromRgb(r, g, b);
      let alpha = blendLumAndMaxAlpha(aLum, aMax, cm);
      alpha = edgeHardenAlpha(alpha, EDGE_ALPHA_GAMMA);
      if (alpha < ALPHA_MIN_VISIBLE) {
        setTransparent(d, i);
        continue;
      }
      const [fr, fg, fb] = recoverForeground(r, g, b, alpha, Br, Bg, Bb);
      setPixelRgba(d, i, fr, fg, fb, alpha);
    } else {
      const br = Br * 255;
      const bgv = Bg * 255;
      const bb = Bb * 255;
      const dr = Math.abs(d[i] - br);
      const dg = Math.abs(d[i + 1] - bgv);
      const db = Math.abs(d[i + 2] - bb);
      if (Math.max(dr, dg, db) < tol) {
        d[i + 3] = 0;
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
      } else {
        d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/**
 * Saves the current canvas pixels as a PNG download.
 * Requires WebGL with preserveDrawingBuffer (or call right after a rendered frame).
 */
export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  basename = "rfrct",
  onComplete?: () => void,
): void {
  const name = `${basename}-${Date.now()}.png`;

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        fallbackDataUrl(canvas, name, onComplete);
        return;
      }
      triggerDownload(URL.createObjectURL(blob), name);
      onComplete?.();
    },
    "image/png",
    1,
  );
}

function fallbackDataUrl(
  canvas: HTMLCanvasElement,
  filename: string,
  onComplete?: () => void,
): void {
  try {
    const dataUrl = canvas.toDataURL("image/png");
    triggerDownload(dataUrl, filename);
  } catch {
    console.warn("Could not export canvas (tainted or unsupported).");
  } finally {
    onComplete?.();
  }
}

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (href.startsWith("blob:")) {
    setTimeout(() => URL.revokeObjectURL(href), 800);
  }
}

/**
 * Crops to the tight bounds of pixels with alpha > `alphaThreshold`, plus `marginPx`
 * for anti-aliased edges. Used after transparent “image” export so file dimensions match
 * visible artwork (not the full bleed rectangle).
 */
export function trimCanvasToAlphaBounds(
  source: HTMLCanvasElement,
  alphaThreshold = 8,
  marginPx = 2,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w < 1 || h < 1) {
    return source;
  }
  const ctx = source.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return source;
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const thr = Math.max(0, Math.min(255, alphaThreshold));
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      const a = d[row + x * 4 + 3];
      if (a > thr) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    const empty = document.createElement("canvas");
    empty.width = 1;
    empty.height = 1;
    return empty;
  }
  const m = Math.max(0, marginPx);
  minX = Math.max(0, minX - m);
  minY = Math.max(0, minY - m);
  maxX = Math.min(w - 1, maxX + m);
  maxY = Math.min(h - 1, maxY + m);
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;
  const octx = out.getContext("2d");
  if (!octx) {
    return source;
  }
  octx.drawImage(source, minX, minY, tw, th, 0, 0, tw, th);
  return out;
}

/**
 * Like {@link trimCanvasToAlphaBounds} but for an opaque RGB canvas: tight bounds where
 * any channel differs from `bg` by more than `tolerance` (linear 0–1). Used for opaque
 * “image” region exports after compositing onto the scene background.
 */
export function trimCanvasToNonBgBounds(
  source: HTMLCanvasElement,
  bg: [number, number, number],
  tolerance = 0.04,
  marginPx = 8,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w < 1 || h < 1) {
    return source;
  }
  const ctx = source.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return source;
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const Br = bg[0] * 255;
  const Bg = bg[1] * 255;
  const Bb = bg[2] * 255;
  const tol = Math.max(1, tolerance * 255);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = row + x * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      if (
        Math.abs(r - Br) > tol ||
        Math.abs(g - Bg) > tol ||
        Math.abs(b - Bb) > tol
      ) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    const empty = document.createElement("canvas");
    empty.width = 1;
    empty.height = 1;
    return empty;
  }
  const m = Math.max(0, marginPx);
  minX = Math.max(0, minX - m);
  minY = Math.max(0, minY - m);
  maxX = Math.min(w - 1, maxX + m);
  maxY = Math.min(h - 1, maxY + m);
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;
  const octx = out.getContext("2d");
  if (!octx) {
    return source;
  }
  octx.drawImage(source, minX, minY, tw, th, 0, 0, tw, th);
  return out;
}
