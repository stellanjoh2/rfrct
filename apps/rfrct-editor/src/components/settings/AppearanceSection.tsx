export type SvgTintModeUi =
  | "original"
  | "multiply"
  | "replace"
  | "gradient";

export type AppearanceSectionProps = {
  imageScale: number;
  setImageScale: (v: number) => void;
  svgSourceUrl: string | null;
  svgTintMode: SvgTintModeUi;
  setSvgTintMode: (v: SvgTintModeUi) => void;
  svgTintHex: string;
  setSvgTintHex: (v: string) => void;
  svgGradientBlend: "multiply" | "replace";
  setSvgGradientBlend: (v: "multiply" | "replace") => void;
  svgGradientHex2: string;
  setSvgGradientHex2: (v: string) => void;
  svgGradientHex3: string;
  setSvgGradientHex3: (v: string) => void;
  svgGradientThreeStops: boolean;
  setSvgGradientThreeStops: (v: boolean) => void;
  svgGradientAngleDeg: number;
  setSvgGradientAngleDeg: (v: number) => void;
  svgGradientScale: number;
  setSvgGradientScale: (v: number) => void;
  svgGradientPosition: number;
  setSvgGradientPosition: (v: number) => void;
};

export function AppearanceSection({
  imageScale,
  setImageScale,
  svgSourceUrl,
  svgTintMode,
  setSvgTintMode,
  svgTintHex,
  setSvgTintHex,
  svgGradientBlend,
  setSvgGradientBlend,
  svgGradientHex2,
  setSvgGradientHex2,
  svgGradientHex3,
  setSvgGradientHex3,
  svgGradientThreeStops,
  setSvgGradientThreeStops,
  svgGradientAngleDeg,
  setSvgGradientAngleDeg,
  svgGradientScale,
  setSvgGradientScale,
  svgGradientPosition,
  setSvgGradientPosition,
}: AppearanceSectionProps) {
  return (
    <section aria-label="Layer 1 options">
        <div className="field">
          <label>
            Image scale
            <span className="val">{imageScale.toFixed(2)}×</span>
          </label>
          <input
            type="range"
            min={0.25}
            max={20}
            step={0.01}
            value={imageScale}
            onChange={(e) => setImageScale(Number(e.target.value))}
          />
        </div>
        {svgSourceUrl && (
          <>
            <div className="field">
              <label htmlFor="svg-tint-mode">SVG color</label>
              <select
                id="svg-tint-mode"
                className="field-select"
                value={svgTintMode}
                onChange={(e) =>
                  setSvgTintMode(e.target.value as SvgTintModeUi)
                }
                aria-label="SVG color mode"
              >
                <option value="original">Original</option>
                <option value="multiply">Tint (multiply)</option>
                <option value="replace">Fill (replace)</option>
                <option value="gradient">Gradient</option>
              </select>
            </div>
            {svgTintMode !== "original" && svgTintMode !== "gradient" && (
              <div className="field">
                <label>
                  Tint color
                  <span className="val">{svgTintHex}</span>
                </label>
                <div className="row">
                  <input
                    type="color"
                    value={svgTintHex}
                    onChange={(e) => setSvgTintHex(e.target.value)}
                    aria-label="SVG tint color"
                  />
                  <input
                    type="text"
                    value={svgTintHex}
                    onChange={(e) => setSvgTintHex(e.target.value)}
                    spellCheck={false}
                    aria-label="SVG tint color hex"
                  />
                </div>
              </div>
            )}
            {svgTintMode === "gradient" && (
              <>
                <div className="field">
                  <label htmlFor="svg-gradient-blend">Gradient blend</label>
                  <select
                    id="svg-gradient-blend"
                    className="field-select"
                    value={svgGradientBlend}
                    onChange={(e) =>
                      setSvgGradientBlend(
                        e.target.value as "multiply" | "replace",
                      )
                    }
                    aria-label="SVG gradient blend mode"
                  >
                    <option value="multiply">Tint (multiply)</option>
                    <option value="replace">Fill (replace)</option>
                  </select>
                </div>
                <div className="field">
                  <label>
                    Color 1
                    <span className="val">{svgTintHex}</span>
                  </label>
                  <div className="row">
                    <input
                      type="color"
                      value={svgTintHex}
                      onChange={(e) => setSvgTintHex(e.target.value)}
                      aria-label="SVG gradient color 1"
                    />
                    <input
                      type="text"
                      value={svgTintHex}
                      onChange={(e) => setSvgTintHex(e.target.value)}
                      spellCheck={false}
                      aria-label="SVG gradient color 1 hex"
                    />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Color 2
                    <span className="val">{svgGradientHex2}</span>
                  </label>
                  <div className="row">
                    <input
                      type="color"
                      value={svgGradientHex2}
                      onChange={(e) => setSvgGradientHex2(e.target.value)}
                      aria-label="SVG gradient color 2"
                    />
                    <input
                      type="text"
                      value={svgGradientHex2}
                      onChange={(e) => setSvgGradientHex2(e.target.value)}
                      spellCheck={false}
                      aria-label="SVG gradient color 2 hex"
                    />
                  </div>
                </div>
                <div className="field field--checkbox">
                  <label className="field-checkbox-label">
                    <input
                      type="checkbox"
                      checked={svgGradientThreeStops}
                      onChange={(e) =>
                        setSvgGradientThreeStops(e.target.checked)
                      }
                      aria-label="Use third gradient color"
                    />
                    Third color (middle stop)
                  </label>
                </div>
                {svgGradientThreeStops && (
                  <div className="field">
                    <label>
                      Color 3
                      <span className="val">{svgGradientHex3}</span>
                    </label>
                    <div className="row">
                      <input
                        type="color"
                        value={svgGradientHex3}
                        onChange={(e) => setSvgGradientHex3(e.target.value)}
                        aria-label="SVG gradient color 3"
                      />
                      <input
                        type="text"
                        value={svgGradientHex3}
                        onChange={(e) => setSvgGradientHex3(e.target.value)}
                        spellCheck={false}
                        aria-label="SVG gradient color 3 hex"
                      />
                    </div>
                  </div>
                )}
                <div className="field">
                  <label>
                    Gradient angle
                    <span className="val">{svgGradientAngleDeg}°</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={svgGradientAngleDeg}
                    onChange={(e) =>
                      setSvgGradientAngleDeg(Number(e.target.value))
                    }
                    aria-label="SVG gradient angle in degrees"
                  />
                </div>
                <div className="field">
                  <label>
                    Gradient position
                    <span className="val">{svgGradientPosition.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    step={0.01}
                    value={svgGradientPosition}
                    onChange={(e) =>
                      setSvgGradientPosition(Number(e.target.value))
                    }
                    aria-label="SVG gradient position"
                  />
                </div>
                <div className="field">
                  <label>
                    Gradient scale
                    <span className="val">{svgGradientScale.toFixed(2)}×</span>
                  </label>
                  <input
                    type="range"
                    min={0.15}
                    max={6}
                    step={0.01}
                    value={svgGradientScale}
                    onChange={(e) =>
                      setSvgGradientScale(Number(e.target.value))
                    }
                    aria-label="SVG gradient scale"
                  />
                </div>
              </>
            )}
          </>
        )}
    </section>
  );
}
