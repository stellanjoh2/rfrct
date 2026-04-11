/**
 * Primary brand palette — change these values when the art direction shifts.
 * `applyBlodBrandCssVars()` syncs them to `:root` for CSS (`var(--blod-brand-red)`).
 */
export const BLOD_BRAND_RED = "#b6262b";
export const BLOD_BRAND_RED_HOVER = "#d14a50";
/** Warm bone white — replace when final hex is locked. */
export const BLOD_BRAND_BONE = "#e8e4dc";

export function applyBlodBrandCssVars(): void {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  r.style.setProperty("--blod-brand-red", BLOD_BRAND_RED);
  r.style.setProperty("--blod-brand-red-hover", BLOD_BRAND_RED_HOVER);
  r.style.setProperty("--blod-brand-bone", BLOD_BRAND_BONE);
}
