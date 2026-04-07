import type { Dispatch, SetStateAction } from "react";
import type { AudioInputMode } from "../../audio/micAnalyzer";

export type AudioSectionProps = {
  micDrivingRefraction: boolean;
  audioInputMode: AudioInputMode;
  setAudioInputMode: (v: AudioInputMode) => void;
  micRefractBoost: number;
  setMicRefractBoost: (v: number) => void;
  toggleMicRefraction: () => void | Promise<void>;
  micError: string | null;
  vjMode: boolean;
  setVjMode: Dispatch<SetStateAction<boolean>>;
};

export function AudioSection({
  micDrivingRefraction,
  audioInputMode,
  setAudioInputMode,
  micRefractBoost,
  setMicRefractBoost,
  toggleMicRefraction,
  micError,
  vjMode,
  setVjMode,
}: AudioSectionProps) {
  return (
    <>
      <h2>Audio</h2>
      <section>
        <div className="field">
          <label htmlFor="audio-input-mode">Source</label>
          <select
            id="audio-input-mode"
            className="field-select"
            value={audioInputMode}
            onChange={(e) =>
              setAudioInputMode(e.target.value as AudioInputMode)
            }
            disabled={micDrivingRefraction}
            aria-label="Audio input source for refraction"
          >
            <option value="mic">Microphone</option>
            <option value="display">Playback from a tab or screen</option>
          </select>
        </div>
        <div className="field field--checkbox field--audio-toggles">
          <button
            type="button"
            className={`mic-toggle ${micDrivingRefraction ? "mic-toggle--on" : ""}`}
            onClick={() => void toggleMicRefraction()}
            aria-pressed={micDrivingRefraction}
            aria-label={
              micDrivingRefraction
                ? "Stop audio-driven refraction"
                : "Start audio-driven refraction"
            }
          >
            {micDrivingRefraction ? "Stop audio" : "Start audio"}
          </button>
          <button
            type="button"
            className={`mic-toggle ${vjMode ? "mic-toggle--on" : ""}`}
            disabled={!micDrivingRefraction}
            onClick={() => setVjMode((v) => !v)}
            aria-pressed={vjMode}
            aria-label={
              micDrivingRefraction
                ? vjMode
                  ? "Turn off VJ mode"
                  : "Turn on VJ mode"
                : "Start audio to enable VJ mode"
            }
            title={
              micDrivingRefraction
                ? "Automate lens, glass, bloom, and effects from loudness (dB)"
                : "Start audio first"
            }
          >
            VJ mode
          </button>
        </div>
        {micError && (
          <p className="field-hint field-hint--error" role="status">
            {micError}
          </p>
        )}
        <p className="field-hint">
          When audio is on, glass filter strength follows loudness (0–1), scaled
          by the Lens “Filter strength” slider as the maximum.
        </p>
        <p className="field-hint">
          <strong>VJ mode</strong> (with audio running) moves the lens clockwise
          on a smooth, squircle-like path near the edges (no sharp corners). All
          other settings stay on your sliders.
        </p>
        <div className="field">
          <label title="How much live audio adds on top of the Refraction slider (when audio is running)">
            Audio boost
            <span className="val">{micRefractBoost.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={micRefractBoost}
            onChange={(e) => setMicRefractBoost(Number(e.target.value))}
          />
        </div>
        <p className="field-hint">
          Privacy: nothing is recorded, saved, or uploaded. The lens only uses a
          live loudness value from the stream.
        </p>
        <p className="field-hint">
          The browser may show a screen-share prompt because that is how it
          routes tab or system audio into the page. Video is discarded right
          away (visualizer-style, not a screen recorder).
        </p>
        <p className="field-hint">
          For music in another tab, pick that tab in the dialog and enable
          “Share tab audio” in Chrome. Requires https:// or localhost.
        </p>
      </section>
    </>
  );
}
