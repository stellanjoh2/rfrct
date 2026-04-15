import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BACKDROP_BLUR_PLATE_DURATION,
  BACKDROP_RED_MULTIPLY_DURATION,
  BLOCK_REVEAL_BLUR_PX,
  BLOCK_REVEAL_DURATION,
  BLOCK_REVEAL_STAGGER,
  BLOCK_REVEAL_Y_INITIAL,
  BODY_LINE_DURATION,
  BODY_LINE_STAGGER,
  INTRO_LINE_SLOW_FACTOR,
  LINE_REVEAL_BLUR_PX,
  LINE_REVEAL_Y_INITIAL,
  SCROLL_TRIGGER_START,
} from "./scrollRevealMotion";
import { runShowcaseStillRevealOverlaysOnce } from "./runShowcaseStillRevealOverlays";
import {
  isHeavyRevealBlock,
  preloadRevealFrameAssets,
  waitForHeavyRevealContent,
} from "./waitForRevealMedia";

gsap.registerPlugin(ScrollTrigger);

/** Full-bleed still stack: no root opacity/y/blur — tear seams + fixed bg stay static; overlays fade in `runShowcaseStillRevealOverlays`. */
const SHOWCASE_STILL_BLOCK_SELECTOR = ".blod-showcase-still";

/**
 * Trailer: do not tween the `.blod-trailer` root (would blur/move fixed-aligned band vs tear strips).
 * The 16:9 frame inner gets the shared block reveal instead.
 */
const TRAILER_ROOT_SELECTOR = ".blod-trailer";
const TRAILER_FRAME_SELECTOR = ".blod-trailer__frame";

/**
 * Fixed photo + tear SVG bands: GSAP `filter` / `y` on any descendant breaks compositing with
 * `background-attachment: fixed` and reads as a seam / light leak — use opacity-only here.
 */
const TEAR_BAND_TRIGGER_SELECTOR =
  ".blod-section--trailer, .blod-section--footer";

/** Elements that get the shared fade/slide-in per section (plus opt-in blocks). */
const SECTION_SCROLL_REVEAL_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "figure.blod-gallery-card",
  "figure.blod-staff-card",
  "details.blod-faq-item",
  // Trailer / custom bands — not matched by headings or figures
  ".blod-trailer",
  ".blod-showcase-still",
  ".blod-scroll-reveal__block",
  // Story: block fade per paragraph (not SplitType lines — columns need normal reflow)
  ".blod-section--story p",
  // Intro signature: own trigger (see below) — section-as-trigger fires while mark is still below fold
  // Footer legal — paragraphs only (logo + social already `.blod-scroll-reveal__block`)
  ".blod-footer__legal p",
].join(", ");

type Props = {
  children: ReactNode;
};

/**
 * Scroll-driven fades for main content below the hero. Skipped when
 * `prefers-reduced-motion: reduce` is set.
 *
 * Body copy uses SplitType line splits with staggered blur-in, rise, and fade per line.
 * SplitType locks line breaks to the width at split time — we re-run splits when
 * the container width changes (resize, orientation) or after webfonts load.
 *
 * Block fade/slide (per section): headings, gallery/staff figures, FAQ details,
 * `.blod-trailer` / footer UI (opacity-only in trailer & footer bands — no blur/y vs fixed tear seams),
 * `.blod-showcase-still` (root untweened; blurred plate + red multiply fade via GSAP),
 * `.blod-footer__legal p`, and any element with `.blod-scroll-reveal__block`
 * (footer is a `.blod-section` — same trigger path as other bands).
 * Hero teaser video uses the same motion on mount (fixed layer — see `BlodHeroTeaserVideo`).
 *
 * Gallery / staff / trailer / footer logo waits for images, video, and mask SVGs to be ready
 * when the block enters view before playing (avoids mask/ambilight pops).
 */
