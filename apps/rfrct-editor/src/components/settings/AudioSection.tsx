import type { Dispatch, SetStateAction } from "react";
import type { AudioInputMode } from "../../audio/micAnalyzer";
import type { VjLayer2AutomationMode } from "../../settingsSnapshot";
import { ClickBlockedHint } from "../ClickBlockedHint";

/** Shown when automation controls are clicked while audio is off. */
const HINT_START_AUDIO_VJ = "Start audio first to enable Automate.";
/** Shown when a sub-control needs audio + Automate. */
const HINT_NEED_VJ_CHAIN = "Turn on Automate while audio is running to use this.";
export type AudioSectionProps = {
  micDrivingRefraction: boolean;
  audioInputMode: AudioInputMode;
  setAudioInputMode: (v: AudioInputMode) => void;
  micRefractBoost: number;
  setMicRefractBoost: (v: number) => void;
  toggleMicRefraction: () => void | Promise<void>;
  vjMode: boolean;
  setVjMode: Dispatch<SetStateAction<boolean>>;
  vjPathScale: number;
  setVjPathScale: (v: number) => void;
  vjPathSpeed: number;
  setVjPathSpeed: (v: number) => void;
  vjGlassGradeMode: "off" | "tint" | "duotone";
  setVjGlassGradeMode: (v: "off" | "tint" | "duotone") => void;
  vjGlassNeonAHex: string;
  setVjGlassNeonAHex: (v: string) => void;
  vjGlassNeonBHex: string;
  setVjGlassNeonBHex: (v: string) => void;
  vjGlassGradeIntensity: number;
  setVjGlassGradeIntensity: (v: number) => void;
  solidOverlayOpacity: number;
  solidOverlayVjHueShift: boolean;
  setSolidOverlayVjHueShift: Dispatch<SetStateAction<boolean>>;
  solidOverlayHueAudio: boolean;
  setSolidOverlayHueAudio: Dispatch<SetStateAction<boolean>>;
  /** Design → Duplicate stack; required for speed-shift. */
  vjDupVertical: boolean;
  vjDupSpeedShift: boolean;
  setVjDupSpeedShift: Dispatch<SetStateAction<boolean>>;
  vjDupRandomHoriz: boolean;
  setVjDupRandomHoriz: Dispatch<SetStateAction<boolean>>;
  /** Fullscreen difference invert bursts on high-frequency transients. */
  vjInvertStrobe: boolean;
  setVjInvertStrobe: Dispatch<SetStateAction<boolean>>;
  /** 0–1 — how often invert strobe bursts may fire. */
  vjInvertStrobeAmount: number;
  setVjInvertStrobeAmount: (v: number) => void;
  /** Design → Secondary layer — required for layer VJ. */
  hasSecondaryLayer: boolean;
  vjLayer2AutomationMode: VjLayer2AutomationMode;
  setVjLayer2AutomationMode: Dispatch<SetStateAction<VjLayer2AutomationMode>>;
  /** Random burst: linear scale ramp during each strobe window. */
  vjLayer2StrobeScale: boolean;
  setVjLayer2StrobeScale: Dispatch<SetStateAction<boolean>>;
  onFeatureBlockedHint: (message: string) => void;
};

