import gsap from "gsap";
import { publicUrl } from "./publicUrl";

const CURTAIN_ID = "blod-cinematic-curtain";

/** Target time budget for the choppy “loading” reveal */
const REVEAL_DURATION_SEC = 2;
const FADE_OUT_DURATION_SEC = 0.75;

type RevealStep = { rightInsetPct: number; duration: number };

/**
 * Random stepped progress (stalls, uneven bites) normalized to `totalSec`.
 * `rightInsetPct` is the CSS `inset()` right term — 100 = hidden, 0 = full image.
 */
function buildChoppyLoadingSteps(totalSec: number): RevealStep[] {
  const steps: RevealStep[] = [];
  let right = 100;

  for (let i = 0; i < 140 && right > 0.001; i++) {
    /* Occasional “stuck” frames — bar doesn’t move */
    if (steps.length > 0 && Math.random() < 0.16) {
      steps.push({
        rightInsetPct: right,
        duration: 0.035 + Math.random() * 0.14,
      });
    }

    const bite = Math.max(
      0.25,
      Math.min(right, Math.random() * 14 + 1.2),
    );
    right = Math.round(Math.max(0, right - bite) * 1000) / 1000;
    if (right < 0.35) right = 0;

    steps.push({
      rightInsetPct: right,
      duration: 0.04 + Math.random() * 0.26,
    });
  }

  if (steps.length === 0 || steps[steps.length - 1].rightInsetPct > 0) {
    steps.push({ rightInsetPct: 0, duration: 0.05 });
  } else {
    steps[steps.length - 1].rightInsetPct = 0;
  }

  const rawSum = steps.reduce((s, x) => s + x.duration, 0);
  const scale = rawSum > 0 ? totalSec / rawSum : 1;
  steps.forEach((s) => {
    s.duration *= scale;
  });

  return steps;
}

/**
 * Entry sequence: solid black + bloodline image “loads” in choppy steps (~2s), then curtain fades.
 * Respects `prefers-reduced-motion: reduce` (short fade, no reveal animation).
 */
export function runCinematicFadeFromBlack(): void {
  const el = document.getElementById(CURTAIN_ID);
  if (!el) return;

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) {
    gsap.to(el, {
      opacity: 0,
      duration: 0.35,
      ease: "power1.out",
      onComplete: () => {
        el.remove();
        document.body.style.overflow = prevOverflow;
      },
    });
    return;
  }

  const imgSrc = publicUrl("Images/bloodline-loading.png");
  el.innerHTML = `
    <div class="blod-loading-bar">
      <div class="blod-loading-bar__track">
        <div class="blod-loading-bar__mask">
          <img src="${imgSrc}" alt="" decoding="async" draggable="false" />
        </div>
      </div>
    </div>
  `;

  const mask = el.querySelector<HTMLElement>(".blod-loading-bar__mask");
  if (!mask) {
    el.remove();
    document.body.style.overflow = prevOverflow;
    return;
  }

  gsap.set(mask, { clipPath: "inset(0 100% 0 0)" });

  const steps = buildChoppyLoadingSteps(REVEAL_DURATION_SEC);

  const tl = gsap.timeline({
    onComplete: () => {
      el.remove();
      document.body.style.overflow = prevOverflow;
    },
  });

  for (const step of steps) {
    tl.to(mask, {
      clipPath: `inset(0 ${step.rightInsetPct}% 0 0)`,
      duration: step.duration,
      ease: "none",
    });
  }

  tl.to(el, {
    opacity: 0,
    duration: FADE_OUT_DURATION_SEC,
    ease: "power2.inOut",
  });
}

/** Bootstrap / fatal errors — don’t trap the user behind the curtain */
export function dismissCinematicCurtainImmediate(): void {
  document.getElementById(CURTAIN_ID)?.remove();
  document.body.style.overflow = "";
}
