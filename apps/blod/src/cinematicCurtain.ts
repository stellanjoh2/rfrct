import gsap from "gsap";

const CURTAIN_ID = "blod-cinematic-curtain";

/** Full-length fade — tweak for pacing */
const FADE_DURATION_SEC = 3.6;

/**
 * Fade the entry black curtain out after the app is mounted.
 * Respects `prefers-reduced-motion: reduce` (curtain removed immediately).
 */
export function runCinematicFadeFromBlack(): void {
  const el = document.getElementById(CURTAIN_ID);
  if (!el) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.remove();
    return;
  }

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  gsap.to(el, {
    opacity: 0,
    duration: FADE_DURATION_SEC,
    ease: "power2.inOut",
    onComplete: () => {
      el.remove();
      document.body.style.overflow = prevOverflow;
    },
  });
}

/** Bootstrap / fatal errors — don’t trap the user behind the curtain */
export function dismissCinematicCurtainImmediate(): void {
  document.getElementById(CURTAIN_ID)?.remove();
  document.body.style.overflow = "";
}