export function AudioSection({
  micDrivingRefraction,
  audioInputMode,
  setAudioInputMode,
  micRefractBoost,
  setMicRefractBoost,
  toggleMicRefraction,
  vjMode,
  setVjMode,
  vjPathScale,
  setVjPathScale,
  vjPathSpeed,
  setVjPathSpeed,
  vjGlassGradeMode,
  setVjGlassGradeMode,
  vjGlassNeonAHex,
  setVjGlassNeonAHex,
  vjGlassNeonBHex,
  setVjGlassNeonBHex,
  vjGlassGradeIntensity,
  setVjGlassGradeIntensity,
  solidOverlayOpacity,
  solidOverlayVjHueShift,
  setSolidOverlayVjHueShift,
  solidOverlayHueAudio,
  setSolidOverlayHueAudio,
  vjDupVertical,
  vjDupSpeedShift,
  setVjDupSpeedShift,
  vjDupRandomHoriz,
  setVjDupRandomHoriz,
  vjInvertStrobe,
  setVjInvertStrobe,
  vjInvertStrobeAmount,
  setVjInvertStrobeAmount,
  hasSecondaryLayer,
  vjLayer2AutomationMode,
  setVjLayer2AutomationMode,
  vjLayer2StrobeScale,
  setVjLayer2StrobeScale,
  onFeatureBlockedHint,
}: AudioSectionProps) {
  const vjControlsEnabled = micDrivingRefraction && vjMode;
  const vjHueShiftBlocked = !vjMode;
  const vjHueShiftHint = "Turn on Automate to use hue shift.";

  const hueAudioBlocked = !vjMode || !solidOverlayVjHueShift;
  const hueAudioHint = !vjMode
    ? "Turn on Automate to use Hue + audio."
    : "Turn on hue shift first.";
  const speedShiftBlocked = !vjControlsEnabled || !vjDupVertical;
  const speedShiftHint = !vjControlsEnabled
    ? HINT_NEED_VJ_CHAIN
    : "Turn on Duplicate stack in the Design tab first.";
  const invertStrobeBlocked = !vjControlsEnabled;
  const invertStrobeHint = HINT_NEED_VJ_CHAIN;
  const layer2VjBlocked = !vjControlsEnabled || !hasSecondaryLayer;
  const layer2VjHint = !hasSecondaryLayer
    ? "Add Layer 2 in the Design tab first."
    : HINT_NEED_VJ_CHAIN;
  const strobeScaleBlocked =
    layer2VjBlocked || vjLayer2AutomationMode !== "randomBurst";
  const strobeScaleHint = layer2VjBlocked
    ? layer2VjHint
    : "Turn on Random burst first.";

  const pickLayer2Mode = (mode: Exclude<VjLayer2AutomationMode, "off">) => {
    setVjLayer2AutomationMode((prev) => (prev === mode ? "off" : mode));
  };
  return (
    <>
      <h2 title="Live audio input and loudness-driven modulation">
        Audio
      </h2>
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
        </div>
      </section>

      <h2 title="Audio-driven automation, lens path, glass neon, and hue">
        Visuals
      </h2>
      <section>
        <div className="field field--checkbox field--audio-toggles">
          <ClickBlockedHint
            blocked={!micDrivingRefraction}
            hint={HINT_START_AUDIO_VJ}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjMode ? "mic-toggle--on" : ""}`}
              disabled={!micDrivingRefraction}
              onClick={() => setVjMode((v) => !v)}
              aria-pressed={vjMode}
              aria-label={
                micDrivingRefraction
                  ? vjMode
                    ? "Turn off Automate"
                    : "Turn on Automate"
                  : "Start audio to enable Automate"
              }
              title={
                micDrivingRefraction
                  ? "Automate lens path, glass neon, bloom, and related effects from loudness (dB)"
                  : "Start audio first"
              }
            >
              Automate
            </button>
          </ClickBlockedHint>
        </div>
        <h3 className="settings-subhead">Path</h3>
        <div className="field">
          <label
            title="Radius of the lens squircle orbit (1 = default). Larger values keep the same smooth path; the lens can move off-screen and back (no sliding along the frame edges)."
            htmlFor="vj-path-scale"
          >
            Path scale
            <span className="val">{vjPathScale.toFixed(2)}×</span>
          </label>
          <ClickBlockedHint
            blocked={!vjControlsEnabled}
            hint={HINT_NEED_VJ_CHAIN}
            onBlockedClick={onFeatureBlockedHint}
            fullWidth
          >
            <input
              id="vj-path-scale"
              type="range"
              min={0.5}
              max={2.5}
              step={0.05}
              value={vjPathScale}
              onChange={(e) => setVjPathScale(Number(e.target.value))}
              disabled={!vjControlsEnabled}
              aria-label="Lens orbit radius scale"
            />
          </ClickBlockedHint>
        </div>
        <div className="field">
          <label
            title="How fast the lens travels the squircle path (full loops per second). 0 = hold start position. Separate from Lens “Animation speed” (blob ripple)."
            htmlFor="vj-path-speed"
          >
            Path speed
            <span className="val">
              {vjPathSpeed < 1e-4
                ? "paused"
                : `${vjPathSpeed.toFixed(3)} lap/s · ~${(1 / vjPathSpeed).toFixed(1)}s/loop`}
            </span>
          </label>
          <ClickBlockedHint
            blocked={!vjControlsEnabled}
            hint={HINT_NEED_VJ_CHAIN}
            onBlockedClick={onFeatureBlockedHint}
            fullWidth
          >
            <input
              id="vj-path-speed"
              type="range"
              min={0}
              max={0.45}
              step={0.002}
              value={vjPathSpeed}
              onChange={(e) => setVjPathSpeed(Number(e.target.value))}
              disabled={!vjControlsEnabled}
              aria-label="Squircle path speed in laps per second"
            />
          </ClickBlockedHint>
        </div>
        <h3 className="settings-subhead">Neon</h3>
        <div className="field">
          <label htmlFor="vj-glass-grade-mode">Glass neon</label>
          <ClickBlockedHint
            blocked={!vjControlsEnabled}
            hint={HINT_NEED_VJ_CHAIN}
            onBlockedClick={onFeatureBlockedHint}
            fullWidth
          >
            <select
              id="vj-glass-grade-mode"
              className="field-select"
              value={vjGlassGradeMode}
              onChange={(e) =>
                setVjGlassGradeMode(
                  e.target.value as "off" | "tint" | "duotone",
                )
              }
              disabled={!vjControlsEnabled}
              aria-label="Glass neon mode"
            >
              <option value="off">Off</option>
              <option value="tint">Neon tint (screen)</option>
              <option value="duotone">Duotone</option>
            </select>
          </ClickBlockedHint>
        </div>
        {vjGlassGradeMode !== "off" && (
          <>
            <div className="field">
              <label>
                Neon A (bright)
                <span className="val">{vjGlassNeonAHex}</span>
              </label>
              <ClickBlockedHint
                blocked={!vjControlsEnabled}
                hint={HINT_NEED_VJ_CHAIN}
                onBlockedClick={onFeatureBlockedHint}
                fullWidth
              >
                <div className="row">
                  <input
                    type="color"
                    value={vjGlassNeonAHex}
                    onChange={(e) => setVjGlassNeonAHex(e.target.value)}
                    disabled={!vjControlsEnabled}
                    aria-label="Neon bright colour"
                  />
                  <input
                    type="text"
                    value={vjGlassNeonAHex}
                    onChange={(e) => setVjGlassNeonAHex(e.target.value)}
                    spellCheck={false}
                    disabled={!vjControlsEnabled}
                  />
                </div>
              </ClickBlockedHint>
            </div>
            <div className="field">
              <label>
                Neon B (shadows — duotone)
                <span className="val">{vjGlassNeonBHex}</span>
              </label>
              <ClickBlockedHint
                blocked={!vjControlsEnabled}
                hint={HINT_NEED_VJ_CHAIN}
                onBlockedClick={onFeatureBlockedHint}
                fullWidth
              >
                <div className="row">
                  <input
                    type="color"
                    value={vjGlassNeonBHex}
                    onChange={(e) => setVjGlassNeonBHex(e.target.value)}
                    disabled={!vjControlsEnabled}
                    aria-label="Neon shadow colour"
                  />
                  <input
                    type="text"
                    value={vjGlassNeonBHex}
                    onChange={(e) => setVjGlassNeonBHex(e.target.value)}
                    spellCheck={false}
                    disabled={!vjControlsEnabled}
                  />
                </div>
              </ClickBlockedHint>
            </div>
            <div className="field">
              <label htmlFor="vj-glass-neon-int">
                Neon intensity
                <span className="val">{vjGlassGradeIntensity.toFixed(2)}</span>
              </label>
              <ClickBlockedHint
                blocked={!vjControlsEnabled}
                hint={HINT_NEED_VJ_CHAIN}
                onBlockedClick={onFeatureBlockedHint}
                fullWidth
              >
                <input
                  id="vj-glass-neon-int"
                  type="range"
                  min={0}
                  max={2}
                  step={0.02}
                  value={vjGlassGradeIntensity}
                  onChange={(e) =>
                    setVjGlassGradeIntensity(Number(e.target.value))
                  }
                  disabled={!vjControlsEnabled}
                  aria-label="Glass neon intensity"
                />
              </ClickBlockedHint>
            </div>
          </>
        )}
        <h3 className="settings-subhead">Hue</h3>
        <div className="field">
          <label title="With solid overlay opacity up (Video backdrop), hue shifts that layer. With overlay off, hue shifts the refracted lens view instead.">
            Scene & overlay
          </label>
          <div className="field--checkbox field--audio-toggles">
            <ClickBlockedHint
              blocked={vjHueShiftBlocked}
              hint={vjHueShiftHint}
              onBlockedClick={onFeatureBlockedHint}
            >
              <button
                type="button"
                className={`mic-toggle ${solidOverlayVjHueShift ? "mic-toggle--on" : ""}`}
                disabled={!vjMode}
                onClick={() => setSolidOverlayVjHueShift((v) => !v)}
                aria-pressed={solidOverlayVjHueShift}
                title={
                  !vjMode
                    ? "Turn on Automate to animate hue"
                    : solidOverlayVjHueShift
                      ? "Turn off hue animation"
                      : solidOverlayOpacity > 0.02
                        ? "Slowly rotate hue on the solid overlay"
                        : "Slowly rotate hue on the refracted view (no solid overlay needed)"
                }
              >
                Hue shift
              </button>
            </ClickBlockedHint>
            <ClickBlockedHint
              blocked={hueAudioBlocked}
              hint={hueAudioHint}
              onBlockedClick={onFeatureBlockedHint}
            >
              <button
                type="button"
                className={`mic-toggle ${solidOverlayHueAudio ? "mic-toggle--on" : ""}`}
                disabled={!vjMode || !solidOverlayVjHueShift}
                onClick={() => setSolidOverlayHueAudio((v) => !v)}
                aria-pressed={solidOverlayHueAudio}
                title={
                  solidOverlayVjHueShift && vjMode
                    ? solidOverlayHueAudio
                      ? "Hue uses time only"
                      : "Add loudness to hue (needs audio on)"
                    : "Enable hue shift first"
                }
              >
                Hue + audio
              </button>
            </ClickBlockedHint>
          </div>
        </div>
      </section>

      <h2 title="Duplicate stack scroll, horizontal spacing, and fullscreen invert strobe">
        Extras
      </h2>
      <section>
        <div className="field field--checkbox field--audio-toggles field--audio-toggles--stack">
          <ClickBlockedHint
            blocked={speedShiftBlocked}
            hint={speedShiftHint}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjDupSpeedShift ? "mic-toggle--on" : ""}`}
              disabled={speedShiftBlocked}
              onClick={() => setVjDupSpeedShift((v) => !v)}
              aria-pressed={vjDupSpeedShift}
              title={
                speedShiftBlocked
                  ? speedShiftHint
                  : "Brief vertical scroll spikes on transients, then back to your Design scroll speed"
              }
            >
              Speed-shift
            </button>
          </ClickBlockedHint>
          <ClickBlockedHint
            blocked={speedShiftBlocked}
            hint={speedShiftHint}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjDupRandomHoriz ? "mic-toggle--on" : ""}`}
              disabled={speedShiftBlocked}
              onClick={() => setVjDupRandomHoriz((v) => !v)}
              aria-pressed={vjDupRandomHoriz}
              title={
                speedShiftBlocked
                  ? speedShiftHint
                  : "New random horizontal stair spacing (0–18%) on a timer; eases quickly to each target while audio is on. Design slider ignored until off."
              }
            >
              Horiz spacing
            </button>
          </ClickBlockedHint>
          <ClickBlockedHint
            blocked={invertStrobeBlocked}
            hint={invertStrobeHint}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjInvertStrobe ? "mic-toggle--on" : ""}`}
              disabled={invertStrobeBlocked}
              onClick={() => setVjInvertStrobe((v) => !v)}
              aria-pressed={vjInvertStrobe}
              title={
                invertStrobeBlocked
                  ? invertStrobeHint
                  : "Random fullscreen difference-invert flashes on snare/hat transients (high frequencies only)"
              }
            >
              Invert strobe
            </button>
          </ClickBlockedHint>
        </div>
        <div className="field">
          <label
            title="How often invert strobe bursts can start after a high-frequency hit (lower = rarer flashes, higher = more frequent)"
            htmlFor="vj-invert-strobe-amount"
          >
            Invert strobe amount
            <span className="val">{Math.round(vjInvertStrobeAmount * 100)}%</span>
          </label>
          <ClickBlockedHint
            blocked={invertStrobeBlocked}
            hint={invertStrobeHint}
            onBlockedClick={onFeatureBlockedHint}
            fullWidth
          >
            <input
              id="vj-invert-strobe-amount"
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={vjInvertStrobeAmount}
              onChange={(e) => setVjInvertStrobeAmount(Number(e.target.value))}
              disabled={invertStrobeBlocked}
              aria-label="Invert strobe burst frequency"
            />
          </ClickBlockedHint>
        </div>
      </section>

      <h2 title="Automation targets Layer 2 from Design (not the main logo)">
        Layer 2
      </h2>
      <section>
        <div className="field field--checkbox field--audio-toggles field--audio-toggles--stack">
          <ClickBlockedHint
            blocked={layer2VjBlocked}
            hint={layer2VjHint}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjLayer2AutomationMode === "randomBlink" ? "mic-toggle--on" : ""}`}
              disabled={layer2VjBlocked}
              onClick={() => pickLayer2Mode("randomBlink")}
              aria-pressed={vjLayer2AutomationMode === "randomBlink"}
              title={
                layer2VjBlocked
                  ? layer2VjHint
                  : "Sparse random dips in Layer 2 opacity on HF transients"
              }
            >
              Layer blink
            </button>
          </ClickBlockedHint>
          <ClickBlockedHint
            blocked={layer2VjBlocked}
            hint={layer2VjHint}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjLayer2AutomationMode === "blinkInverse" ? "mic-toggle--on" : ""}`}
              disabled={layer2VjBlocked}
              onClick={() => pickLayer2Mode("blinkInverse")}
              aria-pressed={vjLayer2AutomationMode === "blinkInverse"}
              title={
                layer2VjBlocked
                  ? layer2VjHint
                  : "Same burst times as Layer blink — layer usually off, brief flashes on the alternate flicker half"
              }
            >
              Layer blink inverse
            </button>
          </ClickBlockedHint>
          <ClickBlockedHint
            blocked={layer2VjBlocked}
            hint={layer2VjHint}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjLayer2AutomationMode === "randomScale" ? "mic-toggle--on" : ""}`}
              disabled={layer2VjBlocked}
              onClick={() => pickLayer2Mode("randomScale")}
              aria-pressed={vjLayer2AutomationMode === "randomScale"}
              title={
                layer2VjBlocked
                  ? layer2VjHint
                  : "Wobble Layer 2 scale with loudness and spectral motion"
              }
            >
              Layer scale + audio
            </button>
          </ClickBlockedHint>
          <ClickBlockedHint
            blocked={layer2VjBlocked}
            hint={layer2VjHint}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjLayer2AutomationMode === "randomBurst" ? "mic-toggle--on" : ""}`}
              disabled={layer2VjBlocked}
              onClick={() => pickLayer2Mode("randomBurst")}
              aria-pressed={vjLayer2AutomationMode === "randomBurst"}
              title={
                layer2VjBlocked
                  ? layer2VjHint
                  : "Layer stays off until bass transients trigger short strobe bursts"
              }
            >
              Random burst
            </button>
          </ClickBlockedHint>
          <ClickBlockedHint
            blocked={strobeScaleBlocked}
            hint={strobeScaleHint}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjLayer2StrobeScale ? "mic-toggle--on" : ""}`}
              disabled={strobeScaleBlocked}
              onClick={() => setVjLayer2StrobeScale((v) => !v)}
              aria-pressed={vjLayer2StrobeScale}
              title={
                strobeScaleBlocked
                  ? strobeScaleHint
                  : "Each burst starts Layer 2 at −15% scale and linearly reaches +15% over ~1.3 s — longer than the flash, so the motion continues after the strobe goes dark"
              }
            >
              Strobe scale
            </button>
          </ClickBlockedHint>
        </div>
      </section>
    </>
  );
}
