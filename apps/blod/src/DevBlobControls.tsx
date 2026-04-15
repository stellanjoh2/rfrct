import type { FilterMode, RendererSyncSource, ShapeMode } from "@refrct/core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createDefaultHeroSync,
  HERO_DEFAULT_IMAGE_SCALE,
  HERO_DEFAULT_SVG_URL,
} from "./createDefaultHeroSync";

/** Revoke blob URLs after navigation away so in-flight Image loads can finish. */
const BLOB_REVOKE_MS = 500;

function coalesceSync(sync: RendererSyncSource): RendererSyncSource {
  const base = createDefaultHeroSync();
  const out: RendererSyncSource = { ...base };
  for (const key of Object.keys(sync) as (keyof RendererSyncSource)[]) {
    const v = sync[key];
    if (v !== undefined) {
      (out as Record<string, unknown>)[key as string] = v;
    }
  }
  return out;
}

type Props = {
  sync: RendererSyncSource;
  onChange: (patch: Partial<RendererSyncSource>) => void;
  imageScale: number;
  onImageScaleChange: (v: number) => void;
  open: boolean;
};

/** Dev-only: mirrors refrct-editor panels except mic, VJ, and video backdrop. */
export function DevBlobControls({
  sync,
  onChange,
  imageScale,
  onImageScaleChange,
  open,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      const u = blobUrlRef.current;
      blobUrlRef.current = null;
      if (u) window.setTimeout(() => URL.revokeObjectURL(u), BLOB_REVOKE_MS);
    };
  }, []);

  const onSvgFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".svg") &&
      file.type !== "image/svg+xml"
    ) {
      return;
    }
    const prev = blobUrlRef.current;
    blobUrlRef.current = URL.createObjectURL(file);
    onChange({ svgSourceUrl: blobUrlRef.current });
    if (prev) window.setTimeout(() => URL.revokeObjectURL(prev), BLOB_REVOKE_MS);
  };

  const resetSvg = () => {
    const prev = blobUrlRef.current;
    blobUrlRef.current = null;
    onChange({ svgSourceUrl: HERO_DEFAULT_SVG_URL });
    if (prev) window.setTimeout(() => URL.revokeObjectURL(prev), BLOB_REVOKE_MS);
  };

  const s = useMemo(() => coalesceSync(sync), [sync]);
  const safeScale = Number.isFinite(imageScale) ? imageScale : HERO_DEFAULT_IMAGE_SCALE;

  const exportText = useMemo(() => {
    const payload = {
      blodArtDirectionExportVersion: 1,
      exportedAt: new Date().toISOString(),
      imageScale: safeScale,
      sync: coalesceSync(sync),
    };
    return JSON.stringify(payload, null, 2);
  }, [sync, safeScale]);

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
    } catch {
      /* clipboard may be blocked; user can still select the textarea */
    }
  };

  const showWaves = s.shapeMode === 0 || s.shapeMode === 3;
  const filterOff = s.filterMode === 0;
  const dirtHex = s.detailDirtHex ?? "#665648";
  const bgHex = s.bgHex || "#000000";

  return (
    <aside
      className={`blod-dev-panel${open ? "" : " blod-dev-panel--hidden"}`}
      aria-label="Blob art direction (dev only)"
      aria-hidden={!open}
    >
      <header className="blod-dev-panel__head">
        <strong>Art direction</strong>
        <span className="blod-dev-panel__badge">DEV</span>
        <span className="blod-dev-panel__kbd" title="Toggle panel">
          P
        </span>
      </header>

      <details className="blod-dev-details" open>
        <summary>Appearance</summary>
        <label className="blod-dev-field">
          <span>Background {bgHex}</span>
          <div className="blod-dev-row">
            <input
              type="color"
              value={bgHex}
              onChange={(e) => onChange({ bgHex: e.target.value })}
            />
            <input
              type="text"
              value={bgHex}
              spellCheck={false}
              onChange={(e) => onChange({ bgHex: e.target.value })}
              aria-label="Background hex"
            />
          </div>
        </label>
        <label className="blod-dev-field">
          <span>Image scale {safeScale.toFixed(2)}×</span>
          <input
            type="range"
            min={0.25}
            max={20}
            step={0.01}
            value={safeScale}
            onChange={(e) => onImageScaleChange(Number(e.target.value))}
          />
        </label>
        {s.svgSourceUrl ? (
          <>
            <label className="blod-dev-field">
              <span>SVG color</span>
              <select
                value={s.svgTintMode}
                onChange={(e) =>
                  onChange({
                    svgTintMode: e.target.value as RendererSyncSource["svgTintMode"],
                  })
                }
              >
                <option value="original">Original</option>
                <option value="multiply">Tint (multiply)</option>
                <option value="replace">Fill (replace)</option>
              </select>
            </label>
            {s.svgTintMode !== "original" ? (
              <label className="blod-dev-field">
                <span>Tint {s.svgTintHex}</span>
                <div className="blod-dev-row">
                  <input
                    type="color"
                    value={s.svgTintHex}
                    onChange={(e) => onChange({ svgTintHex: e.target.value })}
                  />
                  <input
                    type="text"
                    value={s.svgTintHex}
                    spellCheck={false}
                    onChange={(e) => onChange({ svgTintHex: e.target.value })}
                    aria-label="SVG tint hex"
                  />
                </div>
              </label>
            ) : null}
          </>
        ) : null}
      </details>

      <details className="blod-dev-details" open>
        <summary>Lens</summary>
        <div className="blod-dev-field">
          <span>Shape &amp; SVG file</span>
          <select
            value={s.shapeMode}
            onChange={(e) =>
              onChange({ shapeMode: Number(e.target.value) as ShapeMode })
            }
          >
            <option value={0}>Blob</option>
            <option value={1}>Cube (3D)</option>
            <option value={2}>Metaballs</option>
            <option value={3}>Water</option>
          </select>
          <div className="blod-dev-svg-actions">
            <input
              type="file"
              accept=".svg,image/svg+xml"
              onChange={(e) => onSvgFile(e.target.files)}
            />
            <button
              type="button"
              className="blod-dev-btn"
              onClick={resetSvg}
              title="Use bundled default (public/Images/blood.svg)"
            >
              Reset SVG
            </button>
          </div>
        </div>
        <label className="blod-dev-field">
          <span>Size {s.blobSize.toFixed(2)}</span>
          <input
            type="range"
            min={0.08}
            max={2}
            step={0.005}
            value={s.blobSize}
            onChange={(e) => onChange({ blobSize: Number(e.target.value) })}
          />
        </label>
        <label className="blod-dev-field">
          <span>
            Animation speed{" "}
            {s.pauseAnimation ? "(paused)" : `${s.blobSpeed.toFixed(2)}×`}
          </span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={s.blobSpeed}
            onChange={(e) => onChange({ blobSpeed: Number(e.target.value) })}
          />
        </label>
        <label className="blod-dev-field blod-dev-field--row">
          <input
            type="checkbox"
            checked={s.pauseAnimation}
            onChange={(e) => onChange({ pauseAnimation: e.target.checked })}
          />
          <span>Pause animation</span>
        </label>
        <label className="blod-dev-field blod-dev-field--row">
          <input
            type="checkbox"
            checked={s.lensMouseInput}
            onChange={(e) => onChange({ lensMouseInput: e.target.checked })}
          />
          <span>Mouse input (fluid lens)</span>
        </label>
        <label className="blod-dev-field">
          <span>Fluid density {s.fluidDensity.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={s.fluidDensity}
            onChange={(e) => onChange({ fluidDensity: Number(e.target.value) })}
            disabled={!s.lensMouseInput}
          />
        </label>
        {showWaves ? (
          <>
            <label className="blod-dev-field">
              <span>Wave frequency {s.waveFreq.toFixed(1)}</span>
              <input
                type="range"
                min={1}
                max={16}
                step={0.5}
                value={s.waveFreq}
                onChange={(e) => onChange({ waveFreq: Number(e.target.value) })}
              />
            </label>
            <label className="blod-dev-field">
              <span>Wave strength {s.waveAmp.toFixed(2)}</span>
              <input
                type="range"
                min={0}
                max={0.55}
                step={0.01}
                value={s.waveAmp}
                onChange={(e) => onChange({ waveAmp: Number(e.target.value) })}
              />
            </label>
          </>
        ) : null}
        <label className="blod-dev-field">
          <span>Refraction {s.refract.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={0.35}
            step={0.005}
            value={s.refract}
            onChange={(e) => onChange({ refract: Number(e.target.value) })}
          />
        </label>
        <label className="blod-dev-field">
          <span>Edge softness {s.edgeSoft.toFixed(3)}</span>
          <input
            type="range"
            min={0.004}
            max={0.16}
            step={0.001}
            value={s.edgeSoft}
            onChange={(e) => onChange({ edgeSoft: Number(e.target.value) })}
          />
        </label>
        <label className="blod-dev-field">
          <span>Lens center X {s.blobCenterX.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={s.blobCenterX}
            onChange={(e) =>
              onChange({ blobCenterX: Number(e.target.value) })
            }
          />
        </label>
        <label className="blod-dev-field">
          <span>Lens center Y {s.blobCenterY.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={s.blobCenterY}
            onChange={(e) =>
              onChange({ blobCenterY: Number(e.target.value) })
            }
          />
        </label>
      </details>

      <details className="blod-dev-details" open>
        <summary>Glass filter</summary>
        <label className="blod-dev-field">
          <span>Mode</span>
          <select
            value={s.filterMode}
            onChange={(e) =>
              onChange({ filterMode: Number(e.target.value) as FilterMode })
            }
          >
            <option value={0}>None</option>
            <option value={1}>Reeds — horizontal</option>
            <option value={5}>Reeds — vertical</option>
            <option value={2}>Bullseye rings</option>
            <option value={3}>Speckle grain</option>
            <option value={4}>Halftone dots</option>
            <option value={6}>Pixels - Uniform</option>
            <option value={7}>Pixels - Random</option>
            <option value={8}>Bubbles</option>
            <option value={9}>Dots</option>
          </select>
        </label>
        <label className="blod-dev-field">
          <span>Filter strength {s.filterStrength.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={s.filterStrength}
            onChange={(e) =>
              onChange({ filterStrength: Number(e.target.value) })
            }
            disabled={filterOff}
          />
        </label>
        <label className="blod-dev-field">
          <span>Filter scale {s.filterScale.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={s.filterScale}
            onChange={(e) => onChange({ filterScale: Number(e.target.value) })}
            disabled={filterOff}
          />
        </label>
        <label className="blod-dev-field">
          <span>Filter motion {s.filterMotionSpeed.toFixed(2)}×</span>
          <input
            type="range"
            min={0}
            max={6}
            step={0.05}
            value={s.filterMotionSpeed}
            onChange={(e) =>
              onChange({ filterMotionSpeed: Number(e.target.value) })
            }
            disabled={filterOff}
          />
        </label>
      </details>

      <details className="blod-dev-details" open>
        <summary>Detailed distortion</summary>
        <label className="blod-dev-field blod-dev-field--row">
          <input
            type="checkbox"
            checked={s.detailDistortionEnabled}
            onChange={(e) =>
              onChange({ detailDistortionEnabled: e.target.checked })
            }
          />
          <span>Detailed distortion</span>
        </label>
        <label className="blod-dev-field">
          <span>Detail strength {s.detailDistortionStrength.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={s.detailDistortionStrength}
            onChange={(e) =>
              onChange({ detailDistortionStrength: Number(e.target.value) })
            }
            disabled={!s.detailDistortionEnabled}
          />
        </label>
        <label className="blod-dev-field">
          <span>Detail map scale {s.detailDistortionScale.toFixed(1)}×</span>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.1}
            value={s.detailDistortionScale}
            onChange={(e) =>
              onChange({ detailDistortionScale: Number(e.target.value) })
            }
            disabled={!s.detailDistortionEnabled}
          />
        </label>
        <label className="blod-dev-field">
          <span>Dirt / stain {(s.detailDirtStrength ?? 0).toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={s.detailDirtStrength ?? 0}
            onChange={(e) =>
              onChange({ detailDirtStrength: Number(e.target.value) })
            }
            disabled={!s.detailDistortionEnabled}
          />
        </label>
        <label className="blod-dev-field">
          <span>Dirt colour {dirtHex}</span>
          <div className="blod-dev-row">
            <input
              type="color"
              value={dirtHex}
              onChange={(e) => onChange({ detailDirtHex: e.target.value })}
              disabled={!s.detailDistortionEnabled}
            />
            <input
              type="text"
              value={dirtHex}
              spellCheck={false}
              onChange={(e) => onChange({ detailDirtHex: e.target.value })}
              disabled={!s.detailDistortionEnabled}
              aria-label="Dirt colour hex"
            />
          </div>
        </label>
      </details>

      <details className="blod-dev-details" open>
        <summary>Effects</summary>
        <label className="blod-dev-field">
          <span>Global hue {Math.round(s.globalHueShift ?? 0)}°</span>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={s.globalHueShift ?? 0}
            onChange={(e) =>
              onChange({ globalHueShift: Number(e.target.value) })
            }
          />
        </label>
        <label className="blod-dev-field">
          <span>Lens blur (frost) {s.frostBlur.toFixed(1)} px</span>
          <input
            type="range"
            min={0}
            max={10}
            step={0.25}
            value={s.frostBlur}
            onChange={(e) => onChange({ frostBlur: Number(e.target.value) })}
          />
        </label>
        <label className="blod-dev-field">
          <span>
            Blur samples{" "}
            {s.blurQuality === 1
              ? "25"
              : s.blurQuality === 2
                ? "49"
                : s.blurQuality === 3
                  ? "121"
                  : s.blurQuality === 4
                    ? "225"
                    : "529"}
          </span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={s.blurQuality}
            onChange={(e) => onChange({ blurQuality: Number(e.target.value) })}
          />
        </label>
        <label className="blod-dev-field">
          <span>Chromatic aberration {s.chroma.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={s.chroma}
            onChange={(e) => onChange({ chroma: Number(e.target.value) })}
          />
        </label>
      </details>

      <details className="blod-dev-details" open>
        <summary>Bloom</summary>
        <label className="blod-dev-field">
          <span>Strength {s.bloomStrength.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={s.bloomStrength}
            onChange={(e) => onChange({ bloomStrength: Number(e.target.value) })}
          />
        </label>
        <label className="blod-dev-field">
          <span>Radius {s.bloomRadius.toFixed(2)}</span>
          <input
            type="range"
            min={0.05}
            max={2}
            step={0.05}
            value={s.bloomRadius}
            onChange={(e) => onChange({ bloomRadius: Number(e.target.value) })}
          />
        </label>
        <label className="blod-dev-field">
          <span>Threshold {s.bloomThreshold.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={s.bloomThreshold}
            onChange={(e) =>
              onChange({ bloomThreshold: Number(e.target.value) })
            }
          />
        </label>
      </details>

      <div className="blod-dev-save">
        <button
          type="button"
          className="blod-dev-btn blod-dev-btn--primary"
          onClick={() => setExportOpen((v) => !v)}
        >
          {exportOpen ? "Hide export" : "Save settings"}
        </button>
        {exportOpen ? (
          <>
            <p className="blod-dev-save__note">
              Copy this JSON and paste it in chat (or a file) to update{" "}
              <code>createDefaultHeroSync</code>, <code>HERO_DEFAULT_IMAGE_SCALE</code>, and{" "}
              <code>lockedHeroPreset</code>. If <code>svgSourceUrl</code> is a{" "}
              <code>blob:</code> URL, replace it with a path under <code>public/</code>{" "}
              before shipping.
            </p>
            <div className="blod-dev-save__actions">
              <button
                type="button"
                className="blod-dev-btn"
                onClick={() => void copyExport()}
              >
                Copy to clipboard
              </button>
            </div>
            <textarea
              className="blod-dev-export"
              readOnly
              value={exportText}
              spellCheck={false}
              aria-label="Exported art direction JSON"
              onFocus={(e) => e.target.select()}
            />
          </>
        ) : null}
      </div>

      <p className="blod-dev-hint">
        Canvas: <strong>left-drag</strong> pan image · <strong>right-drag</strong> move lens
        (when <strong>Mouse input (fluid lens)</strong> is off) · turn that on to steer the
        displacement with the cursor. <kbd>P</kbd> hides this panel. Use{" "}
        <strong>Save settings</strong> to export JSON for new defaults. Image scale is
        Blod-only — set <code>HERO_DEFAULT_IMAGE_SCALE</code> for shipped builds.
      </p>
    </aside>
  );
}
