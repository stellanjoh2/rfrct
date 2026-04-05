import { useCallback, useEffect, useRef, useState } from "react";
import { downloadCanvasAsPng } from "./capture";
import { applyPanToRect, computeImageRect } from "./refract/layout";
import { RefractRenderer, type ShapeMode } from "./refract/RefractRenderer";
import {
  computeSvgRasterDimensions,
  isSvgFile,
  rasterizeToCanvas,
} from "./refract/svgRaster";

function parseHexColor(hex: string): [number, number, number, number] {
  const h = hex.replace(/^#/, "");
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return [r, g, b, 1];
  }
  return [1, 1, 1, 1];
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RefractRenderer | null>(null);

  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  /** Object URL for SVG; kept so we can re-rasterize at higher res on resize / scale. */
  const [svgSourceUrl, setSvgSourceUrl] = useState<string | null>(null);
  const [viewportPx, setViewportPx] = useState({ w: 0, h: 0 });

  const [bgHex, setBgHex] = useState("#ffffff");
  const [imageScale, setImageScale] = useState(1);
  const imageScaleRef = useRef(1);
  imageScaleRef.current = imageScale;
  /** Normalized UV pan offset (applied on top of centered contain rect). */
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const imagePanRef = useRef(imagePan);
  imagePanRef.current = imagePan;
  const [blobSize, setBlobSize] = useState(0.22);
  /** Animation speed for blob wobble (1 = default). */
  const [blobSpeed, setBlobSpeed] = useState(1);
  const [waveFreq, setWaveFreq] = useState(5);
  const [waveAmp, setWaveAmp] = useState(0.16);
  const [refract, setRefract] = useState(0.12);
  const [edgeSoft, setEdgeSoft] = useState(0.012);
  /** Screen-space px: softens detail inside the refracted region (works with chroma). */
  const [frostBlur, setFrostBlur] = useState(2);
  /** 1=9 / 2=25 / 3=49 texture taps for frost blur kernel. */
  const [blurQuality, setBlurQuality] = useState(1);
  const [chroma, setChroma] = useState(0);
  const [shapeMode, setShapeMode] = useState<ShapeMode>(0);

  const blobCenterRef = useRef({ x: 0.5, y: 0.5 });
  /** none | pan (left) | fx (right, blob) */
  const dragModeRef = useRef<"none" | "pan" | "fx">("none");
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [pointerDrag, setPointerDrag] = useState<"pan" | "fx" | null>(null);

  const [uiVisible, setUiVisible] = useState(true);

  const captureScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    const r = rendererRef.current;
    if (!canvas || !r) return;
    r.requestDraw();
    requestAnimationFrame(() => {
      downloadCanvasAsPng(canvas);
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setUiVisible((v) => !v);
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        captureScreenshot();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureScreenshot]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.00115;
      const factor = Math.exp(-e.deltaY * zoomIntensity);
      setImageScale((s) => Math.min(3, Math.max(0.25, s * factor)));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
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

    const renderer = new RefractRenderer(canvas);
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
    const c = parseHexColor(bgHex);
    r.bgColor = [c[0], c[1], c[2], c[3]];
  }, [bgHex]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.blob.radius = blobSize;
    r.blob.speed = blobSpeed;
    r.blob.waveFreq = waveFreq;
    r.blob.waveAmp = waveAmp;
    r.blob.refractStrength = refract;
    r.blob.edgeSoftness = edgeSoft;
    r.blob.frostBlur = frostBlur;
    r.blob.blurQuality = blurQuality;
    r.blob.chroma = chroma;
    r.blob.shapeMode = shapeMode;
    r.blob.centerX = blobCenterRef.current.x;
    r.blob.centerY = blobCenterRef.current.y;
  }, [
    blobSize,
    blobSpeed,
    waveFreq,
    waveAmp,
    refract,
    edgeSoft,
    frostBlur,
    blurQuality,
    chroma,
    shapeMode,
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
        imageScale,
      );
      const raster = rasterizeToCanvas(img, w, h);
      setImgDims({ w, h });
      const base = computeImageRect(bw, bh, w, h, imageScale);
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
  }, [svgSourceUrl, viewportPx, imageScale]);

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
      const x = (e.clientX - bounds.left) / cw;
      const y = 1 - (e.clientY - bounds.top) / ch;
      blobCenterRef.current = { x, y };
      r.blob.centerX = x;
      r.blob.centerY = y;
    }
  };

  const onCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  return (
    <div className="app">
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

        <aside
          className={`glass-sidebar panel ${uiVisible ? "" : "glass-sidebar--hidden"}`}
          aria-hidden={!uiVisible}
          aria-label="Settings"
        >
          <p className="sidebar-brand">Refrct</p>

          <div className="upload-block">
            <label className="file-btn">
              Upload image
              <input
                type="file"
                accept="image/*,.svg+xml"
                onChange={onFile}
                aria-label="Upload raster or SVG image"
              />
            </label>
            <span className="hint">
              Left drag: pan image · Right drag: move lens · Wheel: zoom
            </span>
          </div>

          <h2>Appearance</h2>
          <section>
            <div className="field">
              <label>
                Background
                <span className="val">{bgHex}</span>
              </label>
              <div className="row">
                <input
                  type="color"
                  value={bgHex}
                  onChange={(e) => setBgHex(e.target.value)}
                  aria-label="Background color"
                />
                <input
                  type="text"
                  value={bgHex}
                  onChange={(e) => setBgHex(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="field">
              <label>
                Image scale
                <span className="val">{imageScale.toFixed(2)}×</span>
              </label>
              <input
                type="range"
                min={0.25}
                max={3}
                step={0.01}
                value={imageScale}
                onChange={(e) => setImageScale(Number(e.target.value))}
              />
              <p className="field-micro">Scroll wheel on canvas</p>
            </div>
          </section>

          <h2>Lens</h2>
          <section>
            <div className="field">
              <label htmlFor="shape-mode">Shape</label>
              <select
                id="shape-mode"
                className="field-select"
                value={shapeMode}
                onChange={(e) =>
                  setShapeMode(Number(e.target.value) as ShapeMode)
                }
                aria-label="Refracting shape"
              >
                <option value={0}>Blob</option>
                <option value={1}>Cube (3D)</option>
                <option value={2}>Metaballs</option>
              </select>
            </div>
            <div className="field">
              <label>
                Size
                <span className="val">{blobSize.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0.08}
                max={1}
                step={0.005}
                value={blobSize}
                onChange={(e) => setBlobSize(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>
                Animation speed
                <span className="val">{blobSpeed.toFixed(2)}×</span>
              </label>
              <input
                type="range"
                min={0}
                max={3}
                step={0.05}
                value={blobSpeed}
                onChange={(e) => setBlobSpeed(Number(e.target.value))}
              />
              <p className="field-micro">
                Wobble (blob), rotation (cube), or orbits (metaballs)
              </p>
            </div>
            {shapeMode === 0 && (
              <>
                <div className="field">
                  <label>
                    Wave frequency
                    <span className="val">{waveFreq.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={16}
                    step={0.5}
                    value={waveFreq}
                    onChange={(e) => setWaveFreq(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label>
                    Wave strength
                    <span className="val">{waveAmp.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={0.55}
                    step={0.01}
                    value={waveAmp}
                    onChange={(e) => setWaveAmp(Number(e.target.value))}
                  />
                </div>
              </>
            )}
            <div className="field">
              <label>
                Refraction
                <span className="val">{refract.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={0.35}
                step={0.005}
                value={refract}
                onChange={(e) => setRefract(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>
                Edge softness
                <span className="val">{edgeSoft.toFixed(3)}</span>
              </label>
              <input
                type="range"
                min={0.004}
                max={0.04}
                step={0.001}
                value={edgeSoft}
                onChange={(e) => setEdgeSoft(Number(e.target.value))}
              />
            </div>
          </section>

          <h2>Effects</h2>
          <section>
            <div className="field">
              <label>
                Lens blur (frost)
                <span className="val">{frostBlur.toFixed(1)} px</span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                step={0.25}
                value={frostBlur}
                onChange={(e) => setFrostBlur(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>
                Blur samples
                <span className="val">
                  {blurQuality === 1 ? "9" : blurQuality === 2 ? "25" : "49"}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={1}
                value={blurQuality}
                onChange={(e) => setBlurQuality(Number(e.target.value))}
                aria-label="Frost blur kernel quality"
              />
              <p className="field-micro">
                Binomial kernel: fast / balanced / soft. Chromatic aberration ×3 reads.
              </p>
            </div>
            <div className="field">
              <label>
                Chromatic aberration
                <span className="val">{chroma.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={chroma}
                onChange={(e) => setChroma(Number(e.target.value))}
              />
            </div>
            <p className="note">
              Edge AA + lens blur stack with refraction; add dispersion or a second blob later.
            </p>
            <span className="fx-tag">FX pipeline ready for extensions</span>
          </section>

          <p className="shortcut-hint">
            <kbd>F</kbd> hide / show panel · <kbd>C</kbd> PNG screenshot (viewport)
          </p>
        </aside>
      </div>
    </div>
  );
}
