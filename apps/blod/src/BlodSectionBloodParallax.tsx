import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMemo, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

/** Keep splats near the texture’s dominant angle; flips add variety without big spins. */
const MAX_ROTATION_DEG = 20;

function clampRotationDeg(n: number) {
  return Math.max(-MAX_ROTATION_DEG, Math.min(MAX_ROTATION_DEG, n));
}

type Props = {
  imageSrc: string;
  side: "left" | "right";
  /** Optional tilt in degrees, clamped to ±MAX_ROTATION_DEG; omit for random tilt + flips per instance. */
  rotationDeg?: number;
};

/**
 * Decorative blood splatter behind a section — scrubbed vertical parallax on scroll.
 */
export function BlodSectionBloodParallax({
  imageSrc,
  side,
  rotationDeg,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  /** Small rotation ±20° plus optional H/V flips — lives on the surface, not the GSAP layer. */
  const surfaceTransform = useMemo(() => {
    const angle =
      rotationDeg !== undefined
        ? clampRotationDeg(rotationDeg)
        : Math.random() * (2 * MAX_ROTATION_DEG) - MAX_ROTATION_DEG;
    const flipX = Math.random() < 0.5;
    const flipY = Math.random() < 0.5;
    return {
      angle,
      scaleX: flipX ? -1 : 1,
      scaleY: flipY ? -1 : 1,
    };
  }, [rotationDeg]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      const section = root.closest(".blod-section");
      if (!section) return;

      /** Same scroll response on both sides; half y-range vs before = ~50% slower parallax. */
      const fromY = 8;
      const toY = -8;

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
        className="blod-blood-parallax__surface"
        style={{
          backgroundImage: `url(${imageSrc})`,
          transform: `rotate(${surfaceTransform.angle}deg) scaleX(${surfaceTransform.scaleX}) scaleY(${surfaceTransform.scaleY})`,
        }}
      />
    </div>
  );
}
