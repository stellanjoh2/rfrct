import {
  BLOD_TEAR_BOTTOM_MASK_URL,
  BLOD_TEAR_STRIP_MASK_URL,
} from "./blodTearMask";
import { BLOOD_PARALLAX_URL } from "./content/bloodParallax";
import { INTRO_SYMBOL_URL } from "./content/introSymbol";
import { SHOWCASE_STILL } from "./content/showcaseStill";
import { publicUrl } from "./publicUrl";

/** Tear-strip masks, trailer band bg, blood parallax, intro symbol — decode before reveals paint. */
const FRAME_ASSET_URLS = [
  publicUrl("Images/bg.jpg"),
  publicUrl("Images/demonhero.jpg"),
  publicUrl("Images/demonhero2.jpg"),
  publicUrl("Images/footer-bg.jpg"),
  publicUrl("Images/video-tile-bg.jpg"),
  BLOD_TEAR_STRIP_MASK_URL,
  BLOD_TEAR_BOTTOM_MASK_URL,
  BLOOD_PARALLAX_URL,
  INTRO_SYMBOL_URL,
  SHOWCASE_STILL.imageSrc,
] as const;

let frameAssetsPreload: Promise<void> | null = null;

function preloadImageUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** One shared preload for reveal imagery + tear masks (used by CSS variables). */
export function preloadRevealFrameAssets(): Promise<void> {
  if (!frameAssetsPreload) {
    frameAssetsPreload = Promise.all(
      FRAME_ASSET_URLS.map((u) => preloadImageUrl(u)),
    ).then(() => undefined);
  }
  return frameAssetsPreload;
}

async function waitForImageDecode(img: HTMLImageElement): Promise<void> {
  if (!img.getAttribute("src")) return;
  if (img.complete && img.naturalWidth > 0) {
    try {
      await img.decode();
    } catch {
      /* decode() can reject for broken images */
    }
    return;
  }
  await new Promise<void>((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
  try {
    await img.decode();
  } catch {
    /* ignore */
  }
}

function waitForVideoReady(v: HTMLVideoElement): Promise<void> {
  if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    v.addEventListener("canplay", () => resolve(), { once: true });
    v.addEventListener("error", () => resolve(), { once: true });
  });
}

/**
 * Wait for bitmap/video inside a reveal block (gallery, staff, trailer, footer logo)
 * so masks / ambilight don’t pop after the tween starts.
 */
export async function waitForHeavyRevealContent(el: HTMLElement): Promise<void> {
  await preloadRevealFrameAssets();
  const imgs = [...el.querySelectorAll("img")];
  const videos = [...el.querySelectorAll("video")];
  await Promise.all([
    ...imgs.map((img) => waitForImageDecode(img)),
    ...videos.map((v) => waitForVideoReady(v)),
  ]);
}

export function isHeavyRevealBlock(el: HTMLElement): boolean {
  return el.matches(
    "figure.blod-gallery-card, figure.blod-staff-card, figure.blod-feature-bleed__figure, .blod-trailer, .blod-showcase-still, .blod-footer__logo-wrap",
  );
}
