import { publicUrl } from "./publicUrl";

/** Full-viewport looping GIF — `public/Images/`. */
const GIF_OVERLAY_SRC = publicUrl("Images/aab07930554eba4a472d5b21cf2f7a44.gif");

/**
 * Fixed full-screen GIF layer above the hero and scroll shell (pointer-events pass through).
 * Two blend passes crossfade: multiply + red tint → screen (looping), so we never animate
 * `mix-blend-mode` itself (not interpolatable).
 */
export function BlodGifOverlay() {
  return (
    <div className="blod-gif-overlay" aria-hidden>
      <div className="blod-gif-overlay__phase blod-gif-overlay__phase--multiply">
        <img
          className="blod-gif-overlay__img"
          src={GIF_OVERLAY_SRC}
          alt=""
          draggable={false}
          decoding="async"
        />
      </div>
      <div className="blod-gif-overlay__phase blod-gif-overlay__phase--screen">
        <img
          className="blod-gif-overlay__img"
          src={GIF_OVERLAY_SRC}
          alt=""
          draggable={false}
          decoding="async"
        />
      </div>
    </div>
  );
}
