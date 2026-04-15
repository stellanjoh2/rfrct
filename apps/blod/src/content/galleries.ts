import { publicUrl } from "../publicUrl";

/** Scroll column background — `public/Images/bg.jpg`. */
export const scrollShellBackgroundUrl = publicUrl("Images/bg.jpg");

const GALLERY_IMG_A = publicUrl("Images/photo-1594662234267-f47effc265a4.avif");
const GALLERY_IMG_B = publicUrl("Images/photo-1487174244970-cd18784bb4a4.avif");
const GALLERY_IMG_C = publicUrl("Images/photo-1580843411760-ea295173bfd0.avif");
const CONCEPT_ART_03 = publicUrl("Images/Concept-Art-03.jpg");
const CONCEPT_RAVAGER_FINAL = publicUrl("Images/BLOD_Clearblood_Ravager_Final_Standalone.jpg");
/** Same asset as `FooterSection` (`--blod-footer-bg-image`). */
const CONCEPT_FOOTER_BG = publicUrl("Images/footer-bg.jpg");
const CONCEPT_FEATURE_01 = publicUrl("Images/feature-01.jpg");
const CONCEPT_FEATURE_02 = publicUrl("Images/feature-02.jpg");
const CONCEPT_FEATURE_03 = publicUrl("Images/feature-03.jpg");

/** Six slots — mix sources for a less repetitive grid. */
export const screenshotGalleryImages: readonly string[] = [
  GALLERY_IMG_A,
  GALLERY_IMG_B,
  GALLERY_IMG_C,
  GALLERY_IMG_C,
  GALLERY_IMG_A,
  GALLERY_IMG_B,
];

/** Six thumbnails max — key art / features / footer wallpaper + legacy demon still. */
export const conceptGalleryImages: readonly string[] = [
  CONCEPT_FEATURE_02,
  CONCEPT_RAVAGER_FINAL,
  CONCEPT_ART_03,
  CONCEPT_FEATURE_03,
  CONCEPT_FOOTER_BG,
  CONCEPT_FEATURE_01,
];
