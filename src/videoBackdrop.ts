/** CSS `mix-blend-mode` for layers over the video / canvas stack. */
export type BackdropBlendMode =
  | "normal"
  | "overlay"
  | "screen"
  | "plus-lighter"
  | "difference";

/** @deprecated Use BackdropBlendMode — kept for existing props. */
export type CanvasBackdropBlendMode = BackdropBlendMode;

export const BACKDROP_BLEND_OPTIONS: {
  value: BackdropBlendMode;
  label: string;
}[] = [
  { value: "normal", label: "Normal" },
  { value: "overlay", label: "Overlay" },
  { value: "screen", label: "Screen" },
  { value: "plus-lighter", label: "Add" },
  { value: "difference", label: "Difference" },
];

export const CANVAS_BACKDROP_BLEND_OPTIONS = BACKDROP_BLEND_OPTIONS;
