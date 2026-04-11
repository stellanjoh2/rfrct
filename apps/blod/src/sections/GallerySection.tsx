import { BlodSectionBloodParallax } from "../BlodSectionBloodParallax";
import { BLOOD_PARALLAX_URL } from "../content/bloodParallax";
import { BlodLightboxGroup } from "../BlodLightboxGroup";
import { GalleryGrid } from "./GalleryGrid";

type Props = {
  id: string;
  title: string;
  images: readonly string[];
};

/** L → R → L with Team — same splat asset everywhere */
function galleryBloodForId(id: string) {
  if (id === "screenshots") {
    return { side: "left" as const };
  }
  if (id === "concept-art") {
    return { side: "right" as const };
  }
  return null;
}

export function GallerySection({ id, title, images }: Props) {
  const blood = galleryBloodForId(id);
  return (
    <section
      id={id}
      className={`blod-section blod-section--gallery${blood ? " blod-section--blood" : ""}`}
    >
      {blood ? (
        <BlodSectionBloodParallax imageSrc={BLOOD_PARALLAX_URL} side={blood.side} />
      ) : null}
      <div className="blod-section-inner blod-section-inner--prose">
        <h2>{title}</h2>
        <BlodLightboxGroup className="blod-gallery-grid">
          <GalleryGrid images={images} />
        </BlodLightboxGroup>
      </div>
    </section>
  );
}
