import type { ShapeMode } from "../../refract/RefractRenderer";

export type LensSectionProps = {
  shapeMode: ShapeMode;
  setShapeMode: (v: ShapeMode) => void;
  blobSize: number;
  setBlobSize: (v: number) => void;
  pauseAnimation: boolean;
  setPauseAnimation: (v: boolean) => void;
  blobSpeed: number;
  setBlobSpeed: (v: number) => void;
  waveFreq: number;
  setWaveFreq: (v: number) => void;
  waveAmp: number;
  setWaveAmp: (v: number) => void;
  refract: number;
  setRefract: (v: number) => void;
  edgeSoft: number;
  setEdgeSoft: (v: number) => void;
};

export function LensSection({
  shapeMode,
  setShapeMode,
  blobSize,
  setBlobSize,
  pauseAnimation,
  setPauseAnimation,
  blobSpeed,
  setBlobSpeed,
  waveFreq,
  setWaveFreq,
  waveAmp,
  setWaveAmp,
  refract,
  setRefract,
  edgeSoft,
  setEdgeSoft,
}: LensSectionProps) {
  return (
    <>
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
            <span className="val">
              {pauseAnimation ? "paused" : `${blobSpeed.toFixed(2)}×`}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={blobSpeed}
            onChange={(e) => setBlobSpeed(Number(e.target.value))}
          />
        </div>
        <div className="field field--checkbox">
          <label className="field-checkbox-label">
            <input
              type="checkbox"
              checked={pauseAnimation}
              onChange={(e) => setPauseAnimation(e.target.checked)}
              aria-label="Pause animation"
            />
            Pause animation
          </label>
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
            max={0.08}
            step={0.001}
            value={edgeSoft}
            onChange={(e) => setEdgeSoft(Number(e.target.value))}
          />
        </div>
      </section>
    </>
  );
}
