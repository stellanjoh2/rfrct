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
