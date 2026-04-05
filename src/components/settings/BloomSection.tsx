export type BloomSectionProps = {
  bloomStrength: number;
  setBloomStrength: (v: number) => void;
  bloomRadius: number;
  setBloomRadius: (v: number) => void;
  bloomThreshold: number;
  setBloomThreshold: (v: number) => void;
};

export function BloomSection({
  bloomStrength,
  setBloomStrength,
  bloomRadius,
  setBloomRadius,
  bloomThreshold,
  setBloomThreshold,
}: BloomSectionProps) {
  return (
    <>
      <h2>Bloom</h2>
      <section>
        <div className="field">
          <label>
            Strength
            <span className="val">{bloomStrength.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={bloomStrength}
            onChange={(e) => setBloomStrength(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>
            Radius
            <span className="val">{bloomRadius.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={bloomRadius}
            onChange={(e) => setBloomRadius(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>
            Threshold
            <span className="val">{bloomThreshold.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={bloomThreshold}
            onChange={(e) => setBloomThreshold(Number(e.target.value))}
          />
          <p className="field-micro">
            Dreams-style: higher = only brighter pixels glow (default 1). Set
            strength to 0 to disable.
          </p>
        </div>
      </section>
    </>
  );
}
