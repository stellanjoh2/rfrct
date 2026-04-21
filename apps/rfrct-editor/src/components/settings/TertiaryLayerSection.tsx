import type { SecondaryLayerBlendMode, SecondaryLayerTintMode } from "./secondaryLayerBlend";

const BLEND_OPTIONS: { value: SecondaryLayerBlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "plus-lighter", label: "Add" },
  { value: "overlay", label: "Overlay" },
  { value: "difference", label: "Difference" },
];

export type TertiaryLayerSectionProps = {
  canUseLayer: boolean;
  layer3SourceUrl: string | null;
  layer3FileName: string | null;
  onLayer3File: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLayer3: () => void;
  layer3Scale: number;
  setLayer3Scale: (v: number) => void;
  layer3TintMode: SecondaryLayerTintMode;
  setLayer3TintMode: (v: SecondaryLayerTintMode) => void;
  layer3TintHex: string;
  setLayer3TintHex: (v: string) => void;
  layer3BlendMode: SecondaryLayerBlendMode;
  setLayer3BlendMode: (v: SecondaryLayerBlendMode) => void;
  layer3FollowDistort: boolean;
  setLayer3FollowDistort: (v: boolean) => void;
  layer3BaseOpacity: number;
  setLayer3BaseOpacity: (v: number) => void;
};

export function TertiaryLayerSection({
  canUseLayer,
  layer3SourceUrl,
  layer3FileName,
  onLayer3File,
  onRemoveLayer3,
  layer3Scale,
  setLayer3Scale,
  layer3TintMode,
  setLayer3TintMode,
  layer3TintHex,
  setLayer3TintHex,
  layer3BlendMode,
  setLayer3BlendMode,
  layer3FollowDistort,
  setLayer3FollowDistort,
  layer3BaseOpacity,
  setLayer3BaseOpacity,
}: TertiaryLayerSectionProps) {
  const disabled = !canUseLayer;
  const hasLayer = Boolean(layer3SourceUrl);

  return (
    <>
      <h2 title="Optional third artwork composited above Layer 2">
        Layer 3
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
                      {hasLayer ? layer3FileName ?? "Layer 3 image" : "Upload image"}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/*,.svg,image/svg+xml"
                    disabled={disabled}
                    onChange={onLayer3File}
                    aria-label="Layer 3 image file"
                  />
                </label>
                {hasLayer ? (
                  <button
                    type="button"
                    className="file-btn__remove"
                    disabled={disabled}
                    onClick={onRemoveLayer3}
                    aria-label={`Remove ${layer3FileName ?? "Layer 3 image"}`}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {hasLayer && canUseLayer ? (
          <>
            <div className="field">
              <label>
                Layer 3 scale
                <span className="val">{layer3Scale.toFixed(2)}×</span>
              </label>
              <input
                type="range"
                min={0.08}
                max={3}
                step={0.01}
                value={layer3Scale}
                onChange={(e) => setLayer3Scale(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="layer3-tint-mode">Layer 3 color</label>
              <select
                id="layer3-tint-mode"
                className="field-select"
                value={layer3TintMode}
                onChange={(e) =>
                  setLayer3TintMode(e.target.value as SecondaryLayerTintMode)
                }
              >
                <option value="original">Original</option>
                <option value="multiply">Tint (multiply)</option>
                <option value="replace">Fill (replace)</option>
              </select>
            </div>
            {layer3TintMode !== "original" ? (
              <div className="field">
                <label>
                  {layer3TintMode === "multiply" ? "Tint" : "Fill"}
                  <span className="val">{layer3TintHex}</span>
                </label>
                <div className="row">
                  <input
                    type="color"
                    value={layer3TintHex}
                    onChange={(e) => setLayer3TintHex(e.target.value)}
                    aria-label="Layer 3 color"
                  />
                  <input
                    type="text"
                    value={layer3TintHex}
                    onChange={(e) => setLayer3TintHex(e.target.value)}
                    spellCheck={false}
                    aria-label="Layer 3 color hex"
                  />
                </div>
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="layer3-blend">Blend mode</label>
              <select
                id="layer3-blend"
                className="field-select"
                value={layer3BlendMode}
                onChange={(e) =>
                  setLayer3BlendMode(e.target.value as SecondaryLayerBlendMode)
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
                  checked={layer3FollowDistort}
                  onChange={(e) => setLayer3FollowDistort(e.target.checked)}
                />
                Affected by lens distortion
              </label>
            </div>
            <div className="field">
              <label>
                Layer 3 opacity
                <span className="val">{layer3BaseOpacity.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={layer3BaseOpacity}
                onChange={(e) => setLayer3BaseOpacity(Number(e.target.value))}
              />
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
