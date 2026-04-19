import { useState, useSyncExternalStore } from "react";
import { ExportSection } from "./ExportSection";
import type { ExportSectionProps } from "./ExportSection";

function subscribeNoop() {
  return () => {};
}

function getFolderPickerSupportSnapshot(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function" &&
    window.isSecureContext
  );
}

function useFolderPickerSupported(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    getFolderPickerSupportSnapshot,
    () => false,
  );
}

const GIF_FPS_OPTIONS = [10, 12, 15, 24, 30, 50, 60] as const;

export type GifExportPanelProps = {
  fps: number;
  setFps: (n: number) => void;
  maxWidthEnabled: boolean;
  setMaxWidthEnabled: (v: boolean) => void;
  maxWidth: number;
  setMaxWidth: (n: number) => void;
  maxColors: 128 | 256;
  setMaxColors: (n: 128 | 256) => void;
  durationSec: number;
  setDurationSec: (n: number) => void;
  pixelArtResize: boolean;
  setPixelArtResize: (v: boolean) => void;
  infiniteLoop: boolean;
  setInfiniteLoop: (v: boolean) => void;
  outputFolderLabel: string | null;
  onChooseOutputFolder: () => void;
  onClearOutputFolder: () => void;
  isRecording: boolean;
  recordProgress: { current: number; total: number } | null;
  onStartRecord: () => void;
  onCancelRecord: () => void;
};

export type ExportPageProps = {
  png: ExportSectionProps;
  gif: GifExportPanelProps;
  /** Design backdrop is a separate DOM layer; canvas export cannot include iframe video. */
  youtubeBackdropActive: boolean;
};

