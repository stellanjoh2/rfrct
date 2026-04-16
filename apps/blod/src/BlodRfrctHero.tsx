import {
  applyPanToRect,
  applyRendererState,
  buildRendererSyncParams,
  computeImageRect,
  rasterizeSvgForRfrct,
  RfrctRenderer,
  stepLensMouseFluid,
  type RendererSyncSource,
} from "@rfrct/core";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BLOD_CINEMATIC_CURTAIN_ID,
  BLOD_LOADING_CURTAIN_DONE_EVENT,
} from "./cinematicCurtain";
import { HERO_FLASH_LOGO_URL } from "./content/heroFlashLogo";

/** CSS px: shift underlay toward bottom of letterbox; scaled by canvas backing vs client size. */
const HERO_FLASH_OFFSET_DOWN_CSS_PX = 50;
/** vs default contain-fit in the shader (1.5 × 1.25) */
const HERO_FLASH_SCALE = 1.875;

/** Left/right canvas drag (pan image, move lens) — dev-only; production keeps the hero fixed. */
const HERO_CANVAS_DRAG = import.meta.env.DEV;

type Props = {
  syncSource: RendererSyncSource;
  imageScale: number;
  /** Dev: persist lens center after right-drag (when mouse override is off) */
  onPatchSync?: (patch: Partial<RendererSyncSource>) => void;
};

/**
 * Full-viewport WebGL hero: same renderer stack as rfrct-editor (minus mic / VJ drive).
 */
