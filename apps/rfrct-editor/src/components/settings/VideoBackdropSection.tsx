import type { Dispatch, SetStateAction } from "react";
import {
  BACKDROP_BLEND_OPTIONS,
  type BackdropBlendMode,
} from "../../videoBackdrop";

export type VideoBackdropSectionProps = {
  youtubeUrlDraft: string;
  setYoutubeUrlDraft: (v: string) => void;
  onYoutubeApply: () => void;
  onYoutubeClear: () => void;
  youtubeActive: boolean;
  solidOverlayHex: string;
  setSolidOverlayHex: (v: string) => void;
  solidOverlayOpacity: number;
  setSolidOverlayOpacity: (v: number) => void;
  solidOverlayBlend: BackdropBlendMode;
  setSolidOverlayBlend: Dispatch<SetStateAction<BackdropBlendMode>>;
};

export function VideoBackdropSection({
  youtubeUrlDraft,
  setYoutubeUrlDraft,
  onYoutubeApply,
  onYoutubeClear,
  youtubeActive,
  solidOverlayHex,
  setSolidOverlayHex,
  solidOverlayOpacity,
  setSolidOverlayOpacity,
  solidOverlayBlend,
  setSolidOverlayBlend,
}: VideoBackdropSectionProps) {
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
          <label>Solid overlay (above video, below lens)</label>
          <div className="row">
            <input
              type="color"
              value={solidOverlayHex}
              onChange={(e) => setSolidOverlayHex(e.target.value)}
              aria-label="Solid overlay color"
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
      </section>
    </>
  );
}
