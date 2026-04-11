type Props = {
  images: readonly string[];
};

export function GalleryGrid({ images }: Props) {
  return (
    <>
      {images.map((src, i) => (
        <figure key={`${src}-${i}`} className="blod-gallery-card">
          <a
            className="blod-gallery-card__link lg-item blod-img-hover-tint"
            href={src}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              width={800}
              height={500}
            />
          </a>
        </figure>
      ))}
    </>
  );
}
