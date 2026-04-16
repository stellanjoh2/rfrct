export type AppearanceSectionProps = {
  bgHex: string;
  setBgHex: (v: string) => void;
  imageScale: number;
  setImageScale: (v: number) => void;
  svgSourceUrl: string | null;
  svgTintMode: "original" | "multiply" | "replace";
  setSvgTintMode: (v: "original" | "multiply" | "replace") => void;
  svgTintHex: string;
  setSvgTintHex: (v: string) => void;
  youtubeActive: boolean;
};

export function AppearanceSection({
  bgHex,
  setBgHex,
  imageScale,
  setImageScale,
  svgSourceUrl,
  svgTintMode,
  setSvgTintMode,
  svgTintHex,
  setSvgTintHex,
  youtubeActive,
}: AppearanceSectionProps) {
  return (
    <>
      <h2>Appearance</h2>
      <section>
        <div className="field">
          <label>
            Background
            <span className="val">{bgHex}</span>
          </label>
          {youtubeActive ? (
            <p className="field-hint">
              Hidden while Video backdrop / YouTube is active (canvas is
              transparent outside the logo).
            </p>
          ) : null}
          <div className="row">
            <input
              type="color"
              value={bgHex}
              onChange={(e) => setBgHex(e.target.value)}
              aria-label="Background color"
              disabled={youtubeActive}
            />
            <input
              type="text"
              value={bgHex}
              onChange={(e) => setBgHex(e.target.value)}
              spellCheck={false}
              disabled={youtubeActive}
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
                  setSvgTintMode(
                    e.target.value as "original" | "multiply" | "replace",
                  )
                }
                aria-label="SVG color mode"
              >
                <option value="original">Original</option>
                <option value="multiply">Tint (multiply)</option>
                <option value="replace">Fill (replace)</option>
              </select>
            </div>
            {svgTintMode !== "original" && (
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
          </>
        )}
      </section>
    </>
  );
}
