import { useId } from "react";
import { BlodLiquidWarpFilterDefs } from "../BlodLiquidWarpFilterDefs";
import { blodLiquidWarpFilterId, blodLiquidWarpStyle } from "../blodLiquidWarpFilterId";

type Props = {
  images: readonly string[];
};

function GalleryCard({ src }: { src: string }) {
  const reactId = useId();
  const filterId = blodLiquidWarpFilterId(reactId);

  return (
    <figure className="blod-gallery-card">
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
          className="blod-gallery-card__link lg-item blod-img-hover-tint blod-img-hover-tint--liquid-warp"
          href={src}
          style={blodLiquidWarpStyle(filterId)}
        >
          <BlodLiquidWarpFilterDefs filterId={filterId} />
          <span className="blod-img-hover-stack">
            <img
              className="blod-img-hover-stack__fx"
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              width={800}
              height={450}
            />
            <img
              className="blod-img-hover-stack__clear"
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              width={800}
              height={450}
            />
          </span>
        </a>
      </div>
    </figure>
  );
}

export function GalleryGrid({ images }: Props) {
  return (
    <>
      {images.map((src, i) => (
        <GalleryCard key={`${src}-${i}`} src={src} />
      ))}
    </>
  );
}
