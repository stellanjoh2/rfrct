import { useEffect, useRef, type ReactNode } from "react";
import lightGallery from "lightgallery";
import lgThumbnail from "lightgallery/plugins/thumbnail";
import lgZoom from "lightgallery/plugins/zoom";

import "lightgallery/css/lightgallery-bundle.css";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Anchors with class `lg-item` open lightGallery (see lightgalleryjs.com). */
export function BlodLightboxGroup({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const instance = lightGallery(el, {
      selector: "a.lg-item",
      plugins: [lgZoom, lgThumbnail],
      speed: 400,
      download: false,
    });

    return () => {
      instance.destroy();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
