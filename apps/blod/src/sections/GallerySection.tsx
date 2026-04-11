import { BlodLightboxGroup } from "../BlodLightboxGroup";
import { GalleryGrid } from "./GalleryGrid";

type Props = {
  id: string;
  title: string;
  images: readonly string[];
};

export function GallerySection({ id, title, images }: Props) {
  return (
    <section id={id} className="blod-section blod-section--gallery">
      <div className="blod-section-inner blod-section-inner--prose">
        <h2>{title}</h2>
        <BlodLightboxGroup className="blod-gallery-grid">
          <GalleryGrid images={images} />
        </BlodLightboxGroup>
      </div>
    </section>
  );
}
