import { publicUrl } from "../publicUrl";

export type FeatureBleedBandContent = {
  /** Anchor id, e.g. `#feature-map` */
  id: string;
  /** Shown when the `<h2>` is enabled in `FeatureBleedSection`; handy as a label while editing */
  title: string;
  body: string;
  imageSrc: string;
  /** Matches `FeatureBleedSection`: `"right"` = copy left / image to the viewport edge. */
  imageSide: "left" | "right";
  imageAlt?: string;
};

/** Copy + image bleed right (text column left). */
export const featureBleedBayouAtDusk: FeatureBleedBandContent = {
  id: "feature-map",
  title: "The bayou at dusk",
  body:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Integer posuere erat a ante venenatis dapibus posuere velit aliquet.",
  imageSrc: publicUrl("Images/feature-01.jpg"),
  imageSide: "right",
  imageAlt: "",
};

/** Copy + image bleed left (text column right). */
export const featureBleedBloodhound: FeatureBleedBandContent = {
  id: "feature-character",
  title: "Bloodhound",
  body:
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.",
  imageSrc: publicUrl("Images/feature-02.jpg"),
  imageSide: "left",
  imageAlt: "",
};

/** Third band — rename the export, `id`, and `title` when you know the beat. */
export const featureBleedThirdSlot: FeatureBleedBandContent = {
  id: "feature-third-slot",
  title: "Third feature",
  body:
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  imageSrc: publicUrl("Images/feature-03.jpg"),
  imageSide: "right",
  imageAlt: "",
};

/** Page order after Lore — add/remove/reorder bands here only. */
export const FEATURE_BLEED_BANDS: FeatureBleedBandContent[] = [
  featureBleedBayouAtDusk,
  featureBleedBloodhound,
  featureBleedThirdSlot,
];
