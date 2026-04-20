/** SVGs report small intrinsic sizes; we rasterize to a canvas sized for the viewport + scale. */

export function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

/**
 * Extra transparent margin around tight opaque bounds:
 * - Keeps anti-aliased strokes from clipping when we crop.
 * - Gives headroom so lens distortion + GL clamp-to-edge on the overlay texture samples
 *   **transparent** texels at the raster edge instead of the artwork (avoids a cardinal “tick”
 *   cross where the shape meets its axis-aligned bbox).
 */
const OPAQUE_PADDING_PX = 24;

/**
 * Texture pixel size so the on-screen footprint has enough texels (supersampled for refraction).
 * `intrinsic` overrides natural dimensions (e.g. when rasterizing a sub-rect of the SVG).
 */
export function computeSvgRasterDimensions(
  img: HTMLImageElement,
  bufferW: number,
  bufferH: number,
  imageScale: number,
  intrinsic?: { w: number; h: number },
): { w: number; h: number } {
  const iw = Math.max(1, intrinsic?.w ?? img.naturalWidth);
  const ih = Math.max(1, intrinsic?.h ?? img.naturalHeight);
  const bw = Math.max(1, bufferW);
  const bh = Math.max(1, bufferH);

  const supersample = 2.25;
  const fitScale = Math.min(bw / iw, bh / ih) * imageScale;
  let tw = iw * fitScale * supersample;
  let th = ih * fitScale * supersample;

  const maxSide = Math.max(tw, th);
  if (maxSide > 8192) {
    const k = 8192 / maxSide;
    tw *= k;
    th *= k;
  }
  const minSide = Math.min(tw, th);
  if (minSide < 256) {
    const k = 256 / minSide;
    tw *= k;
    th *= k;
  }
  const max2 = Math.max(tw, th);
  if (max2 > 8192) {
    const k = 8192 / max2;
    tw *= k;
    th *= k;
  }

  return {
    w: Math.max(1, Math.round(tw)),
    h: Math.max(1, Math.round(th)),
  };
}

export function rasterizeToCanvas(
  img: HTMLImageElement,
  w: number,
  h: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Could not get 2D context");
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function findOpaqueBounds(
  canvas: HTMLCanvasElement,
  /** Use 0 so anti-aliased edges (alpha 1–255) and faint strokes still define bounds. */
  alphaThreshold = 0,
): { x: number; y: number; w: number; h: number } | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const W = canvas.width;
  const H = canvas.height;
  if (W <= 0 || H <= 0) return null;
  const imageData = ctx.getImageData(0, 0, W, H);
  const d = imageData.data;
  let minX = W;
  let minY = H;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    for (let x = 0; x < W; x++) {
      const a = d[row + x * 4 + 3];
      if (a > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

function padBounds(
  b: { x: number; y: number; w: number; h: number },
  pad: number,
  cw: number,
  ch: number,
): { x: number; y: number; w: number; h: number } {
  const x0 = Math.max(0, b.x - pad);
  const y0 = Math.max(0, b.y - pad);
  const x1 = Math.min(cw, b.x + b.w + pad);
  const y1 = Math.min(ch, b.y + b.h + pad);
  return {
    x: x0,
    y: y0,
    w: Math.max(1, x1 - x0),
    h: Math.max(1, y1 - y0),
  };
}

function cropCanvas(
  source: HTMLCanvasElement,
  rect: { x: number; y: number; w: number; h: number },
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.floor(rect.w));
  out.height = Math.max(1, Math.floor(rect.h));
  const ctx = out.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Could not get 2D context");
  ctx.drawImage(
    source,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    0,
    0,
    out.width,
    out.height,
  );
  return out;
}

/** Clamp SVG source rect so drawImage never reads outside intrinsic dimensions (avoids empty draws). */
function clampSvgSourceRect(
  iw: number,
  ih: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const W = Math.max(1, iw);
  const H = Math.max(1, ih);
  const sxp = Math.max(0, Math.min(sx, W - 1e-6));
  const syp = Math.max(0, Math.min(sy, H - 1e-6));
  let swp = Math.max(1e-6, sw);
  let shp = Math.max(1e-6, sh);
  if (sxp + swp > W) swp = W - sxp;
  if (syp + shp > H) shp = H - syp;
  return { sx: sxp, sy: syp, sw: swp, sh: shp };
}

function rasterizeSubRect(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Could not get 2D context");
  ctx.clearRect(0, 0, dw, dh);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  return canvas;
}

/**
 * Rasterize an SVG image for the refract pipeline: trims empty margins and, when the artwork
 * only occupies a small part of the intrinsic bitmap, re-rasterizes that region at full
 * resolution so zoom still has enough texels.
 */
export function rasterizeSvgForRfrct(
  img: HTMLImageElement,
  bufferW: number,
  bufferH: number,
  imageScale: number,
): HTMLCanvasElement {
  const { w, h } = computeSvgRasterDimensions(img, bufferW, bufferH, imageScale);
  const first = rasterizeToCanvas(img, w, h);
  const bounds = findOpaqueBounds(first);
  if (!bounds) return first;

  const iw = Math.max(1, img.naturalWidth);
  const ih = Math.max(1, img.naturalHeight);
  const padded = padBounds(bounds, OPAQUE_PADDING_PX, w, h);

  const areaRatio = (padded.w * padded.h) / (w * h);
  const needsRefine =
    padded.w < w * 0.92 ||
    padded.h < h * 0.92 ||
    areaRatio < 0.82;

  if (!needsRefine) {
    if (padded.w >= w - 1 && padded.h >= h - 1) return first;
    return cropCanvas(first, padded);
  }

  let sx = (padded.x / w) * iw;
  let sy = (padded.y / h) * ih;
  let sw = Math.max(1e-6, (padded.w / w) * iw);
  let sh = Math.max(1e-6, (padded.h / h) * ih);
  ({ sx, sy, sw, sh } = clampSvgSourceRect(iw, ih, sx, sy, sw, sh));

  const { w: dw, h: dh } = computeSvgRasterDimensions(img, bufferW, bufferH, imageScale, {
    w: sw,
    h: sh,
  });
  const refined = rasterizeSubRect(img, sx, sy, sw, sh, dw, dh);
  const tight = findOpaqueBounds(refined);
  if (!tight) {
    if (padded.w >= w - 1 && padded.h >= h - 1) return first;
    return cropCanvas(first, padded);
  }
  const padded2 = padBounds(tight, OPAQUE_PADDING_PX, refined.width, refined.height);
  if (
    padded2.w >= refined.width - 1 &&
    padded2.h >= refined.height - 1
  ) {
    return refined;
  }
  return cropCanvas(refined, padded2);
}
