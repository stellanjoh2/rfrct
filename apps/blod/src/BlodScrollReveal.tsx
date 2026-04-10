import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";
import { useEffect, useRef, useState, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

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

      const paragraphs = root.querySelectorAll<HTMLParagraphElement>(
        ".blod-section p, .blod-footer p",
      );

      paragraphs.forEach((p) => {
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
          duration: 0.95,
          ease: "power2.out",
          stagger: 0.11,
          scrollTrigger: {
            trigger: p,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      });

      const sections = root.querySelectorAll<HTMLElement>(".blod-section");
      sections.forEach((section) => {
        const targets = section.querySelectorAll<HTMLElement>(
          "h2, figure.blod-gallery-card, figure.blod-staff-card, details.blod-faq-item",
        );
        if (targets.length === 0) return;

        gsap.set(targets, { opacity: 0, y: "1.35rem" });

        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power2.out",
          stagger: 0.11,
          scrollTrigger: {
            trigger: section,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      });

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
