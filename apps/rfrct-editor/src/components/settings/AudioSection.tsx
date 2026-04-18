import type { Dispatch, SetStateAction } from "react";
import type { AudioInputMode } from "../../audio/micAnalyzer";
import { ClickBlockedHint } from "../ClickBlockedHint";

/** Shown when automation controls are clicked while audio is off. */
const HINT_START_AUDIO_VJ = "Start audio first to enable Automate.";
/** Shown when a sub-control needs audio + Automate. */
const HINT_NEED_VJ_CHAIN = "Turn on Automate while audio is running to use this.";
const HINT_DUP_STACK_FIRST = "Turn on Dup stack first.";

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
  vjDupVertical: boolean;
  setVjDupVertical: Dispatch<SetStateAction<boolean>>;
  vjDupGap: number;
  setVjDupGap: (v: number) => void;
  vjDupHorizStep: number;
  setVjDupHorizStep: (v: number) => void;
  vjDupScrollSpeed: number;
  setVjDupScrollSpeed: (v: number) => void;
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
  onFeatureBlockedHint: (message: string) => void;
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
  vjDupVertical,
  setVjDupVertical,
  vjDupGap,
  setVjDupGap,
  vjDupHorizStep,
  setVjDupHorizStep,
  vjDupScrollSpeed,
  setVjDupScrollSpeed,
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
  onFeatureBlockedHint,
}: AudioSectionProps) {
  const vjControlsEnabled = micDrivingRefraction && vjMode;
  const dupSlidersNeedVj = !vjControlsEnabled;
  const dupSlidersNeedDup = vjControlsEnabled && !vjDupVertical;
  const vjHueShiftBlocked = !vjMode;
  const vjHueShiftHint = "Turn on Automate to use hue shift.";

  const hueAudioBlocked = !vjMode || !solidOverlayVjHueShift;
  const hueAudioHint = !vjMode
    ? "Turn on Automate to use Hue + audio."
    : "Turn on hue shift first.";
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
        {micError && (
          <p className="field-hint field-hint--error" role="status">
            {micError}
          </p>
        )}
      </section>

      <h2 title="Audio-driven automation, lens path, glass neon, overlay hue, and duplicate stack">
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
        <h3 className="settings-subhead">Dup stack</h3>
        <div className="field field--checkbox field--audio-toggles">
          <ClickBlockedHint
            blocked={!vjControlsEnabled}
            hint={HINT_NEED_VJ_CHAIN}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjDupVertical ? "mic-toggle--on" : ""}`}
              disabled={!vjControlsEnabled}
              onClick={() => setVjDupVertical((v) => !v)}
              aria-pressed={vjDupVertical}
              aria-label={
                vjControlsEnabled
                  ? vjDupVertical
                    ? "Turn off stacked logo scroll"
                    : "Turn on stacked logo scroll"
                  : "Enable Automate to use Dup stack"
              }
              title={
                vjControlsEnabled
                  ? "Repeat the SVG in a vertical scroll; rows are tight to the artwork with a slight horizontal stagger"
                  : "Start audio and Automate first"
              }
            >
              Dup stack
            </button>
          </ClickBlockedHint>
        </div>
        <div className="field">
          <label
            title="Vertical gap between stacked logos (fraction of viewport height)"
            htmlFor="vj-dup-gap"
          >
            Spacing (vertical)
            <span className="val">{(vjDupGap * 100).toFixed(1)}%</span>
          </label>
          <ClickBlockedHint
            blocked={dupSlidersNeedVj || dupSlidersNeedDup}
            hint={dupSlidersNeedVj ? HINT_NEED_VJ_CHAIN : HINT_DUP_STACK_FIRST}
            onBlockedClick={onFeatureBlockedHint}
            fullWidth
          >
            <input
              id="vj-dup-gap"
              type="range"
              min={0}
              max={0.35}
              step={0.005}
              value={vjDupGap}
              onChange={(e) => setVjDupGap(Number(e.target.value))}
              disabled={!vjControlsEnabled || !vjDupVertical}
              aria-label="Dup stack vertical spacing"
            />
          </ClickBlockedHint>
        </div>
        <div className="field">
          <label
            title="Horizontal shift per stair step; pattern resets every 8 rows"
            htmlFor="vj-dup-horiz"
          >
            Spacing (horizontal)
            <span className="val">{(vjDupHorizStep * 100).toFixed(1)}%</span>
          </label>
          <ClickBlockedHint
            blocked={dupSlidersNeedVj || dupSlidersNeedDup}
            hint={dupSlidersNeedVj ? HINT_NEED_VJ_CHAIN : HINT_DUP_STACK_FIRST}
            onBlockedClick={onFeatureBlockedHint}
            fullWidth
          >
            <input
              id="vj-dup-horiz"
              type="range"
              min={0}
              max={0.18}
              step={0.002}
              value={vjDupHorizStep}
              onChange={(e) => setVjDupHorizStep(Number(e.target.value))}
              disabled={!vjControlsEnabled || !vjDupVertical}
              aria-label="Dup stack horizontal stair step"
            />
          </ClickBlockedHint>
        </div>
        <div className="field">
          <label
            title="Vertical scroll speed for the dup stack (independent of Lens blob speed)"
            htmlFor="vj-dup-scroll"
          >
            Scroll speed
            <span className="val">{vjDupScrollSpeed.toFixed(3)}</span>
          </label>
          <ClickBlockedHint
            blocked={dupSlidersNeedVj || dupSlidersNeedDup}
            hint={dupSlidersNeedVj ? HINT_NEED_VJ_CHAIN : HINT_DUP_STACK_FIRST}
            onBlockedClick={onFeatureBlockedHint}
            fullWidth
          >
            <input
              id="vj-dup-scroll"
              type="range"
              min={0}
              max={0.4}
              step={0.005}
              value={vjDupScrollSpeed}
              onChange={(e) => setVjDupScrollSpeed(Number(e.target.value))}
              disabled={!vjControlsEnabled || !vjDupVertical}
              aria-label="Dup stack vertical scroll speed"
            />
          </ClickBlockedHint>
        </div>
      </section>
    </>
  );
}
