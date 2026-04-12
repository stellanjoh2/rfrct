import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMemo, useRef } from "react";
import {
  BLOCK_REVEAL_DURATION,
  LINE_REVEAL_BLUR_PX,
  SCROLL_TRIGGER_START,
} from "./scrollRevealMotion";

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
 * Decorative blood splatter behind a section — static layout; GSAP blur-in on scroll (same threshold
 * as `BlodScrollReveal` blocks).
 */
export function BlodSectionBloodParallax({
  imageSrc,
  side,
  rotationDeg,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

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
      const surface = surfaceRef.current;
      if (!root || !surface) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      const section = root.closest(".blod-section");
      if (!section) return;

      const blurIn = `${LINE_REVEAL_BLUR_PX}px`;
      /* Keep in sync with `.blod-blood-parallax__surface` — 20% darker than prior 0.85 */
      const b = 0.68;
      const sharp = `brightness(${b}) blur(0px)`;
      const soft = `brightness(${b}) blur(${blurIn})`;

      gsap.set(surface, { filter: soft });
      const blurTween = gsap.to(surface, {
        filter: sharp,
        duration: BLOCK_REVEAL_DURATION,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: SCROLL_TRIGGER_START,
          toggleActions: "play none none none",
        },
      });

      return () => {
        blurTween.scrollTrigger?.kill();
        blurTween.kill();
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
        ref={surfaceRef}
        className="blod-blood-parallax__surface"
        style={{
          backgroundImage: `url(${imageSrc})`,
          transform: `rotate(${surfaceTransform.angle}deg) scaleX(${surfaceTransform.scaleX}) scaleY(${surfaceTransform.scaleY})`,
        }}
      />
    </div>
  );
}
