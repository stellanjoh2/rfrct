import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsSidebar } from "./components/settings/SettingsSidebar";
import { downloadCanvasAsPng } from "./capture";
import { Focus } from "./focus";
import {
  applyRendererState,
  buildRendererSyncParams,
  type RendererSyncSource,
} from "./refract/applyRendererState";
import { applyPanToRect, computeImageRect } from "./refract/layout";
import { RefractRenderer, type ShapeMode } from "./refract/RefractRenderer";
import {
  computeSvgRasterDimensions,
  isSvgFile,
  rasterizeToCanvas,
} from "./refract/svgRaster";

/** Pause lens shader time while scroll-zooming; resume after last wheel event. */
const ZOOM_ANIM_RESUME_MS = 120;
/** Avoid re-rasterizing SVG on every wheel tick (expensive). */
const SVG_RASTER_DEBOUNCE_MS = 200;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RefractRenderer | null>(null);

  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [svgSourceUrl, setSvgSourceUrl] = useState<string | null>(null);
  const [svgTintMode, setSvgTintMode] = useState<
    "original" | "multiply" | "replace"
  >("original");
  const [svgTintHex, setSvgTintHex] = useState("#ffffff");
  const [viewportPx, setViewportPx] = useState({ w: 0, h: 0 });

  const [bgHex, setBgHex] = useState("#ffffff");
  const [imageScale, setImageScale] = useState(1);
  const imageScaleRef = useRef(1);
  imageScaleRef.current = imageScale;
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const imagePanRef = useRef(imagePan);
  imagePanRef.current = imagePan;
  const [blobSize, setBlobSize] = useState(0.22);
  const [blobSpeed, setBlobSpeed] = useState(1);
  const [pauseAnimation, setPauseAnimation] = useState(false);
  const [waveFreq, setWaveFreq] = useState(5);
  const [waveAmp, setWaveAmp] = useState(0.16);
  const [refract, setRefract] = useState(0.12);
  const [edgeSoft, setEdgeSoft] = useState(0.012);
  const [frostBlur, setFrostBlur] = useState(2);
  const [blurQuality, setBlurQuality] = useState(1);
  const [chroma, setChroma] = useState(0);
  const [bloomStrength, setBloomStrength] = useState(0.5);
  const [bloomRadius, setBloomRadius] = useState(0.2);
  const [bloomThreshold, setBloomThreshold] = useState(0.88);
  const [shapeMode, setShapeMode] = useState<ShapeMode>(0);

  const blobCenterRef = useRef({ x: 0.5, y: 0.5 });
  const dragModeRef = useRef<"none" | "pan" | "fx">("none");
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [pointerDrag, setPointerDrag] = useState<"pan" | "fx" | null>(null);

  const [uiVisible, setUiVisible] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);

  /** Debounced scale for SVG texture resolution; layout uses live `imageScale` via syncLayout. */
  const [svgRasterScale, setSvgRasterScale] = useState(1);
  useEffect(() => {
    const t = window.setTimeout(
      () => setSvgRasterScale(imageScale),
      SVG_RASTER_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [imageScale]);

  const latestSyncRef = useRef<RendererSyncSource | null>(null);

  const captureScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    const r = rendererRef.current;
    if (!canvas || !r) return;
    r.requestDraw();
    requestAnimationFrame(() => {
      downloadCanvasAsPng(canvas);
    });
  }, []);

  const focusImage = useCallback(() => {
    if (!imgDims) return;
    const t = Focus();
    setImagePan(t.pan);
    setImageScale(t.scale);
  }, [imgDims]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']"))
        return;

      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setUiVisible((v) => !v);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        focusImage();
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        captureScreenshot();
        return;
      }
      if (e.key === " ") {
        const t = e.target as HTMLElement | null;
        if (t?.closest("button, a[href]")) return;
        e.preventDefault();
        setPauseAnimation((v) => !v);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "1") {
        e.preventDefault();
        setShapeMode(0);
        return;
      }
      if (e.key === "2") {
        e.preventDefault();
        setShapeMode(1);
        return;
      }
      if (e.key === "3") {
        e.preventDefault();
        setShapeMode(2);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureScreenshot, focusImage]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const zoomResumeTimerRef = { current: 0 as number | null };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = rendererRef.current;
      if (r) {
        r.blob.speed = 0;
      }
      if (zoomResumeTimerRef.current !== null) {
        window.clearTimeout(zoomResumeTimerRef.current);
      }
      zoomResumeTimerRef.current = window.setTimeout(() => {
        zoomResumeTimerRef.current = null;
        const rr = rendererRef.current;
        const src = latestSyncRef.current;
        if (!rr || !src) return;
        applyRendererState(
          rr,
          buildRendererSyncParams({
            ...src,
            blobCenterX: blobCenterRef.current.x,
            blobCenterY: blobCenterRef.current.y,
          }),
        );
      }, ZOOM_ANIM_RESUME_MS);

      const zoomIntensity = 0.00115;
      const factor = Math.exp(-e.deltaY * zoomIntensity);
      setImageScale((s) => Math.min(3, Math.max(0.25, s * factor)));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      if (zoomResumeTimerRef.current !== null) {
        window.clearTimeout(zoomResumeTimerRef.current);
      }
      const rr = rendererRef.current;
      const src = latestSyncRef.current;
      if (rr && src) {
        applyRendererState(
          rr,
          buildRendererSyncParams({
            ...src,
            blobCenterX: blobCenterRef.current.x,
            blobCenterY: blobCenterRef.current.y,
          }),
        );
      }
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const syncLayout = useCallback(() => {
    const canvas = canvasRef.current;
    const r = rendererRef.current;
    if (!canvas || !r || !imgDims) return;
    const base = computeImageRect(
      canvas.width,
      canvas.height,
      imgDims.w,
      imgDims.h,
      imageScale,
    );
    const rect = applyPanToRect(base, imagePan.x, imagePan.y);
    r.imageLayout = {
      rect,
      naturalWidth: imgDims.w,
      naturalHeight: imgDims.h,
    };
  }, [imgDims, imageScale, imagePan]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let renderer: RefractRenderer;
    try {
      renderer = new RefractRenderer(canvas);
    } catch (e) {
      setWebglError(
        e instanceof Error ? e.message : "WebGL2 is required for this demo.",
      );
      return;
    }
    setWebglError(null);
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
    const r = rendererRef.current;
    if (!r) return;
    applyRendererState(
      r,
      buildRendererSyncParams({
        bgHex,
        blobSize,
        pauseAnimation,
        blobSpeed,
        waveFreq,
        waveAmp,
        refract,
        edgeSoft,
        frostBlur,
        blurQuality,
        chroma,
        shapeMode,
        blobCenterX: blobCenterRef.current.x,
        blobCenterY: blobCenterRef.current.y,
        bloomStrength,
        bloomRadius,
        bloomThreshold,
        svgSourceUrl,
        svgTintMode,
        svgTintHex,
      }),
    );
  }, [
    bgHex,
    blobSize,
    pauseAnimation,
    blobSpeed,
    waveFreq,
    waveAmp,
    refract,
    edgeSoft,
    frostBlur,
    blurQuality,
    chroma,
    shapeMode,
    bloomStrength,
    bloomRadius,
    bloomThreshold,
    svgSourceUrl,
    svgTintMode,
    svgTintHex,
  ]);

  useEffect(() => {
    syncLayout();
  }, [syncLayout, viewportPx]);

  useEffect(() => {
    if (!svgSourceUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const r = rendererRef.current;
      const canvas = canvasRef.current;
      if (!r || !canvas) return;
      const bw = Math.max(1, canvas.width);
      const bh = Math.max(1, canvas.height);
      const { w, h } = computeSvgRasterDimensions(
        img,
        bw,
        bh,
        svgRasterScale,
      );
      const raster = rasterizeToCanvas(img, w, h);
      setImgDims({ w, h });
      const base = computeImageRect(
        bw,
        bh,
        w,
        h,
        imageScaleRef.current,
      );
      const rect = applyPanToRect(
        base,
        imagePanRef.current.x,
        imagePanRef.current.y,
      );
      r.setImageFromSource(raster, {
        rect,
        naturalWidth: w,
        naturalHeight: h,
      });
    };
    img.onerror = () => {};
    img.src = svgSourceUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [svgSourceUrl, viewportPx, svgRasterScale]);

  useEffect(() => {
    return () => {
      if (svgSourceUrl) URL.revokeObjectURL(svgSourceUrl);
    };
  }, [svgSourceUrl]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

    if (isSvgFile(file)) {
      setImagePan({ x: 0, y: 0 });
      setSvgSourceUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      return;
    }

    setSvgTintMode("original");
    setSvgSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const r = rendererRef.current;
      const canvas = canvasRef.current;
      if (!r || !canvas) {
        URL.revokeObjectURL(url);
        return;
      }
      setImagePan({ x: 0, y: 0 });
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      const base = computeImageRect(
        canvas.width,
        canvas.height,
        img.naturalWidth,
        img.naturalHeight,
        imageScaleRef.current,
      );
      const rect = applyPanToRect(base, 0, 0);
      r.setImageFromSource(img, {
        rect,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      dragModeRef.current = "pan";
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setPointerDrag("pan");
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (e.button === 2) {
      dragModeRef.current = "fx";
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setPointerDrag("fx");
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragModeRef.current = "none";
    setPointerDrag(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const mode = dragModeRef.current;
    if (mode === "none") return;
    const canvas = canvasRef.current;
    const r = rendererRef.current;
    if (!canvas || !r) return;
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
      // Delta drag (same basis as pan) so a new right-drag doesn’t snap the blob to the
      // cursor on the first move — only motion while held updates position.
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

  const sidebar = useMemo(
    () => ({
      appearance: {
        bgHex,
        setBgHex,
        imageScale,
        setImageScale,
        svgSourceUrl,
        svgTintMode,
        setSvgTintMode,
        svgTintHex,
        setSvgTintHex,
      },
      lens: {
        shapeMode,
        setShapeMode,
        blobSize,
        setBlobSize,
        pauseAnimation,
        setPauseAnimation,
        blobSpeed,
        setBlobSpeed,
        waveFreq,
        setWaveFreq,
        waveAmp,
        setWaveAmp,
        refract,
        setRefract,
        edgeSoft,
        setEdgeSoft,
      },
      bloom: {
        bloomStrength,
        setBloomStrength,
        bloomRadius,
        setBloomRadius,
        bloomThreshold,
        setBloomThreshold,
      },
      effects: {
        frostBlur,
        setFrostBlur,
        blurQuality,
        setBlurQuality,
        chroma,
        setChroma,
      },
    }),
    [
      bgHex,
      imageScale,
      svgSourceUrl,
      svgTintMode,
      svgTintHex,
      shapeMode,
      blobSize,
      pauseAnimation,
      blobSpeed,
      waveFreq,
      waveAmp,
      refract,
      edgeSoft,
      bloomStrength,
      bloomRadius,
      bloomThreshold,
      frostBlur,
      blurQuality,
      chroma,
    ],
  );

  latestSyncRef.current = {
    bgHex,
    blobSize,
    pauseAnimation,
    blobSpeed,
    waveFreq,
    waveAmp,
    refract,
    edgeSoft,
    frostBlur,
    blurQuality,
    chroma,
    shapeMode,
    blobCenterX: blobCenterRef.current.x,
    blobCenterY: blobCenterRef.current.y,
    bloomStrength,
    bloomRadius,
    bloomThreshold,
    svgSourceUrl,
    svgTintMode,
    svgTintHex,
  };

  return (
    <div className="app">
      {webglError && (
        <div className="webgl-error-banner" role="alert">
          WebGL2 required — {webglError}
        </div>
      )}
      <div className="main">
        <div className="viewport" ref={wrapRef} style={{ background: bgHex }}>
          <canvas
            ref={canvasRef}
            style={{
              cursor:
                pointerDrag === "pan"
                  ? "grabbing"
                  : pointerDrag === "fx"
                    ? "move"
                    : "grab",
            }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerUp}
            onContextMenu={onCanvasContextMenu}
          />
        </div>

        <SettingsSidebar
          uiVisible={uiVisible}
          onFile={onFile}
          appearance={sidebar.appearance}
          lens={sidebar.lens}
          bloom={sidebar.bloom}
          effects={sidebar.effects}
        />
      </div>
    </div>
  );
}
