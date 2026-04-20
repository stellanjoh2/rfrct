import type { SecondaryLayerBlendMode, SecondaryLayerTintMode } from "./secondaryLayerBlend";

export type { SecondaryLayerBlendMode, SecondaryLayerTintMode };

const BLEND_OPTIONS: { value: SecondaryLayerBlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "plus-lighter", label: "Add" },
  { value: "overlay", label: "Overlay" },
  { value: "difference", label: "Difference" },
];

export type SecondaryLayerSectionProps = {
  canUseLayer: boolean;
  layer2SourceUrl: string | null;
  layer2FileName: string | null;
  onLayer2File: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLayer2: () => void;
  layer2Scale: number;
  setLayer2Scale: (v: number) => void;
  layer2TintMode: SecondaryLayerTintMode;
  setLayer2TintMode: (v: SecondaryLayerTintMode) => void;
  layer2TintHex: string;
  setLayer2TintHex: (v: string) => void;
  layer2BlendMode: SecondaryLayerBlendMode;
  setLayer2BlendMode: (v: SecondaryLayerBlendMode) => void;
  layer2FollowDistort: boolean;
  setLayer2FollowDistort: (v: boolean) => void;
  layer2BaseOpacity: number;
  setLayer2BaseOpacity: (v: number) => void;
};

export function SecondaryLayerSection({
  canUseLayer,
  layer2SourceUrl,
  layer2FileName,
  onLayer2File,
  onRemoveLayer2,
  layer2Scale,
  setLayer2Scale,
  layer2TintMode,
  setLayer2TintMode,
  layer2TintHex,
  setLayer2TintHex,
  layer2BlendMode,
  setLayer2BlendMode,
  layer2FollowDistort,
  setLayer2FollowDistort,
  layer2BaseOpacity,
  setLayer2BaseOpacity,
}: SecondaryLayerSectionProps) {
  const disabled = !canUseLayer;
  const hasLayer = Boolean(layer2SourceUrl);

  return (
    <>
      <h2 title="Optional second artwork composited above Layer 1">
        Layer 2
      </h2>
      <section>
        <div className="field">
          <div className="row row--layer2-upload">
            <div className="upload-block upload-block--in-row">
              <div className="file-btn-wrap">
                <label
                  className={`file-btn${disabled ? " file-btn--disabled" : ""}${hasLayer ? " file-btn--has-remove" : ""}`}
                >
                  <span className="file-btn__content">
                    <span className="file-btn__name">
                      {hasLayer ? layer2FileName ?? "Layer 2 image" : "Upload image"}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/*,.svg,image/svg+xml"
                    disabled={disabled}
                    onChange={onLayer2File}
                    aria-label="Layer 2 image file"
                  />
                </label>
                {hasLayer ? (
                  <button
                    type="button"
                    className="file-btn__remove"
                    disabled={disabled}
                    onClick={onRemoveLayer2}
                    aria-label={`Remove ${layer2FileName ?? "Layer 2 image"}`}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {disabled ? (
            <p className="field-hint">
              Upload a primary image in Layer 1 first — Layer 2 shares its
              placement.
            </p>
          ) : null}
        </div>

        {hasLayer && canUseLayer ? (
          <>
            <div className="field">
              <label>
                Layer 2 scale
                <span className="val">{layer2Scale.toFixed(2)}×</span>
              </label>
              <input
                type="range"
                min={0.08}
                max={3}
                step={0.01}
                value={layer2Scale}
                onChange={(e) => setLayer2Scale(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="layer2-tint-mode">Layer 2 colour</label>
              <select
                id="layer2-tint-mode"
                className="field-select"
                value={layer2TintMode}
                onChange={(e) =>
                  setLayer2TintMode(e.target.value as SecondaryLayerTintMode)
                }
              >
                <option value="original">Original</option>
                <option value="multiply">Tint (multiply)</option>
                <option value="replace">Fill (replace)</option>
              </select>
            </div>
            {layer2TintMode !== "original" ? (
              <div className="field">
                <label>
                  {layer2TintMode === "multiply" ? "Tint" : "Fill"}
                  <span className="val">{layer2TintHex}</span>
                </label>
                <div className="row">
                  <input
                    type="color"
                    value={layer2TintHex}
                    onChange={(e) => setLayer2TintHex(e.target.value)}
                    aria-label="Layer 2 colour"
                  />
                  <input
                    type="text"
                    value={layer2TintHex}
                    onChange={(e) => setLayer2TintHex(e.target.value)}
                    spellCheck={false}
                    aria-label="Layer 2 colour hex"
                  />
                </div>
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="layer2-blend">Blend mode</label>
              <select
                id="layer2-blend"
                className="field-select"
                value={layer2BlendMode}
                onChange={(e) =>
                  setLayer2BlendMode(e.target.value as SecondaryLayerBlendMode)
                }
              >
                {BLEND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field field--checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={layer2FollowDistort}
                  onChange={(e) => setLayer2FollowDistort(e.target.checked)}
                />
                Affected by lens distortion
              </label>
              <p className="field-hint">
                Off keeps the layer visually stable while the primary logo refracts.
              </p>
            </div>
            <div className="field">
              <label>
                Layer 2 opacity
                <span className="val">{layer2BaseOpacity.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={layer2BaseOpacity}
                onChange={(e) => setLayer2BaseOpacity(Number(e.target.value))}
              />
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
