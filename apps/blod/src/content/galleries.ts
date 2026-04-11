import { publicUrl } from "../publicUrl";

/** Scroll column background — `public/Images/bg.jpg`. */
export const scrollShellBackgroundUrl = publicUrl("Images/bg.jpg");

const GALLERY_IMG_A = publicUrl("Images/photo-1594662234267-f47effc265a4.avif");
const GALLERY_IMG_B = publicUrl("Images/photo-1487174244970-cd18784bb4a4.avif");
const GALLERY_IMG_C = publicUrl("Images/photo-1580843411760-ea295173bfd0.avif");

/** Six slots — mix sources for a less repetitive grid. */
export const screenshotGalleryImages: readonly string[] = [
  GALLERY_IMG_A,
  GALLERY_IMG_B,
  GALLERY_IMG_C,
  GALLERY_IMG_C,
  GALLERY_IMG_A,
  GALLERY_IMG_B,
];

export const conceptGalleryImages: readonly string[] = [
  GALLERY_IMG_B,
  GALLERY_IMG_C,
  GALLERY_IMG_A,
  GALLERY_IMG_A,
  GALLERY_IMG_B,
  GALLERY_IMG_C,
];
