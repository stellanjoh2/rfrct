import type { Dispatch, SetStateAction } from "react";
import {
  BACKDROP_BLEND_OPTIONS,
  type BackdropBlendMode,
} from "../../videoBackdrop";
import { ClickBlockedHint } from "../ClickBlockedHint";

export type VideoBackdropSectionProps = {
  youtubeUrlDraft: string;
  setYoutubeUrlDraft: (v: string) => void;
  onYoutubeApply: () => void;
  onYoutubeClear: () => void;
  youtubeActive: boolean;
  youtubeError: string | null;
  canvasBackdropBlend: BackdropBlendMode;
  setCanvasBackdropBlend: Dispatch<SetStateAction<BackdropBlendMode>>;
  solidOverlayHex: string;
  setSolidOverlayHex: (v: string) => void;
  solidOverlayOpacity: number;
  setSolidOverlayOpacity: (v: number) => void;
  solidOverlayBlend: BackdropBlendMode;
  setSolidOverlayBlend: Dispatch<SetStateAction<BackdropBlendMode>>;
  vjMode: boolean;
  solidOverlayVjHueShift: boolean;
  setSolidOverlayVjHueShift: Dispatch<SetStateAction<boolean>>;
  solidOverlayHueAudio: boolean;
  setSolidOverlayHueAudio: Dispatch<SetStateAction<boolean>>;
  onFeatureBlockedHint: (message: string) => void;
};

export function VideoBackdropSection({
  youtubeUrlDraft,
  setYoutubeUrlDraft,
  onYoutubeApply,
  onYoutubeClear,
  youtubeActive,
  youtubeError,
  canvasBackdropBlend,
  setCanvasBackdropBlend,
  solidOverlayHex,
  setSolidOverlayHex,
  solidOverlayOpacity,
  setSolidOverlayOpacity,
  solidOverlayBlend,
  setSolidOverlayBlend,
  vjMode,
  solidOverlayVjHueShift,
  setSolidOverlayVjHueShift,
  solidOverlayHueAudio,
  setSolidOverlayHueAudio,
  onFeatureBlockedHint,
}: VideoBackdropSectionProps) {
  const overlayTooWeak = solidOverlayOpacity < 0.02;
  const vjHueShiftBlocked = overlayTooWeak || !vjMode;
  const vjHueShiftHint = overlayTooWeak
    ? "Raise solid overlay opacity to use VJ hue shift."
    : "Turn on VJ mode to use VJ hue shift.";

  const hueAudioBlocked =
    overlayTooWeak || !vjMode || !solidOverlayVjHueShift;
  const hueAudioHint = overlayTooWeak
    ? "Raise solid overlay opacity to use Hue + audio."
    : !vjMode
      ? "Turn on VJ mode to use Hue + audio."
      : "Turn on VJ hue shift first.";

  return (
    <>
      <h2 title="YouTube background layering, blend modes, and overlay controls">
        Video backdrop
      </h2>
      <section>
        <div className="field">
          <label htmlFor="youtube-bg-url">YouTube URL</label>
          <input
            id="youtube-bg-url"
            type="url"
            className="youtube-url-input"
            placeholder="https://www.youtube.com/watch?v=…"
            value={youtubeUrlDraft}
            onChange={(e) => setYoutubeUrlDraft(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          {youtubeError && (
            <p className="field-hint field-hint--error" role="status">
              {youtubeError}
            </p>
          )}
          <div className="row row--youtube-actions">
            <button type="button" className="mic-toggle" onClick={onYoutubeApply}>
              Apply
            </button>
            {youtubeActive && (
              <button type="button" className="mic-toggle" onClick={onYoutubeClear}>
                Clear YouTube
              </button>
            )}
          </div>
        </div>
        <div className="field">
          <label htmlFor="canvas-backdrop-blend">Blend on backdrop</label>
          <select
            id="canvas-backdrop-blend"
            className="field-select"
            value={canvasBackdropBlend}
            onChange={(e) =>
              setCanvasBackdropBlend(e.target.value as BackdropBlendMode)
            }
            aria-label="Canvas blend mode over video backdrop"
          >
            {BACKDROP_BLEND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Solid overlay (above video, below lens)</label>
          <div className="row">
            <input
              type="color"
              value={solidOverlayHex}
              onChange={(e) => setSolidOverlayHex(e.target.value)}
              aria-label="Solid overlay colour"
            />
            <input
              type="text"
              value={solidOverlayHex}
              onChange={(e) => setSolidOverlayHex(e.target.value)}
              spellCheck={false}
              aria-label="Solid overlay hex"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="solid-overlay-opacity">
            Overlay opacity
            <span className="val">{(solidOverlayOpacity * 100).toFixed(0)}%</span>
          </label>
          <input
            id="solid-overlay-opacity"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={solidOverlayOpacity}
            onChange={(e) => setSolidOverlayOpacity(Number(e.target.value))}
            aria-label="Solid overlay opacity"
          />
        </div>
        <div className="field">
          <label htmlFor="solid-overlay-blend">Overlay blend</label>
          <select
            id="solid-overlay-blend"
            className="field-select"
            value={solidOverlayBlend}
            onChange={(e) =>
              setSolidOverlayBlend(e.target.value as BackdropBlendMode)
            }
            aria-label="Solid overlay blend mode"
          >
            {BACKDROP_BLEND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field field--checkbox field--audio-toggles">
          <ClickBlockedHint
            blocked={vjHueShiftBlocked}
            hint={vjHueShiftHint}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${solidOverlayVjHueShift ? "mic-toggle--on" : ""}`}
              disabled={!vjMode || solidOverlayOpacity < 0.02}
              onClick={() => setSolidOverlayVjHueShift((v) => !v)}
              aria-pressed={solidOverlayVjHueShift}
              title={
                !vjMode
                  ? "Turn on VJ mode to animate overlay hue"
                  : solidOverlayOpacity < 0.02
                    ? "Raise overlay opacity first"
                    : solidOverlayVjHueShift
                      ? "Use static overlay colour"
                      : "Slowly rotate hue on the solid overlay"
              }
            >
              VJ hue shift
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
              disabled={
                !vjMode || !solidOverlayVjHueShift || solidOverlayOpacity < 0.02
              }
              onClick={() => setSolidOverlayHueAudio((v) => !v)}
              aria-pressed={solidOverlayHueAudio}
              title={
                solidOverlayVjHueShift && vjMode
                  ? solidOverlayHueAudio
                    ? "Hue uses time only"
                    : "Add loudness to hue (needs audio on)"
                  : "Enable VJ hue shift first"
              }
            >
              Hue + audio
            </button>
          </ClickBlockedHint>
        </div>
      </section>
    </>
  );
}
