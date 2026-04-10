import {
  applyPanToRect,
  applyRendererState,
  buildRendererSyncParams,
  computeImageRect,
  rasterizeSvgForRefract,
  RefractRenderer,
  type RendererSyncSource,
} from "@refrct/core";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  syncSource: RendererSyncSource;
};

/**
 * Full-viewport WebGL hero: same renderer stack as refrct-editor, minimal interaction.
 */
export function BlodRefractHero({ syncSource }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RefractRenderer | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [viewportPx, setViewportPx] = useState({ w: 0, h: 0 });
  const imageScaleRef = useRef(1);
  const imagePanRef = useRef({ x: 0, y: 0 });

  const syncLayout = useCallback(() => {
    const canvas = canvasRef.current;
    const r = rendererRef.current;
    if (!canvas || !r || !imgDims) return;
    const base = computeImageRect(
      canvas.width,
      canvas.height,
      imgDims.w,
      imgDims.h,
      imageScaleRef.current,
    );
    const rect = applyPanToRect(
      base,
      imagePanRef.current.x,
      imagePanRef.current.y,
    );
    r.imageLayout = {
      rect,
      naturalWidth: imgDims.w,
      naturalHeight: imgDims.h,
    };
  }, [imgDims]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let renderer: RefractRenderer;
    try {
      renderer = new RefractRenderer(canvas);
    } catch {
      return;
    }
    rendererRef.current = renderer;
    renderer.startLoop();

    const ro = new ResizeObserver(() => {
      const b = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.floor(b.width));
      const h = Math.max(1, Math.floor(b.height));
      setViewportPx({ w, h });
      renderer.resize(w, h);
    });
    ro.observe(wrap);

    const b = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.floor(b.width));
    const h = Math.max(1, Math.floor(b.height));
    setViewportPx({ w, h });
    renderer.resize(w, h);

    return () => {
      ro.disconnect();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    syncLayout();
  }, [syncLayout, viewportPx]);

  useEffect(() => {
    rendererRef.current?.reuploadTextureIfNeeded();
  }, [viewportPx]);

  const svgUrl = syncSource.svgSourceUrl;
  useEffect(() => {
    if (!svgUrl) {
      setImgDims(null);
      rendererRef.current?.clearImage();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const r = rendererRef.current;
      const canvas = canvasRef.current;
      if (!r || !canvas) return;
      const bw = Math.max(1, canvas.width);
      const bh = Math.max(1, canvas.height);
      const raster = rasterizeSvgForRefract(img, bw, bh, imageScaleRef.current);
      const iw = raster.width;
      const ih = raster.height;
      setImgDims({ w: iw, h: ih });
      const base = computeImageRect(
        bw,
        bh,
        iw,
        ih,
        imageScaleRef.current,
      );
      const rect = applyPanToRect(
        base,
        imagePanRef.current.x,
        imagePanRef.current.y,
      );
      r.setImageFromSource(raster, {
        rect,
        naturalWidth: iw,
        naturalHeight: ih,
      });
    };
    img.onerror = () => {};
    img.src = svgUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [svgUrl, viewportPx]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    applyRendererState(r, buildRendererSyncParams(syncSource));
  }, [syncSource]);

  return (
    <div ref={wrapRef} className="blod-hero__gl">
      <canvas
        ref={canvasRef}
        className="blod-hero__canvas"
        aria-hidden
      />
    </div>
  );
}
