import { publicUrl } from "./publicUrl";

/** 16:9 rough-edge mask — `public/Images/svg-mask-video.svg`. */
export const BLOD_FRAME_MASK_URL = publicUrl("Images/svg-mask-video.svg");

/** 3:4 rough-edge mask for team portraits (`public/Images/svg-mask-portraits.svg`, 1080×1440). */
export const BLOD_FRAME_MASK_PORTRAIT_URL = publicUrl(
  "Images/svg-mask-portraits.svg",
);

const MASK_URL_VALUE = `url(${BLOD_FRAME_MASK_URL})`;
const MASK_PORTRAIT_URL_VALUE = `url(${BLOD_FRAME_MASK_PORTRAIT_URL})`;

/**
 * Deterministic per-thumbnail mask flips only (horizontal / vertical) so adjacent
 * cells don’t repeat the same rough-edge silhouette. Image pixels stay upright;
 * the same scale is applied to the `<img>` to cancel mirroring.
 */
export function galleryThumbnailMaskStyleVars(
  src: string,
  index: number,
): Record<string, string> {
  let h = 2166136261;
  const key = `${src}\0${index}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const flipX = u & 1 ? -1 : 1;
  const flipY = (u >> 1) & 1 ? -1 : 1;
  return {
    "--blod-frame-mask": MASK_URL_VALUE,
    "--blod-gallery-mask-flip-x": String(flipX),
    "--blod-gallery-mask-flip-y": String(flipY),
  };
}

/**
 * Staff portraits: 3:4 mask asset + same flips as gallery (`mask-size: cover` in CSS).
 */
export function staffPortraitMaskStyleVars(
  name: string,
  portraitSrc: string,
): Record<string, string> {
  let h = 2166136261;
  const key = `${name}\0${portraitSrc}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  const flipX = u & 1 ? -1 : 1;
  const flipY = (u >> 1) & 1 ? -1 : 1;
  return {
    "--blod-staff-frame-mask": MASK_PORTRAIT_URL_VALUE,
    "--blod-staff-mask-flip-x": String(flipX),
    "--blod-staff-mask-flip-y": String(flipY),
  };
}