export function BlodScrollReveal({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const widthRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let debounceId: ReturnType<typeof setTimeout>;

    const bump = () => {
      clearTimeout(debounceId);
      debounceId = window.setTimeout(() => {
        setLayoutEpoch((n) => n + 1);
      }, 100);
    };

    widthRef.current = root.getBoundingClientRect().width;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(w - widthRef.current) < 0.75) return;
      widthRef.current = w;
      bump();
    });

    ro.observe(root);

    return () => {
      ro.disconnect();
      clearTimeout(debounceId);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts?.ready) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setLayoutEpoch((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Warm mask SVGs + trailer bg early so they’re less likely to race heavy reveals. */
  useEffect(() => {
    void preloadRevealFrameAssets();
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      let cancelled = false;
      const splits: SplitType[] = [];

      const introLineDuration = BODY_LINE_DURATION * INTRO_LINE_SLOW_FACTOR;
      const introLineStagger = BODY_LINE_STAGGER * INTRO_LINE_SLOW_FACTOR;
      const bodyLineDuration = BODY_LINE_DURATION;
      const bodyLineStagger = BODY_LINE_STAGGER;

      const blockRevealInit = {
        opacity: 0,
        y: BLOCK_REVEAL_Y_INITIAL,
        filter: `blur(${BLOCK_REVEAL_BLUR_PX}px)`,
      } as const;

      const blockRevealTween = {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: BLOCK_REVEAL_DURATION,
        ease: "power3.out" as const,
        stagger: BLOCK_REVEAL_STAGGER,
      };

      const tearBandBlockRevealInit = { opacity: 0 } as const;
      const tearBandBlockRevealTween = {
        opacity: 1,
        duration: BLOCK_REVEAL_DURATION,
        ease: "power3.out" as const,
        stagger: BLOCK_REVEAL_STAGGER,
      };

      const tearBandTrigger = (trigger: HTMLElement) =>
        trigger.matches(TEAR_BAND_TRIGGER_SELECTOR);

      const runShowcaseStillRevealOverlays = (showcaseEls: HTMLElement[]) => {
        for (const el of showcaseEls) {
          runShowcaseStillRevealOverlaysOnce(el);
        }
      };

      const runBackdropVeilOverlays = (trigger: HTMLElement) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          return;
        }
        const veil = trigger.querySelector(".blod-backdrop-reveal-veil");
        if (!veil) return;
        const blurImg = veil.querySelector<HTMLElement>(
          ".blod-backdrop-reveal-veil__blur",
        );
        const mult = veil.querySelector<HTMLElement>(
          ".blod-backdrop-reveal-veil__multiply",
        );
        if (blurImg) {
          gsap.fromTo(
            blurImg,
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
      };

      const runLineReveal = (
        selector: string,
        duration: number,
        stagger: number,
      ) => {
        const nodes = root.querySelectorAll<HTMLParagraphElement>(selector);
        nodes.forEach((p) => {
          let split: SplitType;
          try {
            split = new SplitType(p, {
              types: "lines",
              lineClass: "blod-line",
              absolute: false,
            });
          } catch {
            return;
          }
          splits.push(split);

          const lines = split.lines;
          if (!lines?.length) return;

          gsap.set(lines, {
            opacity: 0,
            y: LINE_REVEAL_Y_INITIAL,
            filter: `blur(${LINE_REVEAL_BLUR_PX}px)`,
          });

          gsap.to(lines, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration,
            ease: "power3.out",
            stagger,
            scrollTrigger: {
              trigger: p,
              start: SCROLL_TRIGGER_START,
              toggleActions: "play none none none",
            },
          });
        });
      };

      runLineReveal(".blod-section--intro p", introLineDuration, introLineStagger);
      /* Section body copy — not intro, Story, or footer (footer legal uses block reveal; Story uses
       * two columns — SplitType line splits lock breaks). */
      runLineReveal(
        ".blod-section:not(.blod-section--intro):not(.blod-section--story):not(.blod-section--footer) p",
        bodyLineDuration,
        bodyLineStagger,
      );

      const revealLightBlocks = (
        elements: HTMLElement[],
        trigger: HTMLElement,
      ) => {
        if (elements.length === 0) return;
        const band = tearBandTrigger(trigger);
        gsap.set(elements, band ? tearBandBlockRevealInit : blockRevealInit);
        gsap.to(elements, {
          ...(band ? tearBandBlockRevealTween : blockRevealTween),
          scrollTrigger: {
            trigger,
            start: SCROLL_TRIGGER_START,
            toggleActions: "play none none none",
          },
        });
      };

      const revealHeavyBlocks = (
        elements: HTMLElement[],
        trigger: HTMLElement,
      ) => {
        if (elements.length === 0) return;
        const showcase = elements.filter((el) =>
          el.matches(SHOWCASE_STILL_BLOCK_SELECTOR),
        );
        const trailers = elements.filter((el) =>
          el.matches(TRAILER_ROOT_SELECTOR),
        );
        const normal = elements.filter(
          (el) =>
            !el.matches(SHOWCASE_STILL_BLOCK_SELECTOR) &&
            !el.matches(TRAILER_ROOT_SELECTOR),
        );
        const trailerFrames = trailers
          .map((t) => t.querySelector<HTMLElement>(TRAILER_FRAME_SELECTOR))
          .filter((n): n is HTMLElement => n != null);

        const band = tearBandTrigger(trigger);
        const blockInit = band ? tearBandBlockRevealInit : blockRevealInit;
        const blockTween = band ? tearBandBlockRevealTween : blockRevealTween;

        if (normal.length) gsap.set(normal, blockInit);
        if (trailerFrames.length) gsap.set(trailerFrames, blockInit);

        ScrollTrigger.create({
          trigger,
          start: SCROLL_TRIGGER_START,
          once: true,
          onEnter: async () => {
            if (cancelled) return;
            try {
              await Promise.all(
                elements.map((el) => waitForHeavyRevealContent(el)),
              );
            } catch {
              /* reveal anyway so blocks don’t stay invisible */
            }
            if (cancelled) return;
            requestAnimationFrame(() => {
              if (cancelled) return;
              if (normal.length) gsap.to(normal, blockTween);
              if (trailerFrames.length) gsap.to(trailerFrames, blockTween);
              runShowcaseStillRevealOverlays(showcase);
              runBackdropVeilOverlays(trigger);
            });
          },
        });
      };

      const revealBlocksForTrigger = (
        targets: NodeListOf<HTMLElement> | HTMLElement[],
        trigger: HTMLElement,
      ) => {
        const list = (
          targets instanceof Array ? targets : Array.from(targets)
        ) as HTMLElement[];
        const light = list.filter((el) => !isHeavyRevealBlock(el));
        const heavy = list.filter(isHeavyRevealBlock);
        revealLightBlocks(light, trigger);
        revealHeavyBlocks(heavy, trigger);
      };

      const ctx = gsap.context(() => {
        const sections = root.querySelectorAll<HTMLElement>(".blod-section");
        sections.forEach((section) => {
          revealBlocksForTrigger(
            section.querySelectorAll<HTMLElement>(
              SECTION_SCROLL_REVEAL_SELECTOR,
            ),
            section,
          );
        });

        /* Intro flash mark: must use the element as ScrollTrigger — if the whole intro section is the
         * trigger, the tween runs when the section top hits the threshold while the icon is still
         * off-screen, so the reveal finishes before the user sees it. */
        const introSignature = root.querySelector<HTMLElement>(
          ".blod-intro-signature-wrap",
        );
        if (introSignature) {
          revealLightBlocks([introSignature], introSignature);
        }
      }, root);

      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });

      return () => {
        cancelled = true;
        splits.forEach((s) => s.revert());
        ctx.revert();
      };
    },
    { scope: rootRef, dependencies: [layoutEpoch] },
  );

  return (
    <div ref={rootRef} className="blod-scroll-reveal">
      {children}
    </div>
  );
}
