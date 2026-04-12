import { publicUrl } from "./publicUrl";

/** Top seam — straight top, torn bottom (`svg-mask-toptear.svg`). */
export const BLOD_TEAR_STRIP_MASK_URL = publicUrl("Images/svg-mask-toptear.svg");

/** Bottom seam — pre-flipped artwork (`svg-mask-bottomtear.svg`, same viewBox as top). */
export const BLOD_TEAR_BOTTOM_MASK_URL = publicUrl("Images/svg-mask-bottomtear.svg");

/**
 * Hero → scroll handoff: torn edge up (against hero), flat edge down (flush with scroll paint).
 * Same asset as the trailer bottom seam; rendered as a stacked black silhouette, not a content mask.
 */
export const BLOD_HERO_SCROLL_TEAR_URL = BLOD_TEAR_BOTTOM_MASK_URL;
