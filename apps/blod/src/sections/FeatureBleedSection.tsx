export type FeatureBleedImageSide = "left" | "right";

type Props = {
  id: string;
  title: string;
  body: string;
  imageSrc: string;
  imageSide: FeatureBleedImageSide;
  imageAlt?: string;
};

/**
 * Headline and body share one column; a large image bleeds to the viewport edge on the opposite side.
 * `imageSide: "right"` — copy column left, image to the right edge.
 * `imageSide: "left"` — image bleeds left, copy column right.
 */
export function FeatureBleedSection({
  id,
  title: _title,
  body,
  imageSrc,
  imageSide,
  imageAlt = "",
}: Props) {
  const sideClass =
    imageSide === "right"
      ? "blod-feature-bleed__band-inner--image-right"
      : "blod-feature-bleed__band-inner--image-left";

  return (
    <section
      id={id}
      className="blod-section blod-section--feature-bleed"
    >
      <div className="blod-feature-bleed__band">
        <div className={`blod-feature-bleed__band-inner ${sideClass}`}>
          <div className="blod-feature-bleed__text">
            {/* <h2 className="blod-feature-bleed__title">{title}</h2> */}
            <p className="blod-feature-bleed__body">{body}</p>
          </div>
          <figure className="blod-feature-bleed__figure blod-scroll-reveal__block">
            <img
              className="blod-feature-bleed__img"
              src={imageSrc}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              width={1600}
              height={900}
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
