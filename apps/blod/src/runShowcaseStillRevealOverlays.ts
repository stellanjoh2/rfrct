import gsap from "gsap";
import {
  BACKDROP_BLUR_PLATE_DURATION,
  BACKDROP_RED_MULTIPLY_DURATION,
} from "./scrollRevealMotion";

const revealed = new WeakSet<HTMLElement>();

/**
 * Blur plate + red multiply fade for one `.blod-showcase-still` root.
 * Safe to call from scroll reveal and after lazy art mounts; runs at most once per root.
 */
export function runShowcaseStillRevealOverlaysOnce(root: HTMLElement): void {
  if (revealed.has(root)) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealed.add(root);
    return;
  }

  const blurplate = root.querySelector<HTMLElement>(
    ".blod-showcase-still__blurplate",
  );
  const mult = root.querySelector<HTMLElement>(
    ".blod-showcase-still__multiply",
  );
  if (!blurplate && !mult) return;

  revealed.add(root);

  if (blurplate) {
    gsap.fromTo(
      blurplate,
      { opacity: 1 },
      {
        opacity: 0,
        duration: BACKDROP_BLUR_PLATE_DURATION,
        ease: "power2.out",
      },
    );
  }
  if (mult) {
    gsap.fromTo(
      mult,
      { opacity: 1 },
      {
        opacity: 0,
        duration: BACKDROP_RED_MULTIPLY_DURATION,
        ease: "power1.out",
      },
    );
  }
}
