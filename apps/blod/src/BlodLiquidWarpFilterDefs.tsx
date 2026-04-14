type Props = {
  /** Must match `url(#filterId)` passed via `--blod-liquid-warp` on the parent. */
  filterId: string;
};

/**
 * Inline SVG filter defs for a liquid displacement warp (feTurbulence + feDisplacementMap).
 * Lives inside each `.blod-img-hover-tint` anchor so IDs stay unique.
 *
 * Note: `feDisplacementMap` `scale` must be a literal number — `var()` is ignored in most
 * browsers, which made the warp invisible.
 *
 * Large `x/y/width/height` on `<filter>` gives the engine room so the effect is not clipped
 * before compositing; neutral-state `transform: scale()` on the FX layer (see App.css) pulls
 * extra bitmap past the frame so displacement does not expose edge gaps / veil bleed.
 */
export function BlodLiquidWarpFilterDefs({ filterId }: Props) {
  return (
    <svg
      className="blod-liquid-warp-filter-defs"
      aria-hidden
      focusable="false"
      width={0}
      height={0}
    >
      <defs>
        <filter
          id={filterId}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.032"
            numOctaves="4"
            seed="7"
            result="turb"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turb"
            scale="72"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
