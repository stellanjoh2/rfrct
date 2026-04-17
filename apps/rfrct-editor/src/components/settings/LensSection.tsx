import type { FilterMode, ShapeMode } from "@rfrct/core";

export type LensSectionProps = {
  shapeMode: ShapeMode;
  setShapeMode: (v: ShapeMode) => void;
  filterMode: FilterMode;
  setFilterMode: (v: FilterMode) => void;
  filterStrength: number;
  setFilterStrength: (v: number) => void;
  filterScale: number;
  setFilterScale: (v: number) => void;
  filterMotionSpeed: number;
  setFilterMotionSpeed: (v: number) => void;
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
  detailDistortionStrength: number;
  setDetailDistortionStrength: (v: number) => void;
  detailDistortionScale: number;
  setDetailDistortionScale: (v: number) => void;
  detailDirtStrength: number;
  setDetailDirtStrength: (v: number) => void;
  detailDirtHex: string;
  setDetailDirtHex: (v: string) => void;
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
  filterMode,
  setFilterMode,
  filterStrength,
  setFilterStrength,
  filterScale,
  setFilterScale,
  filterMotionSpeed,
  setFilterMotionSpeed,
  detailDistortionStrength,
  setDetailDistortionStrength,
  detailDistortionScale,
  setDetailDistortionScale,
  detailDirtStrength,
  setDetailDirtStrength,
  detailDirtHex,
  setDetailDirtHex,
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
            <option value={3}>Water</option>
            <option value={4}>Reeds (vertical)</option>
            <option value={5}>Reeds (horizontal)</option>
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
            max={2}
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
        {(shapeMode === 0 ||
          shapeMode === 3 ||
          shapeMode === 4 ||
          shapeMode === 5) && (
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
            max={0.16}
            step={0.001}
            value={edgeSoft}
            onChange={(e) => setEdgeSoft(Number(e.target.value))}
          />
        </div>
      </section>
      <h2>Glass filter</h2>
      <section>
        <div className="field">
          <label htmlFor="filter-mode">Mode</label>
          <select
            id="filter-mode"
            className="field-select"
            value={filterMode}
            onChange={(e) =>
              setFilterMode(Number(e.target.value) as FilterMode)
            }
            aria-label="Screen-space glass filter"
          >
            <option value={0}>None</option>
            <option value={1}>Reeds - Horizontal</option>
            <option value={5}>Reeds - Vertical</option>
            <option value={10}>Reeds - Cross (fluted)</option>
            <option value={2}>Bullseye rings</option>
            <option value={3}>Speckle grain</option>
            <option value={4}>Halftone dots</option>
            <option value={6}>Pixels - Uniform</option>
            <option value={7}>Pixels - Random</option>
            <option value={8}>Bubbles</option>
            <option value={9}>Dots</option>
          </select>
        </div>
        <div className="field">
          <label>
            Filter strength
            <span className="val">{filterStrength.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={filterStrength}
            onChange={(e) => setFilterStrength(Number(e.target.value))}
            disabled={filterMode === 0}
          />
        </div>
        <div className="field">
          <label title="0 = finest / smallest, 1 = coarsest / largest (all filter modes)">
            Filter scale
            <span className="val">{filterScale.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={filterScale}
            onChange={(e) => setFilterScale(Number(e.target.value))}
            disabled={filterMode === 0}
          />
        </div>
        <div className="field">
          <label>
            Filter motion speed
            <span className="val">{filterMotionSpeed.toFixed(2)}×</span>
          </label>
          <input
            type="range"
            min={0}
            max={6}
            step={0.05}
            value={filterMotionSpeed}
            onChange={(e) => setFilterMotionSpeed(Number(e.target.value))}
            disabled={filterMode === 0}
          />
        </div>
      </section>
      <h2>Detailed distortion</h2>
      <section>
        <div className="field">
          <label htmlFor="detail-distort-strength">
            Detail strength
            <span className="val">{detailDistortionStrength.toFixed(2)}</span>
          </label>
          <input
            id="detail-distort-strength"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={detailDistortionStrength}
            onChange={(e) =>
              setDetailDistortionStrength(Number(e.target.value))
            }
            aria-label="Detailed distortion strength"
          />
        </div>
        <div className="field">
          <label
            htmlFor="detail-distort-scale"
            title="Higher = smaller, busier features (more repeats across the viewport)"
          >
            Detail map scale
            <span className="val">{detailDistortionScale.toFixed(1)}×</span>
          </label>
          <input
            id="detail-distort-scale"
            type="range"
            min={0.5}
            max={10}
            step={0.1}
            value={detailDistortionScale}
            onChange={(e) => setDetailDistortionScale(Number(e.target.value))}
            aria-label="Detailed distortion texture tiling"
          />
        </div>
        <div className="field">
          <label htmlFor="detail-dirt-strength">
            Dirt / stain
            <span className="val">{detailDirtStrength.toFixed(2)}</span>
          </label>
          <input
            id="detail-dirt-strength"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={detailDirtStrength}
            onChange={(e) => setDetailDirtStrength(Number(e.target.value))}
            aria-label="Dirt stain strength from normal map"
          />
        </div>
        <div className="field">
          <label>Dirt colour</label>
          <div className="row">
            <input
              type="color"
              value={detailDirtHex}
              onChange={(e) => setDetailDirtHex(e.target.value)}
              aria-label="Dirt multiply colour"
            />
            <input
              type="text"
              value={detailDirtHex}
              onChange={(e) => setDetailDirtHex(e.target.value)}
              spellCheck={false}
              aria-label="Dirt colour hex"
            />
          </div>
        </div>
      </section>
    </>
  );
}
