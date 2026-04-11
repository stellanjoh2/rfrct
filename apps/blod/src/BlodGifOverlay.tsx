import { publicUrl } from "./publicUrl";

/** Full-viewport looping GIF — `public/Images/`. */
const GIF_OVERLAY_SRC = publicUrl("Images/aab07930554eba4a472d5b21cf2f7a44.gif");

/**
 * Fixed full-screen GIF layer above the hero and scroll shell (pointer-events pass through).
 * GIFs animate automatically when loaded as an `<img>`.
 */
export function BlodGifOverlay() {
  return (
    <div className="blod-gif-overlay" aria-hidden>
      <img
        className="blod-gif-overlay__img"
        src={GIF_OVERLAY_SRC}
        alt=""
        draggable={false}
        decoding="async"
      />
    </div>
  );
}
