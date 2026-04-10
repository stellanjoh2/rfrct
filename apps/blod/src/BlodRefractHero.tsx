import {
  applyPanToRect,
  applyRendererState,
  buildRendererSyncParams,
  computeImageRect,
  rasterizeSvgForRefract,
  RefractRenderer,
  stepLensMouseFluid,
  type RendererSyncSource,
} from "@refrct/core";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Props = {
  syncSource: RendererSyncSource;
  imageScale: number;
  /** Dev: persist lens center after right-drag (when mouse override is off) */
  onPatchSync?: (patch: Partial<RendererSyncSource>) => void;
};

/**
 * Full-viewport WebGL hero: same renderer stack as refrct-editor (minus mic / VJ drive).
 */
export function BlodRefractHero({
  syncSource,
  imageScale,
  onPatchSync,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RefractRenderer | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [viewportPx, setViewportPx] = useState({ w: 0, h: 0 });
  const imageScaleRef = useRef(imageScale);
  imageScaleRef.current = imageScale;
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const imagePanRef = useRef(imagePan);
  imagePanRef.current = imagePan;

  const blobCenterRef = useRef({
    x: syncSource.blobCenterX,
    y: syncSource.blobCenterY,
  });
  const dragModeRef = useRef<"none" | "pan" | "fx">("none");
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const mouseLensTargetRef = useRef({ x: 0.5, y: 0.5 });
  const mouseFluidPosRef = useRef({ x: 0.5, y: 0.5 });
  const mouseFluidVelRef = useRef({ x: 0, y: 0 });
  const mouseLoopPrevTRef = useRef(performance.now());

  useEffect(() => {
    blobCenterRef.current = {
      x: syncSource.blobCenterX,
      y: syncSource.blobCenterY,
    };
  }, [syncSource.blobCenterX, syncSource.blobCenterY]);

  useEffect(() => {
    if (!syncSource.lensMouseInput) return;
    const p = blobCenterRef.current;
    mouseLensTargetRef.current = { ...p };
    mouseFluidPosRef.current = { ...p };
    mouseFluidVelRef.current = { x: 0, y: 0 };
  }, [syncSource.lensMouseInput]);

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
    renderer.blob.centerX = blobCenterRef.current.x;
    renderer.blob.centerY = blobCenterRef.current.y;
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
  }, [syncLayout, viewportPx, imageScale, imagePan]);

  /** Only re-upload GPU texture when canvas backing size actually changes (not on spurious RO spam). */
  const lastReuploadSizeRef = useRef({ w: 0, h: 0 });
  useEffect(() => {
    const { w, h } = viewportPx;
    if (w < 1 || h < 1) return;
    const prev = lastReuploadSizeRef.current;
    if (prev.w === w && prev.h === h) return;
    lastReuploadSizeRef.current = { w, h };
    rendererRef.current?.reuploadTextureIfNeeded();
  }, [viewportPx]);

  const svgUrl = syncSource.svgSourceUrl;
  useEffect(() => {
    let cancelled = false;
    if (!svgUrl) {
      setImgDims(null);
      rendererRef.current?.clearImage();
      return;
    }
    const img = new Image();
    if (!svgUrl.startsWith("blob:") && !svgUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      if (cancelled) return;
      const r = rendererRef.current;
      const canvas = canvasRef.current;
      if (!r || !canvas) return;
      const bw = Math.max(1, canvas.width);
      const bh = Math.max(1, canvas.height);
      const raster = rasterizeSvgForRefract(
        img,
        bw,
        bh,
        imageScaleRef.current,
      );
      const iw = raster.width;
      const ih = raster.height;
      if (cancelled) return;
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
      cancelled = true;
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
    /* Do not depend on viewportPx here — that retriggers full SVG decode + rasterize on every
       resize (mobile URL bar, scrollbar), which feels like the hero “reloading” when scrolling. */
  }, [svgUrl, imageScale]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const bc = blobCenterRef.current;
    applyRendererState(
      r,
      buildRendererSyncParams({
        ...syncSource,
        blobCenterX: bc.x,
        blobCenterY: bc.y,
      }),
    );
  }, [syncSource]);

  useEffect(() => {
    if (!syncSource.lensMouseInput) return;
    let id = 0;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - mouseLoopPrevTRef.current) / 1000);
      mouseLoopPrevTRef.current = now;
      const timeSec = now * 0.001;
      const r = rendererRef.current;
      if (r) {
        const target = mouseLensTargetRef.current;
        const pos = mouseFluidPosRef.current;
        const vel = mouseFluidVelRef.current;
        const step = stepLensMouseFluid(
          dt,
          target,
          pos,
          vel,
          syncSource.fluidDensity,
          timeSec,
        );
        mouseFluidPosRef.current = { x: step.x, y: step.y };
        mouseFluidVelRef.current = { x: step.vx, y: step.vy };
        blobCenterRef.current = { x: step.x, y: step.y };
        r.blob.centerX = step.x;
        r.blob.centerY = step.y;
      }
      id = requestAnimationFrame(loop);
    };
    mouseLoopPrevTRef.current = performance.now();
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [syncSource.lensMouseInput, syncSource.fluidDensity]);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      dragModeRef.current = "pan";
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (e.button === 2) {
      if (syncSource.lensMouseInput) {
        e.preventDefault();
        return;
      }
      dragModeRef.current = "fx";
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ended = dragModeRef.current;
    dragModeRef.current = "none";
    if (ended === "fx" && onPatchSync) {
      const c = blobCenterRef.current;
      onPatchSync({ blobCenterX: c.x, blobCenterY: c.y });
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && syncSource.lensMouseInput) {
      const b = canvas.getBoundingClientRect();
      const nx = (e.clientX - b.left) / b.width;
      const ny = 1 - (e.clientY - b.top) / b.height;
      mouseLensTargetRef.current = {
        x: Math.min(1, Math.max(0, nx)),
        y: Math.min(1, Math.max(0, ny)),
      };
    }

    const mode = dragModeRef.current;
    if (mode === "none") return;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const cw = bounds.width;
    const ch = bounds.height;

    if (mode === "pan") {
      const dx = (e.clientX - lastPointerRef.current.x) / cw;
      const dy = -(e.clientY - lastPointerRef.current.y) / ch;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setImagePan((p) => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }

    if (mode === "fx") {
      if (syncSource.lensMouseInput) return;
      const r = rendererRef.current;
      if (!r) return;
      const dx = (e.clientX - lastPointerRef.current.x) / cw;
      const dy = -(e.clientY - lastPointerRef.current.y) / ch;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      const nx = Math.min(1, Math.max(0, blobCenterRef.current.x + dx));
      const ny = Math.min(1, Math.max(0, blobCenterRef.current.y + dy));
      blobCenterRef.current = { x: nx, y: ny };
      r.blob.centerX = nx;
      r.blob.centerY = ny;
    }
  };

  const onCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  return (
    <div ref={wrapRef} className="blod-hero__gl">
      <canvas
        ref={canvasRef}
        className="blod-hero__canvas"
        aria-hidden
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerMove={onPointerMove}
        onContextMenu={onCanvasContextMenu}
      />
    </div>
  );
}
