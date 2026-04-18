import type { Dispatch, SetStateAction } from "react";
import { ClickBlockedHint } from "../ClickBlockedHint";

const HINT_NEED_LOGO = "Upload a logo first.";
const HINT_DUP_STACK_FIRST = "Turn on Duplicate first.";

export type DupStackSectionProps = {
  /** A raster or SVG has been loaded into the lens texture. */
  hasLensImage: boolean;
  vjDupVertical: boolean;
  setVjDupVertical: Dispatch<SetStateAction<boolean>>;
  vjDupGap: number;
  setVjDupGap: (v: number) => void;
  vjDupHorizStep: number;
  setVjDupHorizStep: (v: number) => void;
  vjDupScrollSpeed: number;
  setVjDupScrollSpeed: (v: number) => void;
  onFeatureBlockedHint: (message: string) => void;
};

export function DupStackSection({
  hasLensImage,
  vjDupVertical,
  setVjDupVertical,
  vjDupGap,
  setVjDupGap,
  vjDupHorizStep,
  setVjDupHorizStep,
  vjDupScrollSpeed,
  setVjDupScrollSpeed,
  onFeatureBlockedHint,
}: DupStackSectionProps) {
  const dupSlidersNeedDup = hasLensImage && !vjDupVertical;

  return (
    <>
      <h2 title="Repeat the logo in a vertical stack with scroll (no audio or VJ tab required)">
        Duplicate
      </h2>
      <section>
        <div className="field field--checkbox field--audio-toggles">
          <ClickBlockedHint
            blocked={!hasLensImage}
            hint={HINT_NEED_LOGO}
            onBlockedClick={onFeatureBlockedHint}
          >
            <button
              type="button"
              className={`mic-toggle ${vjDupVertical ? "mic-toggle--on" : ""}`}
              disabled={!hasLensImage}
              onClick={() => setVjDupVertical((v) => !v)}
              aria-pressed={vjDupVertical}
              aria-label={
                hasLensImage
                  ? vjDupVertical
                    ? "Turn off stacked logo scroll"
                    : "Turn on stacked logo scroll"
                  : "Upload a logo to use Duplicate"
              }
              title={
                hasLensImage
                  ? "Repeat the image in a vertical scroll; rows are tight to the artwork with a slight horizontal stagger"
                  : "Upload an SVG or image on the Design tab first"
              }
            >
              Duplicate
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
            blocked={dupSlidersNeedDup || !hasLensImage}
            hint={!hasLensImage ? HINT_NEED_LOGO : HINT_DUP_STACK_FIRST}
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
              disabled={!hasLensImage || !vjDupVertical}
              aria-label="Duplicate vertical spacing"
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
            blocked={dupSlidersNeedDup || !hasLensImage}
            hint={!hasLensImage ? HINT_NEED_LOGO : HINT_DUP_STACK_FIRST}
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
              disabled={!hasLensImage || !vjDupVertical}
              aria-label="Duplicate horizontal stair step"
            />
          </ClickBlockedHint>
        </div>
        <div className="field">
          <label
            title="Vertical scroll speed for duplicate rows (independent of Lens blob speed)"
            htmlFor="vj-dup-scroll"
          >
            Scroll speed
            <span className="val">{vjDupScrollSpeed.toFixed(3)}</span>
          </label>
          <ClickBlockedHint
            blocked={dupSlidersNeedDup || !hasLensImage}
            hint={!hasLensImage ? HINT_NEED_LOGO : HINT_DUP_STACK_FIRST}
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
              disabled={!hasLensImage || !vjDupVertical}
              aria-label="Duplicate vertical scroll speed"
            />
          </ClickBlockedHint>
        </div>
      </section>
    </>
  );
}
