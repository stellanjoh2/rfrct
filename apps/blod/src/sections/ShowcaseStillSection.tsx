import { type CSSProperties, useEffect, useRef, useState } from "react";
import { SHOWCASE_STILL } from "../content/showcaseStill";
import { runShowcaseStillRevealOverlaysOnce } from "../runShowcaseStillRevealOverlays";

/** Start loading art when the band is within this margin of the viewport (prefetch before reveal). */
const SHOWCASE_IO_ROOT_MARGIN = "0px 0px 35% 0px";

/**
 * Full-viewport still image band: same torn SVG edges + fixed photo + wall tile as the trailer/footer
 * strips, but no overlay UI and no `--blod-static-wp-darken` on the image stack.
 * Art is deferred until the section nears the viewport (no eager global preload — see `waitForRevealMedia`).
 */
export function ShowcaseStillSection() {
  const { id, imageSrc, imageAlt } = SHOWCASE_STILL;
  const sectionRef = useRef<HTMLElement>(null);
  const [loadArt, setLoadArt] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setLoadArt(true);
        io.disconnect();
      },
      { root: null, rootMargin: SHOWCASE_IO_ROOT_MARGIN, threshold: 0 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!loadArt) return;
    const root = sectionRef.current?.querySelector(".blod-showcase-still");
    if (!(root instanceof HTMLElement)) return;
    requestAnimationFrame(() => runShowcaseStillRevealOverlaysOnce(root));
  }, [loadArt]);

  return (
    <section
      ref={sectionRef}
      id={id}
      className="blod-section blod-section--showcase-still"
      role="img"
      aria-label={imageAlt}
      style={
        loadArt
          ? ({
              "--blod-showcase-still-image": `url(${imageSrc})`,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="blod-showcase-still" aria-hidden="true">
        <div className="blod-showcase-still__base" />
        {loadArt ? (
          <>
            <img
              className="blod-showcase-still__blurplate"
              src={imageSrc}
              alt=""
              decoding="async"
              loading="lazy"
              width={1920}
              height={1080}
            />
            <div className="blod-showcase-still__multiply" aria-hidden />
            <img
              className="blod-showcase-still__preload"
              src={imageSrc}
              alt=""
              decoding="async"
              loading="lazy"
              width={1920}
              height={1080}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
