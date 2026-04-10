import type { RendererSyncSource } from "@refrct/core";
import { useCallback, useState } from "react";
import { BlodRefractHero } from "./BlodRefractHero";
import { createDefaultHeroSync } from "./createDefaultHeroSync";
import { DevBlobControls } from "./DevBlobControls";
import { LOCKED_HERO_SYNC } from "./lockedHeroPreset";
import "./App.css";

export function App() {
  const [devSync, setDevSync] = useState(createDefaultHeroSync);

  const activeSync = import.meta.env.DEV ? devSync : LOCKED_HERO_SYNC;

  const patchDevSync = useCallback((patch: Partial<RendererSyncSource>) => {
    setDevSync((s) => ({ ...s, ...patch }));
  }, []);

  return (
    <div className="blod-page">
      {import.meta.env.DEV ? (
        <DevBlobControls sync={devSync} onChange={patchDevSync} />
      ) : null}

      <section className="blod-hero" aria-label="Hero">
        <BlodRefractHero syncSource={activeSync} />
        <div className="blod-hero__overlay">
          <p className="blod-hero__kicker">Indie horror</p>
          <h1 className="blod-hero__title">Blod</h1>
          <p className="blod-hero__tagline">May the All bless your veins.</p>
          <a className="blod-hero__cta" href="#intro">
            Continue
          </a>
        </div>
      </section>

      <section id="intro" className="blod-section blod-section--intro">
        <h2>Intro</h2>
        <p>
          Placeholder copy for the game pitch, tone, and release window. The liquid
          lens above is driven by the same <code>@refrct/core</code> package as the
          Refrct editor.
        </p>
      </section>

      <section id="gallery" className="blod-section">
        <h2>Gallery</h2>
        <div className="blod-gallery-grid">
          <div className="blod-gallery-card" />
          <div className="blod-gallery-card" />
          <div className="blod-gallery-card" />
        </div>
      </section>

      <section id="team" className="blod-section">
        <h2>Team</h2>
        <p>Credits and social links go here.</p>
      </section>

      <footer className="blod-footer">
        <p>© {new Date().getFullYear()} Blod</p>
      </footer>
    </div>
  );
}
