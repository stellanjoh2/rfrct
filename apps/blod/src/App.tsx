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
import { LOCKED_HERO_SYNC } from "./lockedHeroPreset";
import {
  conceptGalleryImages,
  screenshotGalleryImages,
  scrollShellBackgroundUrl,
} from "./content/galleries";
import {
  FaqSection,
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

      <div className="blod-scroll">
        <div id="blod-hero-spacer" className="blod-hero-spacer" aria-hidden />
        <div
          className="blod-page-shell"
          style={
            {
              "--blod-shell-bg-image": `url(${scrollShellBackgroundUrl})`,
            } as CSSProperties
          }
        >
          <BlodScrollReveal>
            <IntroSection />
            <TrailerSection />
            <StorySection />
            <GallerySection
              id="screenshots"
              title="Screenshots"
              images={screenshotGalleryImages}
            />
            <GallerySection
              id="concept-art"
              title="Concept art"
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
