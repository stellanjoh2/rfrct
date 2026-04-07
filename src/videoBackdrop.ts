/** CSS `mix-blend-mode` for the WebGL canvas over the backdrop (e.g. YouTube). */
export type CanvasBackdropBlendMode =
  | "normal"
  | "screen"
  | "plus-lighter"
  | "difference";

export const CANVAS_BACKDROP_BLEND_OPTIONS: {
  value: CanvasBackdropBlendMode;
  label: string;
}[] = [
  { value: "normal", label: "Normal" },
  { value: "screen", label: "Screen" },
  { value: "plus-lighter", label: "Add" },
  { value: "difference", label: "Difference" },
];
