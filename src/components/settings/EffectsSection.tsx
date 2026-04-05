export type EffectsSectionProps = {
  frostBlur: number;
  setFrostBlur: (v: number) => void;
  blurQuality: number;
  setBlurQuality: (v: number) => void;
  chroma: number;
  setChroma: (v: number) => void;
};

export function EffectsSection({
  frostBlur,
  setFrostBlur,
  blurQuality,
  setBlurQuality,
  chroma,
  setChroma,
}: EffectsSectionProps) {
  return (
    <>
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
            Binomial kernel: fast / balanced / soft. Chromatic aberration ×3
            reads.
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
          Edge AA + lens blur stack with refraction; bloom lives in its own
          section above.
        </p>
        <span className="fx-tag">FX pipeline ready for extensions</span>
      </section>
    </>
  );
}
