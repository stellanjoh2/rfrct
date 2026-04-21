import type { Dispatch, SetStateAction } from "react";
import {
  BACKDROP_BLEND_OPTIONS,
  type BackdropBlendMode,
} from "../../videoBackdrop";
import { UploadBlock } from "./UploadBlock";

export type BackdropSectionProps = {
  backdropHex: string;
  setBackdropHex: (v: string) => void;
  backdropImageFileName: string | null;
  onBackdropImageFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBackdropImage: () => void;
  hasBackdropImage: boolean;
  canvasBackdropBlend: BackdropBlendMode;
  setCanvasBackdropBlend: Dispatch<SetStateAction<BackdropBlendMode>>;
};

export function BackdropSection({
  backdropHex,
  setBackdropHex,
  backdropImageFileName,
  onBackdropImageFile,
  onRemoveBackdropImage,
  hasBackdropImage,
  canvasBackdropBlend,
  setCanvasBackdropBlend,
}: BackdropSectionProps) {
  return (
    <>
      <h2 title="Viewport backdrop behind video, overlays, and Layer 1">
        Backdrop
      </h2>
      <section>
        <div className="field">
          <label>
            Solid colour
            <span className="val">{backdropHex}</span>
          </label>
          <div className="row">
            <input
              type="color"
              value={backdropHex}
              onChange={(e) => setBackdropHex(e.target.value)}
              aria-label="Solid colour picker"
            />
            <input
              type="text"
              value={backdropHex}
              onChange={(e) => setBackdropHex(e.target.value)}
              spellCheck={false}
              aria-label="Solid colour hex"
            />
          </div>
        </div>
        <div className="field">
          <label>
            Image
            {hasBackdropImage ? (
              <span className="val backdrop-active-indicator">Active</span>
            ) : null}
          </label>
        </div>
        <UploadBlock
          onFile={onBackdropImageFile}
          fileName={backdropImageFileName}
          onRemoveFile={onRemoveBackdropImage}
          accept="image/*"
          uploadAriaLabel="Upload backdrop image"
        />
        <div className="field">
          <label htmlFor="canvas-backdrop-blend">Blend on background</label>
          <select
            id="canvas-backdrop-blend"
            className="field-select"
            value={canvasBackdropBlend}
            onChange={(e) =>
              setCanvasBackdropBlend(e.target.value as BackdropBlendMode)
            }
            aria-label="Canvas blend mode over background"
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