export function ExportPage({
  png,
  gif,
  youtubeBackdropActive,
}: ExportPageProps) {
  const g = gif;
  const folderPickerSupported = useFolderPickerSupported();

  /** Lets users type multi-digit values; parent state updates on blur (not every keystroke). */
  const [maxWidthDraft, setMaxWidthDraft] = useState<string | null>(null);
  const [durationDraft, setDurationDraft] = useState<string | null>(null);

  return (
    <div className="export-page">
      <p className="export-page__lead">
        Capture the live lens viewport. PNG uses the same high-quality export as before; GIF
        records real-time animation.
      </p>

      <h2 className="export-section__title">Image (PNG)</h2>
      <ExportSection {...png} />

      <h2 className="export-section__title">Animated GIF</h2>
      <section className="export-section gif-export">
        {youtubeBackdropActive ? (
          <p className="gif-export__backdrop-note" role="note">
            A YouTube backdrop sits behind the lens in the page. GIF and PNG only
            capture the WebGL canvas bitmap, not the iframe, so the video cannot appear in exports
            (cross-origin content is never painted into the canvas—this is normal browser behavior,
            not a block on Refrct specifically).
          </p>
        ) : null}
        <div className="export-field">
          <span className="export-field__label">Output folder</span>
          <p className="gif-export__hint">
            {folderPickerSupported
              ? "Pick once; GIFs save into that folder. Without a folder, the file downloads normally."
              : typeof window !== "undefined" && !window.isSecureContext
                ? "Open this app over HTTPS or localhost to enable folder pick; otherwise use download."
                : "Folder pick needs a Chromium-based browser (Chrome, Edge, …). Others download the GIF normally."}
          </p>
          <div className="gif-export__folder-row">
            <button
              type="button"
              className="gif-export__path"
              onClick={g.onChooseOutputFolder}
              disabled={g.isRecording}
              title="Choose where to save GIF files"
            >
              {g.outputFolderLabel ?? "Choose output folder…"}
            </button>
            <button
              type="button"
              className="gif-export__folder-btn"
              onClick={g.onChooseOutputFolder}
              disabled={g.isRecording}
              title="Choose where to save GIF files"
              aria-label="Choose output folder"
            >
              <svg
                className="gif-export__folder-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
              </svg>
            </button>
          </div>
          {g.outputFolderLabel ? (
            <button
              type="button"
              className="gif-export__linkish"
              onClick={g.onClearOutputFolder}
              disabled={g.isRecording}
            >
              Clear folder
            </button>
          ) : null}
        </div>

        <label className="gif-export__check">
          <input
            type="checkbox"
            checked={g.maxWidthEnabled}
            onChange={(e) => g.setMaxWidthEnabled(e.target.checked)}
            disabled={g.isRecording}
          />
          <span>Resize to max width</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="gif-export__num"
            value={maxWidthDraft !== null ? maxWidthDraft : String(g.maxWidth)}
            onFocus={() => setMaxWidthDraft(String(g.maxWidth))}
            onChange={(e) => setMaxWidthDraft(e.target.value)}
            onBlur={() => {
              const raw = maxWidthDraft ?? "";
              setMaxWidthDraft(null);
              const n = parseInt(raw, 10);
              if (!Number.isNaN(n)) {
                g.setMaxWidth(Math.max(64, Math.min(4096, n)));
              }
            }}
            disabled={g.isRecording || !g.maxWidthEnabled}
            aria-label="Max width in pixels"
          />
        </label>

        <div className="export-field">
          <span className="export-field__label">Framerate</span>
          <select
            className="gif-export__select"
            value={g.fps}
            onChange={(e) => g.setFps(Number(e.target.value))}
            disabled={g.isRecording}
          >
            {GIF_FPS_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} fps
              </option>
            ))}
          </select>
        </div>

        <div className="export-field">
          <span className="export-field__label">Max colors</span>
          <select
            className="gif-export__select"
            value={g.maxColors}
            onChange={(e) =>
              g.setMaxColors(Number(e.target.value) === 128 ? 128 : 256)
            }
            disabled={g.isRecording}
          >
            <option value={256}>256</option>
            <option value={128}>128</option>
          </select>
        </div>

        <div className="export-field">
          <span className="export-field__label">Duration (seconds)</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="gif-export__select gif-export__select--number"
            value={
              durationDraft !== null ? durationDraft : String(g.durationSec)
            }
            onFocus={() => setDurationDraft(String(g.durationSec))}
            onChange={(e) => setDurationDraft(e.target.value)}
            onBlur={() => {
              const raw = durationDraft ?? "";
              setDurationDraft(null);
              const n = parseFloat(raw);
              if (!Number.isNaN(n)) {
                g.setDurationSec(Math.max(0.5, Math.min(30, n)));
              }
            }}
            disabled={g.isRecording}
            aria-label="GIF duration in seconds"
          />
        </div>

        <label className="gif-export__check gif-export__check--solo">
          <input
            type="checkbox"
            checked={g.pixelArtResize}
            onChange={(e) => g.setPixelArtResize(e.target.checked)}
            disabled={g.isRecording}
          />
          <span>Pixel art (nearest-neighbor resize)</span>
        </label>

        <label className="gif-export__check gif-export__check--solo">
          <input
            type="checkbox"
            checked={g.infiniteLoop}
            onChange={(e) => g.setInfiniteLoop(e.target.checked)}
            disabled={g.isRecording}
          />
          <span>Infinite loop</span>
        </label>
        <p className="gif-export__micro">
          {g.infiniteLoop
            ? "Seamlessly repeats in viewers that honor GIF looping."
            : "Plays once, then stops."}
        </p>

        {g.recordProgress ? (
          <div className="gif-export__progress" role="status">
            Encoding frame {g.recordProgress.current} / {g.recordProgress.total}
          </div>
        ) : null}

        <div className="gif-export__actions">
          {!g.isRecording ? (
            <button
              type="button"
              className="export-actions__btn gif-export__record"
              onClick={g.onStartRecord}
            >
              <span className="export-actions__icon" aria-hidden>
                ●
              </span>
              Record GIF
            </button>
          ) : (
            <button
              type="button"
              className="export-actions__btn gif-export__cancel"
              onClick={g.onCancelRecord}
            >
              Cancel
            </button>
          )}
        </div>

        <p className="gif-export__note">
          Video export (.mov / .mp4) will follow on this tab.
        </p>
      </section>
    </div>
  );
}
