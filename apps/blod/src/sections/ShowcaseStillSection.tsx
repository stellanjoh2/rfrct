import { type CSSProperties } from "react";
import { SHOWCASE_STILL } from "../content/showcaseStill";

/**
 * Full-viewport still image band: same torn SVG edges + fixed photo + wall tile as the trailer/footer
 * strips, but no overlay UI and no `--blod-static-wp-darken` on the image stack.
 */
export function ShowcaseStillSection() {
  const { id, imageSrc, imageAlt } = SHOWCASE_STILL;

  return (
    <section
      id={id}
      className="blod-section blod-section--showcase-still"
      role="img"
      aria-label={imageAlt}
      style={
        {
          "--blod-showcase-still-image": `url(${imageSrc})`,
        } as CSSProperties
      }
    >
      <div className="blod-showcase-still" aria-hidden="true">
        <div className="blod-showcase-still__base" />
        <img
          className="blod-showcase-still__blurplate"
          src={imageSrc}
          alt=""
          decoding="async"
          width={1920}
          height={1080}
        />
        <div className="blod-showcase-still__multiply" aria-hidden />
        <img
          className="blod-showcase-still__preload"
          src={imageSrc}
          alt=""
          decoding="async"
          width={1920}
          height={1080}
        />
      </div>
    </section>
  );
}
