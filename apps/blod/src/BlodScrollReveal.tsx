import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";
import { useEffect, useRef, useState, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

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
  ".blod-scroll-reveal__block",
].join(", ");

/** When the top of the trigger crosses this viewport line — lower % = later / more in view. */
const SCROLL_TRIGGER_START = "top 78%";

const BODY_LINE_DURATION = 1.12;
const BODY_LINE_STAGGER = 0.145;
/** Intro paragraphs stay ~25% slower than body copy */
const INTRO_LINE_SLOW_FACTOR = 1.25;

const BLOCK_REVEAL_DURATION = 1.32;
const BLOCK_REVEAL_STAGGER = 0.15;

type Props = {
  children: ReactNode;
};

/**
 * Scroll-driven fades for main content below the hero. Skipped when
 * `prefers-reduced-motion: reduce` is set.
 *
 * Body copy uses SplitType line splits with a staggered fade/slide per line.
 * SplitType locks line breaks to the width at split time — we re-run splits when
 * the container width changes (resize, orientation) or after webfonts load.
 *
 * Block fade/slide (per section): headings, gallery/staff figures, FAQ details,
 * `.blod-trailer`, and any element with `.blod-scroll-reveal__block` for custom
 * sections. Footer logo uses `.blod-scroll-reveal__block`; legal copy is not line-split (see below).
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

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const splits: SplitType[] = [];

      const introLineDuration = BODY_LINE_DURATION * INTRO_LINE_SLOW_FACTOR;
      const introLineStagger = BODY_LINE_STAGGER * INTRO_LINE_SLOW_FACTOR;
      const bodyLineDuration = BODY_LINE_DURATION;
      const bodyLineStagger = BODY_LINE_STAGGER;

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

          gsap.set(lines, { opacity: 0, y: "0.35em" });

          gsap.to(lines, {
            opacity: 1,
            y: 0,
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
      /* Section body copy only — not `.blod-footer p` (SplitType + line opacity:0 left credits invisible if ScrollTrigger never completed). */
      runLineReveal(
        ".blod-section:not(.blod-section--intro) p",
        bodyLineDuration,
        bodyLineStagger,
      );

      const revealBlock = (
        targets: NodeListOf<HTMLElement> | HTMLElement[],
        trigger: HTMLElement,
      ) => {
        const list =
          targets instanceof Array ? targets : Array.from(targets);
        if (list.length === 0) return;

        gsap.set(list, { opacity: 0, y: "1.35rem" });

        gsap.to(list, {
          opacity: 1,
          y: 0,
          duration: BLOCK_REVEAL_DURATION,
          ease: "power3.out",
          stagger: BLOCK_REVEAL_STAGGER,
          scrollTrigger: {
            trigger,
            start: SCROLL_TRIGGER_START,
            toggleActions: "play none none none",
          },
        });
      };

      const sections = root.querySelectorAll<HTMLElement>(".blod-section");
      sections.forEach((section) => {
        const targets = section.querySelectorAll<HTMLElement>(
          SECTION_SCROLL_REVEAL_SELECTOR,
        );
        revealBlock(targets, section);
      });

      const footer = root.querySelector<HTMLElement>("footer.blod-footer");
      if (footer) {
        const footerTargets = footer.querySelectorAll<HTMLElement>(
          SECTION_SCROLL_REVEAL_SELECTOR,
        );
        if (footerTargets.length > 0) {
          revealBlock(footerTargets, footer);
        }
      }

      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });

      return () => {
        splits.forEach((s) => s.revert());
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
