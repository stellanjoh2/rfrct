import { galleryThumbnailMaskStyleVars } from "../blodFrameMask";
import type { CSSProperties } from "react";

type Props = {
  images: readonly string[];
};

export function GalleryGrid({ images }: Props) {
  return (
    <>
      {images.map((src, i) => (
        <figure key={`${src}-${i}`} className="blod-gallery-card">
          <div className="blod-gallery-card__media-frame">
            <span className="blod-img-ambilight" aria-hidden>
              <img
                className="blod-img-ambilight__img"
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                width={800}
                height={450}
              />
            </span>
            <a
              className="blod-gallery-card__link lg-item blod-img-hover-tint"
              href={src}
              style={galleryThumbnailMaskStyleVars(src, i) as CSSProperties}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                width={800}
                height={450}
              />
            </a>
          </div>
        </figure>
      ))}
    </>
  );
}
