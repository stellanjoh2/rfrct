import type { CSSProperties } from "react";

/** Stable HTML/CSS id fragment from `useId()` for SVG filter references. */
export function blodLiquidWarpFilterId(reactId: string): string {
  return `blod-liquid-${reactId.replace(/:/g, "")}`;
}

/** Inline style setting `--blod-liquid-warp` for `.blod-img-hover-tint`. */
export function blodLiquidWarpStyle(filterId: string): CSSProperties {
  return { ["--blod-liquid-warp"]: `url(#${filterId})` } as CSSProperties;
}
