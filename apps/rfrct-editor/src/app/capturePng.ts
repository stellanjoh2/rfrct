export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  basename: string,
): void {
  const name = `${basename}-${Date.now()}.png`;
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 800);
    },
    "image/png",
    1,
  );
}

export async function captureExactViewportPng(
  viewportEl: HTMLElement,
  basename: string,
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const capture = await html2canvas(viewportEl, {
    backgroundColor: null,
    useCORS: true,
    logging: false,
    scale: Math.max(1, window.devicePixelRatio || 1),
  });
  downloadCanvasAsPng(capture, basename);
}
