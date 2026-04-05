/** SVGs report small intrinsic sizes; we rasterize to a canvas sized for the viewport + scale. */

export function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

/**
 * Texture pixel size so the on-screen footprint has enough texels (supersampled for refraction).
 */
export function computeSvgRasterDimensions(
  img: HTMLImageElement,
  bufferW: number,
  bufferH: number,
  imageScale: number,
): { w: number; h: number } {
  const iw = Math.max(1, img.naturalWidth);
  const ih = Math.max(1, img.naturalHeight);
  const bw = Math.max(1, bufferW);
  const bh = Math.max(1, bufferH);

  const s = Math.min(bw / iw, bh / ih) * imageScale;
  const screenW = iw * s;
  const screenH = ih * s;

  const supersample = 2.25;
  let tw = Math.ceil(screenW * supersample);
  let th = Math.ceil(screenH * supersample);

  tw = Math.max(tw, Math.min(8192, Math.ceil(iw * 4)));
  th = Math.max(th, Math.min(8192, Math.ceil(ih * 4)));

  tw = Math.min(8192, Math.max(256, tw));
  th = Math.min(8192, Math.max(256, th));
  return { w: tw, h: th };
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
