const EPS = 1e-5;

/**
 * Copies WebGL output to a 2D canvas and removes the known solid background for PNG alpha.
 * Uses de-matting: V ≈ α·F + (1−α)·B with known B, so anti-aliased edges get partial α and
 * straight RGB without baked-in background (fixes light halos on dark logos on white).
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

  const tol = tolerance * 255;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;

    if (useDematte) {
      // V ≈ α·F + (1−α)·B. For black ink (F≈0), α_c = 1 − V_c/B_c. Using min(α_c) assumes a
      // neutral blend and strips chromatic aberration when we clamp F. For CA, channels
      // disagree; use max(α_c) = 1 − min_c(V_c/B_c) so α matches the strongest “ink” channel,
      // then recover F — keeps colored fringes instead of forcing them to black.
      const aR = 1 - r / Math.max(Br, EPS);
      const aG = 1 - g / Math.max(Bg, EPS);
      const aB = 1 - b / Math.max(Bb, EPS);
      let alpha = Math.max(aR, aG, aB);
      alpha = Math.min(1, Math.max(0, alpha));

      if (alpha < 0.02) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0;
        continue;
      }

      const invA = 1 / alpha;
      let fr = (r - (1 - alpha) * Br) * invA;
      let fg = (g - (1 - alpha) * Bg) * invA;
      let fb = (b - (1 - alpha) * Bb) * invA;
      // Keep chroma: only clamp when values are out of display range (no channel-wise clamp to 0).
      fr = Math.min(1, Math.max(0, fr));
      fg = Math.min(1, Math.max(0, fg));
      fb = Math.min(1, Math.max(0, fb));

      d[i] = Math.round(fr * 255);
      d[i + 1] = Math.round(fg * 255);
      d[i + 2] = Math.round(fb * 255);
      d[i + 3] = Math.round(alpha * 255);
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
  basename = "refrct",
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
 * `rect` uses the same normalized bottom-left UV space as `ImageRect` in layout
 * (origin bottom-left; y increases upward). The canvas bitmap uses top-left
 * origin for 2D — this maps the rect for `drawImage`.
 */
export function cropCanvasToImageRect(
  source: HTMLCanvasElement,
  rect: { x: number; y: number; w: number; h: number },
): HTMLCanvasElement {
  const W = source.width;
  const H = source.height;
  const sx = Math.max(0, Math.floor(rect.x * W));
  const sy = Math.max(0, Math.floor(H * (1.0 - rect.y - rect.h)));
  const sw = Math.max(1, Math.min(W - sx, Math.ceil(rect.w * W)));
  const sh = Math.max(1, Math.min(H - sy, Math.ceil(rect.h * H)));

  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext("2d");
  if (!ctx) {
    return source;
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return out;
}
