import type { Dispatch, SetStateAction } from "react";
import {
  CANVAS_BACKDROP_BLEND_OPTIONS,
  type CanvasBackdropBlendMode,
} from "../../videoBackdrop";

export type VideoBackdropSectionProps = {
  youtubeUrlDraft: string;
  setYoutubeUrlDraft: (v: string) => void;
  onYoutubeApply: () => void;
  onYoutubeClear: () => void;
  youtubeActive: boolean;
  youtubeError: string | null;
  canvasBackdropBlend: CanvasBackdropBlendMode;
  setCanvasBackdropBlend: Dispatch<SetStateAction<CanvasBackdropBlendMode>>;
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
}: VideoBackdropSectionProps) {
  return (
    <>
      <h2>Video backdrop</h2>
      <section>
        <div className="field">
          <label htmlFor="youtube-bg-url">YouTube URL</label>
          <p className="field-hint">
            Fullscreen embed behind the canvas (not sampled in WebGL). Loop; no
            controls. Audio is always off (muted + forced mute).
          </p>
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
          <p className="field-hint">
            How the SVG + lens composite mixes with the layer behind the canvas
            (video or solid background). Uses CSS{" "}
            <code className="field-hint-code">mix-blend-mode</code>.
          </p>
          <select
            id="canvas-backdrop-blend"
            className="field-select"
            value={canvasBackdropBlend}
            onChange={(e) =>
              setCanvasBackdropBlend(
                e.target.value as CanvasBackdropBlendMode,
              )
            }
            aria-label="Canvas blend mode over video backdrop"
          >
            {CANVAS_BACKDROP_BLEND_OPTIONS.map((o) => (
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
