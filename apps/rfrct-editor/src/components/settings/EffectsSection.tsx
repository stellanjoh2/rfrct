export type EffectsSectionProps = {
  globalHueShift: number;
  setGlobalHueShift: (v: number) => void;
  frostBlur: number;
  setFrostBlur: (v: number) => void;
  blurQuality: number;
  setBlurQuality: (v: number) => void;
  chroma: number;
  setChroma: (v: number) => void;
  grainStrength: number;
  setGrainStrength: (v: number) => void;
};

export function EffectsSection({
  globalHueShift,
  setGlobalHueShift,
  frostBlur,
  setFrostBlur,
  blurQuality,
  setBlurQuality,
  chroma,
  setChroma,
  grainStrength,
  setGrainStrength,
}: EffectsSectionProps) {
  return (
    <>
      <h2>Effects</h2>
      <section>
        <div className="field">
          <label>
            Global hue
            <span className="val">{Math.round(globalHueShift)}°</span>
          </label>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={globalHueShift}
            onChange={(e) => setGlobalHueShift(Number(e.target.value))}
            aria-label="Global hue shift in degrees"
          />
        </div>
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
              {blurQuality === 1
                ? "25"
                : blurQuality === 2
                  ? "49"
                  : blurQuality === 3
                    ? "121"
                    : blurQuality === 4
                      ? "225"
                      : "529"}
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={blurQuality}
            onChange={(e) => setBlurQuality(Number(e.target.value))}
            aria-label="Frost blur kernel quality"
          />
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
        <div className="field">
          <label>
            Grain
            <span className="val">{grainStrength.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={grainStrength}
            onChange={(e) => setGrainStrength(Number(e.target.value))}
            aria-label="Film grain overlay strength"
          />
        </div>
      </section>
    </>
  );
}
