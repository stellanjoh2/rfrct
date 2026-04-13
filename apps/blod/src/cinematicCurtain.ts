import gsap from "gsap";
import { publicUrl } from "./publicUrl";

export const BLOD_CINEMATIC_CURTAIN_ID = "blod-cinematic-curtain";

/** Fired when the black loading layer is gone (fade finished or immediate dismiss). Hero flash listens. */
export const BLOD_LOADING_CURTAIN_DONE_EVENT = "blod:loading-curtain-done";

const CURTAIN_ID = BLOD_CINEMATIC_CURTAIN_ID;

function dispatchLoadingCurtainDone(): void {
  if (typeof document === "undefined") return;
  /* After layout effects so `BlodRefractHero` can subscribe first (sync early-exit paths). */
  queueMicrotask(() => {
    document.dispatchEvent(new CustomEvent(BLOD_LOADING_CURTAIN_DONE_EVENT));
  });
}

/** Target time budget for the choppy “loading” reveal */
const REVEAL_DURATION_SEC = 2;
/** Black full-screen curtain fades after the bloodline bar wipes away */
const FADE_OUT_DURATION_SEC = 0.75 * 1.5 * 1.5;
/** Bloodline bar only: clip-out left → right when the choppy reveal finishes */
const LOADING_BAR_WIPE_OUT_DURATION_SEC = 0.48;

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
 * Entry sequence: bloodline “loads” in choppy steps (~2s), then the bar wipes off L→R while the black
 * curtain fades out in parallel. `prefers-reduced-motion: reduce` skips the bar and uses a short fade.
 */
export function runCinematicFadeFromBlack(): void {
  const el = document.getElementById(CURTAIN_ID);
  if (!el) {
    dispatchLoadingCurtainDone();
    return;
  }

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
        dispatchLoadingCurtainDone();
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

  const barTrack = el.querySelector<HTMLElement>(".blod-loading-bar__track");
  const mask = el.querySelector<HTMLElement>(".blod-loading-bar__mask");
  if (!barTrack || !mask) {
    dispatchLoadingCurtainDone();
    el.remove();
    document.body.style.overflow = prevOverflow;
    return;
  }

  gsap.set(mask, { clipPath: "inset(0 100% 0 0)" });

  const steps = buildChoppyLoadingSteps(REVEAL_DURATION_SEC);

  const tl = gsap.timeline({
    onComplete: () => {
      dispatchLoadingCurtainDone();
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

  tl.fromTo(
    barTrack,
    { clipPath: "inset(0 0 0 0)" },
    {
      clipPath: "inset(0 0 0 100%)",
      duration: LOADING_BAR_WIPE_OUT_DURATION_SEC,
      ease: "power2.inOut",
    },
  );

  tl.to(
    el,
    {
      opacity: 0,
      duration: FADE_OUT_DURATION_SEC,
      ease: "power2.inOut",
    },
    "<",
  );
}

/** Bootstrap / fatal errors — don’t trap the user behind the curtain */
export function dismissCinematicCurtainImmediate(): void {
  const curtain = document.getElementById(CURTAIN_ID);
  if (curtain) {
    dispatchLoadingCurtainDone();
    curtain.remove();
  }
  document.body.style.overflow = "";
}
