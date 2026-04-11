import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  imageSrc: string;
  side: "left" | "right";
};

/**
 * Decorative blood splatter behind a section — scrubbed vertical parallax on scroll.
 */
export function BlodSectionBloodParallax({ imageSrc, side }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      const section = root.closest(".blod-section");
      if (!section) return;

      /** Same scroll response on both sides (mirrored yRange felt wrong on the left). */
      const fromY = 16;
      const toY = -16;

      const tween = gsap.fromTo(
        root,
        { yPercent: fromY },
        {
          yPercent: toY,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.65,
          },
        },
      );

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: rootRef, dependencies: [imageSrc, side] },
  );

  return (
    <div
      ref={rootRef}
      className={`blod-blood-parallax blod-blood-parallax--${side}`}
      aria-hidden
    >
      <div
        className={`blod-blood-parallax__surface${side === "right" ? " blod-blood-parallax__surface--flip" : ""}`}
        style={{ backgroundImage: `url(${imageSrc})` }}
      />
    </div>
  );
}
