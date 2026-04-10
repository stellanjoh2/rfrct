import type { RendererSyncSource, ShapeMode } from "@refrct/core";

type Props = {
  sync: RendererSyncSource;
  onChange: (patch: Partial<RendererSyncSource>) => void;
};

/** Dev-only art-direction panel; omit from production builds via `App` guard. */
export function DevBlobControls({ sync, onChange }: Props) {
  return (
    <aside className="blod-dev-panel" aria-label="Blob art direction (dev only)">
      <header className="blod-dev-panel__head">
        <strong>Art direction</strong>
        <span className="blod-dev-panel__badge">DEV</span>
      </header>
      <label className="blod-dev-field">
        <span>Background</span>
        <input
          type="color"
          value={sync.bgHex}
          onChange={(e) => onChange({ bgHex: e.target.value })}
        />
      </label>
      <label className="blod-dev-field">
        <span>Blob size {sync.blobSize.toFixed(3)}</span>
        <input
          type="range"
          min={0.08}
          max={0.45}
          step={0.005}
          value={sync.blobSize}
          onChange={(e) => onChange({ blobSize: Number(e.target.value) })}
        />
      </label>
      <label className="blod-dev-field">
        <span>Refraction {sync.refract.toFixed(3)}</span>
        <input
          type="range"
          min={0}
          max={0.35}
          step={0.005}
          value={sync.refract}
          onChange={(e) => onChange({ refract: Number(e.target.value) })}
        />
      </label>
      <label className="blod-dev-field">
        <span>Wave freq {sync.waveFreq.toFixed(2)}</span>
        <input
          type="range"
          min={1}
          max={12}
          step={0.1}
          value={sync.waveFreq}
          onChange={(e) => onChange({ waveFreq: Number(e.target.value) })}
        />
      </label>
      <label className="blod-dev-field">
        <span>Wave amp {sync.waveAmp.toFixed(3)}</span>
        <input
          type="range"
          min={0.02}
          max={0.35}
          step={0.005}
          value={sync.waveAmp}
          onChange={(e) => onChange({ waveAmp: Number(e.target.value) })}
        />
      </label>
      <label className="blod-dev-field">
        <span>Edge soft {sync.edgeSoft.toFixed(4)}</span>
        <input
          type="range"
          min={0.004}
          max={0.04}
          step={0.0005}
          value={sync.edgeSoft}
          onChange={(e) => onChange({ edgeSoft: Number(e.target.value) })}
        />
      </label>
      <label className="blod-dev-field">
        <span>Frost blur {sync.frostBlur.toFixed(1)}</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.25}
          value={sync.frostBlur}
          onChange={(e) => onChange({ frostBlur: Number(e.target.value) })}
        />
      </label>
      <label className="blod-dev-field">
        <span>Chroma {sync.chroma.toFixed(3)}</span>
        <input
          type="range"
          min={0}
          max={0.35}
          step={0.005}
          value={sync.chroma}
          onChange={(e) => onChange({ chroma: Number(e.target.value) })}
        />
      </label>
      <label className="blod-dev-field">
        <span>Animation speed {sync.blobSpeed.toFixed(2)}</span>
        <input
          type="range"
          min={0}
          max={2.5}
          step={0.05}
          value={sync.blobSpeed}
          onChange={(e) => onChange({ blobSpeed: Number(e.target.value) })}
        />
      </label>
      <label className="blod-dev-field">
        <span>Shape</span>
        <select
          value={sync.shapeMode}
          onChange={(e) =>
            onChange({ shapeMode: Number(e.target.value) as ShapeMode })
          }
        >
          <option value={0}>Blob</option>
          <option value={1}>Cube slice</option>
          <option value={2}>Metaballs</option>
          <option value={3}>Water</option>
        </select>
      </label>
      <label className="blod-dev-field blod-dev-field--row">
        <input
          type="checkbox"
          checked={sync.detailDistortionEnabled}
          onChange={(e) =>
            onChange({ detailDistortionEnabled: e.target.checked })
          }
        />
        <span>Detail normal distortion</span>
      </label>
      <label className="blod-dev-field">
        <span>Detail strength {sync.detailDistortionStrength.toFixed(2)}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={sync.detailDistortionStrength}
          onChange={(e) =>
            onChange({ detailDistortionStrength: Number(e.target.value) })
          }
        />
      </label>
      <label className="blod-dev-field">
        <span>Detail scale {sync.detailDistortionScale.toFixed(2)}</span>
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.1}
          value={sync.detailDistortionScale}
          onChange={(e) =>
            onChange({ detailDistortionScale: Number(e.target.value) })
          }
        />
      </label>
      <label className="blod-dev-field">
        <span>Dirt {sync.detailDirtStrength?.toFixed(2) ?? 0}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={sync.detailDirtStrength ?? 0}
          onChange={(e) =>
            onChange({ detailDirtStrength: Number(e.target.value) })
          }
        />
      </label>
      <p className="blod-dev-hint">
        Copy tuned values into <code>createDefaultHeroSync</code> and{" "}
        <code>lockedHeroPreset.ts</code> before release.
      </p>
    </aside>
  );
}