export function BlodRfrctHero({
  syncSource,
  imageScale,
  onPatchSync,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RfrctRenderer | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  /** Natural size of hero flash PNG (GPU underlay, same distorted UV as SVG). */
  const underlayDimsRef = useRef<{ w: number; h: number } | null>(null);
  /** CSS layout + DPR — DPR must be tracked so backing store updates when e.g. moving across monitors. */
  const [viewportPx, setViewportPx] = useState({ w: 0, h: 0, dpr: 0 });
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

  /** Mirrors `.blod-hero-spacer` IO — pause GPU when user scrolls past the first viewport. */
  const heroSpacerVisibleRef = useRef(true);

  useEffect(() => {
    blobCenterRef.current = {
      x: syncSource.blobCenterX,
      y: syncSource.blobCenterY,
    };
  }, [syncSource.blobCenterX, syncSource.blobCenterY]);

  /**
   * Once per wall-clock second: two one-frame flashes with one blank frame between
   * (on → off → on → off). Waits until the black loading curtain has finished fading out
   * so the white flash is not visible underneath it.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let rafId = 0;
    let lastSec = Math.floor(performance.now() / 1000);
    let loopStarted = false;

    const tick = (now: number) => {
      if (!heroSpacerVisibleRef.current) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const sec = Math.floor(now / 1000);
      if (sec !== lastSec) {
        lastSec = sec;
        const r = rendererRef.current;
        if (!r || !underlayDimsRef.current) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas || canvas.width < 1) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        r.underlayOpacity = 1;
        requestAnimationFrame(() => {
          const r0 = rendererRef.current;
          if (r0) r0.underlayOpacity = 0;
          requestAnimationFrame(() => {
            const r1 = rendererRef.current;
            if (r1) r1.underlayOpacity = 1;
            requestAnimationFrame(() => {
              const r2 = rendererRef.current;
              if (r2) r2.underlayOpacity = 0;
            });
          });
        });
      }
      rafId = requestAnimationFrame(tick);
    };

    const startFlashLoop = () => {
      if (loopStarted) return;
      loopStarted = true;
      rafId = requestAnimationFrame(tick);
    };

    const onCurtainDone = () => startFlashLoop();

    if (!document.getElementById(BLOD_CINEMATIC_CURTAIN_ID)) {
      startFlashLoop();
    } else {
      document.addEventListener(BLOD_LOADING_CURTAIN_DONE_EVENT, onCurtainDone, {
        once: true,
      });
    }

    return () => {
      document.removeEventListener(
        BLOD_LOADING_CURTAIN_DONE_EVENT,
        onCurtainDone,
      );
      cancelAnimationFrame(rafId);
    };
  }, []);

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
    if (!canvas || !r || !imgDims) {
      return;
    }
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
    const ud = underlayDimsRef.current;
    if (ud) {
      // Backing / CSS px for offsets — use the same `client*` box as `renderer.resize()` so the
      // ratio matches how the bitmap is displayed.
      const cssH = Math.max(
        1,
        canvas.clientHeight,
        Math.round(canvas.getBoundingClientRect().height),
      );
      const offsetDownBackingPx =
        HERO_FLASH_OFFSET_DOWN_CSS_PX * (canvas.height / cssH);
      r.syncUnderlayLayout(canvas.width, canvas.height, rect, ud.w, ud.h, {
        scale: HERO_FLASH_SCALE,
        offsetDownBackingPx,
      });
    }
  }, [imgDims]);

  /** Latest layout sync — underlay PNG often loads after SVG; refs avoid stale closures in img.onload. */
  const syncLayoutRef = useRef(syncLayout);
  syncLayoutRef.current = syncLayout;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let renderer: RfrctRenderer;
    try {
      renderer = new RfrctRenderer(canvas);
    } catch {
      return;
    }
    rendererRef.current = renderer;
    renderer.blob.centerX = blobCenterRef.current.x;
    renderer.blob.centerY = blobCenterRef.current.y;
    renderer.startLoop();

    const spacer = document.getElementById("blod-hero-spacer");
    let spacerIo: IntersectionObserver | null = null;
    if (spacer) {
      let prevVisible = true;
      spacerIo = new IntersectionObserver(
        (entries) => {
          const ren = rendererRef.current;
          if (!ren) return;
          const visible = entries[0]?.isIntersecting ?? true;
          heroSpacerVisibleRef.current = visible;
          if (prevVisible === visible) return;
          prevVisible = visible;
          if (visible) {
            ren.stopLoop();
            ren.startLoop();
          } else {
            ren.stopLoop();
          }
        },
        { threshold: 0 },
      );
      spacerIo.observe(spacer);
    }

    // Resize from the canvas’s laid-out CSS size (not wrap’s floored getBoundingClientRect),
    // so backing-store aspect matches the box the browser uses to draw the bitmap. Otherwise
    // the GL output is stretched on screen (often reads as a vertically squashed hero flash on
    // GitHub Pages / mobile WebKit).
    let alive = true;
    let resizeRaf = 0;
    const applyCanvasCssSize = () => {
      resizeRaf = 0;
      if (!alive) return;
      const cw = Math.max(1, canvas.clientWidth);
      const ch = Math.max(1, canvas.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      setViewportPx({ w: cw, h: ch, dpr });
      renderer.resize(cw, ch);
      // Same tick as backing-store update — avoids one frame (or a stuck state) where GL size and
      // `syncUnderlayLayout` / image rect disagree before React’s viewport effect runs.
      syncLayoutRef.current();
    };
    const scheduleCanvasResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(applyCanvasCssSize);
    };

    /** Fullscreen / maximize often finish layout a frame or two after ResizeObserver; window resize
     * can fire before clientWidth matches the final box. */
    const scheduleCanvasResizeSettled = () => {
      scheduleCanvasResize();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!alive) return;
          applyCanvasCssSize();
        });
      });
    };

    const onWinResize = () => scheduleCanvasResizeSettled();
    const onFullscreen = () => scheduleCanvasResizeSettled();
    window.addEventListener("resize", onWinResize);
    document.addEventListener("fullscreenchange", onFullscreen);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onWinResize);

    const ro = new ResizeObserver(() => {
      scheduleCanvasResizeSettled();
    });
    ro.observe(wrap);

    scheduleCanvasResizeSettled();

    /** First paint / late layout (mobile toolbars, fonts): RO can settle before final viewport box. */
    const onWindowLoad = () => scheduleCanvasResizeSettled();
    if (document.readyState === "complete") {
      onWindowLoad();
    } else {
      window.addEventListener("load", onWindowLoad);
    }

    return () => {
      alive = false;
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onWinResize);
      window.removeEventListener("load", onWindowLoad);
      document.removeEventListener("fullscreenchange", onFullscreen);
      vv?.removeEventListener("resize", onWinResize);
      spacerIo?.disconnect();
      ro.disconnect();
      renderer.destroy();
      rendererRef.current = null;
      heroSpacerVisibleRef.current = true;
    };
  }, []);

  useEffect(() => {
    syncLayout();
  }, [syncLayout, viewportPx, imageScale, imagePan]);

  /** Only re-upload GPU texture when canvas backing size actually changes (not on spurious RO spam). */
  const lastReuploadSizeRef = useRef({ w: 0, h: 0, dpr: 0 });
  useEffect(() => {
    const { w, h, dpr } = viewportPx;
    if (w < 1 || h < 1) return;
    const prev = lastReuploadSizeRef.current;
    if (prev.w === w && prev.h === h && prev.dpr === dpr) return;
    lastReuploadSizeRef.current = { w, h, dpr };
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
      const raster = rasterizeSvgForRfrct(
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
        transparentSceneDomUnderlay: true,
      }),
    );
  }, [syncSource]);

  /** Upload flash bitmap to GPU underlay (composited in fragment shader behind SVG). */
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    if (!HERO_FLASH_LOGO_URL.startsWith("blob:") && !HERO_FLASH_LOGO_URL.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      if (cancelled) return;
      underlayDimsRef.current = {
        w: img.naturalWidth,
        h: img.naturalHeight,
      };
      rendererRef.current?.setUnderlayFromSource(img);
      // SVG usually wins the race; if the PNG arrives second, we must run `syncUnderlayLayout`
      // or `underlayCell` stays at defaults (reads as squashed flash until the next resize).
      syncLayoutRef.current();
      requestAnimationFrame(() => {
        syncLayoutRef.current();
      });
    };
    img.onerror = () => {
      underlayDimsRef.current = null;
      rendererRef.current?.clearUnderlay();
    };
    img.src = HERO_FLASH_LOGO_URL;
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
      img.src = "";
      underlayDimsRef.current = null;
      rendererRef.current?.clearUnderlay();
    };
  }, []);

  useEffect(() => {
    if (!syncSource.lensMouseInput) return;
    let id = 0;
    const loop = () => {
      if (!heroSpacerVisibleRef.current) {
        id = requestAnimationFrame(loop);
        return;
      }
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
    if (!HERO_CANVAS_DRAG) return;
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
