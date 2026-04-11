/**
 * Primary brand palette — change these values when the art direction shifts.
 * `applyBlodBrandCssVars()` syncs them to `:root` for CSS (`var(--blod-brand-red)`).
 */
export const BLOD_BRAND_RED = "#ff0c3a";
export const BLOD_BRAND_RED_HOVER = "#ff4d6d";
/** Official light / body text (hero SVG multiply tint uses the same). */
export const BLOD_BRAND_BONE = "#bababa";

export function applyBlodBrandCssVars(): void {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  r.style.setProperty("--blod-brand-red", BLOD_BRAND_RED);
  r.style.setProperty("--blod-brand-red-hover", BLOD_BRAND_RED_HOVER);
  r.style.setProperty("--blod-brand-bone", BLOD_BRAND_BONE);
}
