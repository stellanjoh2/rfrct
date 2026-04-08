import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SettingsSidebar } from "./components/settings/SettingsSidebar";
import { Focus } from "./focus";
import {
  applyRendererState,
  buildRendererSyncParams,
  type RendererSyncSource,
} from "./refract/applyRendererState";
import { applyPanToRect, computeImageRect } from "./refract/layout";
import {
  RefractRenderer,
  type FilterMode,
  type ShapeMode,
} from "./refract/RefractRenderer";
import { isSvgFile, rasterizeSvgForRefract } from "./refract/svgRaster";
import {
  MicAnalyzer,
  type AudioInputMode,
  audioCaptureErrorMessage,
} from "./audio/micAnalyzer";
import { applyVjDrive } from "./refract/vjDrive";
import {
  DEFAULT_PNG_EXPORT_PARAMS,
  mergePngExportParams,
} from "./export/pngExportSettings";
import type { BackdropBlendMode } from "./videoBackdrop";
import { postYoutubeMute } from "./youtube/forceMuteIframe";
import { buildYoutubeEmbedSrc, parseYoutubeVideoId } from "./youtube/embedUrl";

/** Pause lens shader time while scroll-zooming; resume after last wheel event. */
const ZOOM_ANIM_RESUME_MS = 120;
/** SVG re-raster is expensive (canvas + alpha scan + optional refine); debounce while zoom stays live via syncLayout. */
const SVG_RASTER_DEBOUNCE_MS = 320;

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
  /** Target resolution for SVG texture; debounced from imageScale so wheel-zoom stays smooth. */
  const [svgRasterScale, setSvgRasterScale] = useState(1);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSvgRasterScale(imageScale);
    }, SVG_RASTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [imageScale]);

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
  const [bloomStrength, setBloomStrength] = useState(0);
  const [bloomRadius, setBloomRadius] = useState(0.2);
  const [bloomThreshold, setBloomThreshold] = useState(0.88);
  const [shapeMode, setShapeMode] = useState<ShapeMode>(0);
  const [filterMode, setFilterMode] = useState<FilterMode>(0);
  const [filterStrength, setFilterStrength] = useState(0);
  const [filterScale, setFilterScale] = useState(0.5);
  const [filterMotionSpeed, setFilterMotionSpeed] = useState(1);

  const blobCenterRef = useRef({ x: 0.5, y: 0.5 });
  const dragModeRef = useRef<"none" | "pan" | "fx">("none");
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [pointerDrag, setPointerDrag] = useState<"pan" | "fx" | null>(null);

  const [uiVisible, setUiVisible] = useState(true);
  const [webglError, setWebglError] = useState<string | null>(null);

  const [exportTransparent, setExportTransparent] = useState(false);
  const [exportRegion, setExportRegion] = useState<"full" | "image">("full");

  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeUrlDraft, setYoutubeUrlDraft] = useState("");
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [canvasBackdropBlend, setCanvasBackdropBlend] =
    useState<BackdropBlendMode>("normal");
  const [solidOverlayHex, setSolidOverlayHex] = useState("#000000");
  const [solidOverlayOpacity, setSolidOverlayOpacity] = useState(0);
  const [solidOverlayBlend, setSolidOverlayBlend] =
    useState<BackdropBlendMode>("normal");
  const [solidOverlayVjHueShift, setSolidOverlayVjHueShift] = useState(false);
  const [solidOverlayHueAudio, setSolidOverlayHueAudio] = useState(true);
  const solidOverlayRef = useRef<HTMLDivElement>(null);
  const youtubeEmbedActive = youtubeVideoId !== null;
  const youtubeEmbedSrc = useMemo(
    () =>
      youtubeVideoId
        ? buildYoutubeEmbedSrc(youtubeVideoId, {
            pageOrigin:
              typeof window !== "undefined" ? window.location.origin : undefined,
          })
        : "",
    [youtubeVideoId],
  );

  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);

  /** Embed is mute=1; re-send mute on load and on an interval so audio never stays on. */
  useEffect(() => {
    if (!youtubeVideoId) return;
    const iframe = youtubeIframeRef.current;
    if (!iframe) return;

    const tick = () => postYoutubeMute(iframe);

    tick();
    const onLoad = () => tick();
    iframe.addEventListener("load", onLoad);
    const interval = window.setInterval(tick, 1500);

    return () => {
      iframe.removeEventListener("load", onLoad);
      window.clearInterval(interval);
    };
  }, [youtubeVideoId, youtubeEmbedSrc]);

  const [micDrivingRefraction, setMicDrivingRefraction] = useState(false);
  const [audioInputMode, setAudioInputMode] =
    useState<AudioInputMode>("mic");
  const [micRefractBoost, setMicRefractBoost] = useState(0.65);
  const [vjMode, setVjMode] = useState(false);
  const [vjDupVertical, setVjDupVertical] = useState(false);
  /** Extra vertical space between dup rows (fraction of viewport height, 0 = touching). */
  const [vjDupGap, setVjDupGap] = useState(0);
  /** Horizontal stair step per row phase (cycles every 8 rows). */
  const [vjDupHorizStep, setVjDupHorizStep] = useState(0.03);
  /** Dup stack vertical scroll (UV y / sec); independent of blob animation speed. */
  const [vjDupScrollSpeed, setVjDupScrollSpeed] = useState(0.11);
  /** VJ mode: squircle orbit radius multiplier (larger = lens travels closer to frame edges). */
  const [vjPathScale, setVjPathScale] = useState(1);
  const [vjGlassGradeMode, setVjGlassGradeMode] = useState<
    "off" | "tint" | "duotone"
  >("off");
  const [vjGlassNeonAHex, setVjGlassNeonAHex] = useState("#ff00ee");
  const [vjGlassNeonBHex, setVjGlassNeonBHex] = useState("#1a0055");
  const [vjGlassGradeIntensity, setVjGlassGradeIntensity] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const micAnalyzerRef = useRef<MicAnalyzer | null>(null);
  const micEnvelopeRef = useRef(0);

  /** VJ: CSS hue-rotate on solid overlay — slow drift + optional mic envelope. */
  useEffect(() => {
    const el = solidOverlayRef.current;
    if (!el) return;
    const run =
      solidOverlayOpacity > 0.02 &&
      solidOverlayVjHueShift &&
      vjMode;
    if (!run) {
      el.style.filter = "";
      el.style.removeProperty("will-change");
      return;
    }
    let id = 0;
    const degPerSec = 7.5;
    const envDeg = 130;
    const loop = () => {
      const t = performance.now() * 0.001;
      let deg = (t * degPerSec) % 360;
      if (solidOverlayHueAudio && micDrivingRefraction) {
        deg += micEnvelopeRef.current * envDeg;
      }
      deg = ((deg % 360) + 360) % 360;
      el.style.filter = `hue-rotate(${deg}deg)`;
      el.style.willChange = "filter";
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(id);
      el.style.filter = "";
      el.style.removeProperty("will-change");
    };
  }, [
    solidOverlayOpacity,
    solidOverlayVjHueShift,
    solidOverlayHueAudio,
    vjMode,
    micDrivingRefraction,
  ]);

  const latestSyncRef = useRef<RendererSyncSource | null>(null);

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

  const runPngExport = useCallback(
    (scale: 1 | 2) => {
      const r = rendererRef.current;
      if (!r) return;
      r.exportPng(
        mergePngExportParams(DEFAULT_PNG_EXPORT_PARAMS, {
          scale,
          transparentBackground: exportTransparent,
          region: imgDims && exportRegion === "image" ? "image" : "full",
        }),
        "refrct",
        () => {
          syncLayout();
        },
      );
    },
    [exportTransparent, exportRegion, imgDims, syncLayout],
  );

  const captureScreenshot = useCallback(() => {
    runPngExport(2);
  }, [runPngExport]);

  const focusImage = useCallback(() => {
    if (!imgDims) return;
    const t = Focus();
    setImagePan(t.pan);
    setImageScale(t.scale);
  }, [imgDims]);

  const onYoutubeApply = useCallback(() => {
    const id = parseYoutubeVideoId(youtubeUrlDraft);
    if (!id) {
      setYoutubeError("Could not read a video ID from that URL.");
      return;
    }
    setYoutubeError(null);
    setYoutubeVideoId(id);
  }, [youtubeUrlDraft]);

  const onYoutubeClear = useCallback(() => {
    setYoutubeVideoId(null);
    setYoutubeError(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;

      // Space: pause — must run before the "select blocks all shortcuts" guard, otherwise
      // focus on a <select> (e.g. after a file download) prevents unpause.
      if (e.key === " ") {
        if (el?.closest("textarea, [contenteditable='true']")) return;
        const textInput = el?.closest("input");
        if (textInput instanceof HTMLInputElement) {
          const ty = (textInput.type || "text").toLowerCase();
          if (
            ["text", "search", "email", "password", "url", "tel", "number"].includes(
              ty,
            )
          ) {
            return;
          }
        }
        if (el?.closest("button, a[href]")) return;
        e.preventDefault();
        setPauseAnimation((v) => !v);
        return;
      }

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
      if (e.key === "4") {
        e.preventDefault();
        setShapeMode(3);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureScreenshot, focusImage]);

  useEffect(() => {
    if (!imgDims) {
      setExportRegion("full");
    }
  }, [imgDims]);

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
      setImageScale((s) => Math.min(20, Math.max(0.25, s * factor)));
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
    if (micDrivingRefraction) {
      return;
    }
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
        filterMode,
        filterStrength,
        filterScale,
        filterMotionSpeed,
        blobCenterX: blobCenterRef.current.x,
        blobCenterY: blobCenterRef.current.y,
        bloomStrength,
        bloomRadius,
        bloomThreshold,
        svgSourceUrl,
        svgTintMode,
        svgTintHex,
        micDrivingRefraction,
        micRefractBoost,
        micEnvelope: 0,
        vjMode,
        vjDupVertical,
        vjDupGap,
        vjDupHorizStep,
        vjDupScrollSpeed,
        vjPathScale,
        youtubeEmbedActive,
        vjGlassGradeMode,
        vjGlassNeonAHex,
        vjGlassNeonBHex,
        vjGlassGradeIntensity,
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
    filterMode,
    filterStrength,
    filterScale,
    filterMotionSpeed,
    bloomStrength,
    bloomRadius,
    bloomThreshold,
    svgSourceUrl,
    svgTintMode,
    svgTintHex,
    micDrivingRefraction,
    micRefractBoost,
    vjMode,
    vjDupVertical,
    vjDupGap,
    vjDupHorizStep,
    vjDupScrollSpeed,
    vjPathScale,
    youtubeEmbedActive,
    vjGlassGradeMode,
    vjGlassNeonAHex,
    vjGlassNeonBHex,
    vjGlassGradeIntensity,
  ]);

  useEffect(() => {
    if (!micDrivingRefraction) {
      micEnvelopeRef.current = 0;
      return;
    }
    let id = 0;
    const loop = () => {
      const a = micAnalyzerRef.current;
      const tick = a ? a.tick() : { envelope: 0, dbNorm: 0 };
      micEnvelopeRef.current = tick.envelope;
      const r = rendererRef.current;
      const raw = latestSyncRef.current;
      if (r && raw) {
        const timeSec = performance.now() * 0.001;
        const driven =
          vjMode && micDrivingRefraction
            ? applyVjDrive(raw, timeSec)
            : raw;
        if (vjMode && micDrivingRefraction) {
          blobCenterRef.current = {
            x: driven.blobCenterX,
            y: driven.blobCenterY,
          };
        }
        applyRendererState(
          r,
          buildRendererSyncParams({
            ...driven,
            micDrivingRefraction: true,
            micRefractBoost,
            micEnvelope: tick.envelope,
          }),
        );
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [micDrivingRefraction, micRefractBoost, vjMode]);

  useEffect(() => {
    return () => {
      micAnalyzerRef.current?.stop();
      micAnalyzerRef.current = null;
    };
  }, []);

  useEffect(() => {
    syncLayout();
  }, [syncLayout, viewportPx]);

  useEffect(() => {
    rendererRef.current?.reuploadTextureIfNeeded();
  }, [viewportPx]);

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
      const raster = rasterizeSvgForRefract(
        img,
        bw,
        bh,
        imageScaleRef.current,
      );
      const w = raster.width;
      const h = raster.height;
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

  const toggleMicRefraction = useCallback(async () => {
    if (micDrivingRefraction) {
      micAnalyzerRef.current?.stop();
      micAnalyzerRef.current = null;
      micEnvelopeRef.current = 0;
      setVjMode(false);
      setVjDupVertical(false);
      setVjDupGap(0);
      setVjDupHorizStep(0.03);
      setVjDupScrollSpeed(0.11);
      setVjPathScale(1);
      setMicDrivingRefraction(false);
      setMicError(null);
      return;
    }
    const m = new MicAnalyzer();
    setMicError(null);
    try {
      await m.start(audioInputMode);
      micAnalyzerRef.current = m;
      setMicDrivingRefraction(true);
    } catch (e) {
      m.stop();
      setMicError(audioCaptureErrorMessage(audioInputMode, e));
      setMicDrivingRefraction(false);
    }
  }, [micDrivingRefraction, audioInputMode]);

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
        youtubeActive: youtubeEmbedActive,
      },
      videoBackdrop: {
        youtubeUrlDraft,
        setYoutubeUrlDraft,
        onYoutubeApply,
        onYoutubeClear,
        youtubeActive: youtubeEmbedActive,
        youtubeError,
        canvasBackdropBlend,
        setCanvasBackdropBlend,
        solidOverlayHex,
        setSolidOverlayHex,
        solidOverlayOpacity,
        setSolidOverlayOpacity,
        solidOverlayBlend,
        setSolidOverlayBlend,
        vjMode,
        solidOverlayVjHueShift,
        setSolidOverlayVjHueShift,
        solidOverlayHueAudio,
        setSolidOverlayHueAudio,
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
        filterMode,
        setFilterMode,
        filterStrength,
        setFilterStrength,
        filterScale,
        setFilterScale,
        filterMotionSpeed,
        setFilterMotionSpeed,
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
      audio: {
        micDrivingRefraction,
        audioInputMode,
        setAudioInputMode,
        micRefractBoost,
        setMicRefractBoost,
        toggleMicRefraction,
        micError,
        vjMode,
        setVjMode,
        vjDupVertical,
        setVjDupVertical,
        vjDupGap,
        setVjDupGap,
        vjDupHorizStep,
        setVjDupHorizStep,
        vjDupScrollSpeed,
        setVjDupScrollSpeed,
        vjPathScale,
        setVjPathScale,
        vjGlassGradeMode,
        setVjGlassGradeMode,
        vjGlassNeonAHex,
        setVjGlassNeonAHex,
        vjGlassNeonBHex,
        setVjGlassNeonBHex,
        vjGlassGradeIntensity,
        setVjGlassGradeIntensity,
      },
      exportSection: {
        transparentBackground: exportTransparent,
        setTransparentBackground: setExportTransparent,
        region: exportRegion,
        setRegion: setExportRegion,
        hasImage: !!imgDims,
        onExport1x: () => runPngExport(1),
        onExport2x: () => runPngExport(2),
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
      filterMode,
      filterStrength,
      filterScale,
      filterMotionSpeed,
      bloomStrength,
      bloomRadius,
      bloomThreshold,
      frostBlur,
      blurQuality,
      chroma,
      exportTransparent,
      exportRegion,
      imgDims,
      runPngExport,
      micDrivingRefraction,
      audioInputMode,
      micRefractBoost,
      toggleMicRefraction,
      micError,
      vjMode,
      vjDupVertical,
      vjDupGap,
      vjDupHorizStep,
      vjDupScrollSpeed,
      vjPathScale,
      vjGlassGradeMode,
      vjGlassNeonAHex,
      vjGlassNeonBHex,
      vjGlassGradeIntensity,
      youtubeUrlDraft,
      onYoutubeApply,
      onYoutubeClear,
      youtubeEmbedActive,
      youtubeError,
      canvasBackdropBlend,
      solidOverlayHex,
      solidOverlayOpacity,
      solidOverlayBlend,
      vjMode,
      solidOverlayVjHueShift,
      solidOverlayHueAudio,
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
    filterMode,
    filterStrength,
    filterScale,
    filterMotionSpeed,
    blobCenterX: blobCenterRef.current.x,
    blobCenterY: blobCenterRef.current.y,
    bloomStrength,
    bloomRadius,
    bloomThreshold,
    svgSourceUrl,
    svgTintMode,
    svgTintHex,
    micDrivingRefraction,
    micRefractBoost,
    micEnvelope: micDrivingRefraction ? micEnvelopeRef.current : 0,
    vjMode,
    vjDupVertical,
    vjDupGap,
    vjDupHorizStep,
    vjDupScrollSpeed,
    vjPathScale,
    youtubeEmbedActive,
    vjGlassGradeMode,
    vjGlassNeonAHex,
    vjGlassNeonBHex,
    vjGlassGradeIntensity,
  };

  return (
    <div className="app">
      {webglError && (
        <div className="webgl-error-banner" role="alert">
          WebGL2 required — {webglError}
        </div>
      )}
      <div className="main">
        <div
          className="viewport"
          ref={wrapRef}
          style={{
            background: youtubeEmbedActive ? "transparent" : bgHex,
            isolation: "isolate",
          }}
        >
          {youtubeVideoId && (
            <div className="viewport__youtube-wrap">
              <iframe
                ref={youtubeIframeRef}
                className="viewport__youtube"
                src={youtubeEmbedSrc}
                title="YouTube background"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
                allowFullScreen
              />
            </div>
          )}
          {solidOverlayOpacity > 0 && (
            <div
              ref={solidOverlayRef}
              className="viewport__solid-overlay"
              style={{
                backgroundColor: solidOverlayHex,
                opacity: solidOverlayOpacity,
                ...(solidOverlayBlend !== "normal" && {
                  mixBlendMode: solidOverlayBlend,
                }),
              }}
              aria-hidden
            />
          )}
          <canvas
            ref={canvasRef}
            tabIndex={-1}
            style={{
              cursor:
                pointerDrag === "pan"
                  ? "grabbing"
                  : pointerDrag === "fx"
                    ? "move"
                    : "grab",
              ...(canvasBackdropBlend !== "normal" && {
                mixBlendMode: canvasBackdropBlend,
              }),
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
          audio={sidebar.audio}
          videoBackdrop={sidebar.videoBackdrop}
          exportSection={sidebar.exportSection}
        />
      </div>
    </div>
  );
}
