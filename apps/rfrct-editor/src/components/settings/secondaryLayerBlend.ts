export type SecondaryLayerBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "plus-lighter"
  | "overlay"
  | "difference";

export type SecondaryLayerTintMode = "original" | "multiply" | "replace";

/** Maps UI blend names to `overlayBlendRgb` mode in `packages/rfrct-core/src/shaders.ts`. */
export function secondaryLayerBlendToShaderId(m: SecondaryLayerBlendMode): number {
  switch (m) {
    case "multiply":
      return 1;
    case "screen":
      return 2;
    case "plus-lighter":
      return 3;
    case "overlay":
      return 4;
    case "difference":
      return 5;
    default:
      return 0;
  }
}
