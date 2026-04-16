export type MouseInputSectionProps = {
  lensMouseInput: boolean;
  setLensMouseInput: (v: boolean) => void;
  fluidDensity: number;
  setFluidDensity: (v: number) => void;
};

export function MouseInputSection({
  lensMouseInput,
  setLensMouseInput,
  fluidDensity,
  setFluidDensity,
}: MouseInputSectionProps) {
  return (
    <>
      <h2 title="Pointer-driven lens position with fluid lag">
        Mouse input
      </h2>
      <section>
        <div className="field field--checkbox field--audio-toggles">
          <button
            type="button"
            className={`mic-toggle ${lensMouseInput ? "mic-toggle--on" : ""}`}
            onClick={() => setLensMouseInput(!lensMouseInput)}
            aria-pressed={lensMouseInput}
            aria-label={
              lensMouseInput
                ? "Turn off mouse-driven lens"
                : "Turn on mouse-driven lens"
            }
          >
            Mouse input
          </button>
        </div>
        <div className="field">
          <label
            htmlFor="fluid-density"
            title="Higher = heavier, more sluggish liquid (slower catch-up, stronger idle drift). Lower = snappier follow."
          >
            Fluid density
            <span className="val">{fluidDensity.toFixed(2)}</span>
          </label>
          <input
            id="fluid-density"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={fluidDensity}
            onChange={(e) => setFluidDensity(Number(e.target.value))}
            disabled={!lensMouseInput}
            aria-label="Fluid density for mouse-driven lens"
          />
        </div>
      </section>
    </>
  );
}
