import type { RendererSyncSource } from "@refrct/core";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { BlodGifOverlay } from "./BlodGifOverlay";
import { BlodHeroTeaserVideo } from "./BlodHeroTeaserVideo";
import { BlodRefractHero } from "./BlodRefractHero";
import {
  createDefaultHeroSync,
  HERO_DEFAULT_IMAGE_SCALE,
} from "./createDefaultHeroSync";
import { DevBlobControls } from "./DevBlobControls";
import { BlodScrollReveal } from "./BlodScrollReveal";
import { BlodStickyHeader } from "./BlodStickyHeader";
import { LOCKED_HERO_SYNC } from "./lockedHeroPreset";
import { FEATURE_BLEED_IMG_B } from "./content/featureBleed";
import {
  conceptGalleryImages,
  screenshotGalleryImages,
  scrollShellBackgroundUrl,
} from "./content/galleries";
import {
  BLOD_TEAR_BOTTOM_MASK_URL,
  BLOD_TEAR_STRIP_MASK_URL,
} from "./blodTearMask";
import {
  FaqSection,
  FeatureBleedSection,
  FooterSection,
  GallerySection,
  IntroSection,
  StorySection,
  TeamSection,
  TrailerSection,
} from "./sections";
import "./App.css";

export function App() {
  const [devSync, setDevSync] = useState(createDefaultHeroSync);
  const [devImageScale, setDevImageScale] = useState(HERO_DEFAULT_IMAGE_SCALE);
  const [artPanelOpen, setArtPanelOpen] = useState(false);

  const activeSync = import.meta.env.DEV ? devSync : LOCKED_HERO_SYNC;
  const heroImageScale = import.meta.env.DEV
    ? devImageScale
    : HERO_DEFAULT_IMAGE_SCALE;

  const patchDevSync = useCallback((patch: Partial<RendererSyncSource>) => {
    setDevSync((s) => {
      const next = { ...s };
      for (const key of Object.keys(patch) as (keyof RendererSyncSource)[]) {
        const v = patch[key];
        if (v !== undefined) {
          (next as Record<string, unknown>)[key as string] = v;
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyP" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setArtPanelOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const ignore = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey || e.repeat) return;
      if (e.code !== "KeyT" && e.code !== "KeyY") return;
      if (ignore(e.target)) return;
      e.preventDefault();
      const root = document.documentElement;
      if (e.code === "KeyT") {
        root.toggleAttribute("data-debug-hide-tear-masks");
        const off = root.hasAttribute("data-debug-hide-tear-masks");
        console.info(
          `[blod] tear luminance SVG masks: ${off ? "bypassed (rect strips)" : "normal"}`,
        );
      } else {
        root.toggleAttribute("data-debug-peel-tear-strips");
        const off = root.hasAttribute("data-debug-peel-tear-strips");
        console.info(
          `[blod] tear strip layers: ${off ? "hidden (opacity 0)" : "normal"}`,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="blod-page">
      {import.meta.env.DEV ? (
        <DevBlobControls
          sync={devSync}
          onChange={patchDevSync}
          imageScale={heroImageScale}
          onImageScaleChange={setDevImageScale}
          open={artPanelOpen}
        />
      ) : null}

      <div className="blod-hero-fixed">
        <BlodHeroTeaserVideo />
        <BlodRefractHero
          syncSource={activeSync}
          imageScale={heroImageScale}
          onPatchSync={import.meta.env.DEV ? patchDevSync : undefined}
        />
      </div>

      <BlodGifOverlay />

      <BlodStickyHeader />

      <div className="blod-scroll">
        <div id="blod-hero-spacer" className="blod-hero-spacer" aria-hidden />
        <div
          className="blod-page-shell"
          style={
            {
              "--blod-shell-bg-image": `url(${scrollShellBackgroundUrl})`,
              "--blod-tear-strip-mask": `url(${BLOD_TEAR_STRIP_MASK_URL})`,
              "--blod-tear-strip-mask-bottom": `url(${BLOD_TEAR_BOTTOM_MASK_URL})`,
            } as CSSProperties
          }
        >
          <div className="blod-page-shell__cap" aria-hidden />
          <div className="blod-page-shell__hero-tear" aria-hidden />
          <BlodScrollReveal>
            <IntroSection />
            <TrailerSection />
            <StorySection />
            <FeatureBleedSection
              id="feature-map"
              title="The bayou at dusk"
              body="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Integer posuere erat a ante venenatis dapibus posuere velit aliquet."
              imageSrc={FEATURE_BLEED_IMG_B}
              imageSide="right"
              imageAlt=""
            />
            <FeatureBleedSection
              id="feature-character"
              title="Bloodhound"
              body="Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium."
              imageSrc={FEATURE_BLEED_IMG_B}
              imageSide="left"
              imageAlt=""
            />
            <GallerySection
              id="screenshots"
              title="Screenshots"
              images={screenshotGalleryImages}
            />
            <GallerySection
              id="concept-art"
              title="Concept Art"
              images={conceptGalleryImages}
            />
            <TeamSection />
            <FaqSection />
            <FooterSection />
          </BlodScrollReveal>
        </div>
      </div>
    </div>
  );
}
