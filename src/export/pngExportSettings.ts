/**
 * Central definition for PNG export from the Refrct canvas.
 * Used by the sidebar UI and `RefractRenderer.exportPng`.
 */

/** Pixel scale relative to the current backing-store size (DPR already applied). */
export type PngExportScale = 1 | 2;

/** Full WebGL canvas vs tight crop around the fitted image rect (UV space from layout). */
export type PngExportRegion = "full" | "image";

export type PngExportParams = {
  scale: PngExportScale;
  transparentBackground: boolean;
  region: PngExportRegion;
};

export const DEFAULT_PNG_EXPORT_PARAMS: PngExportParams = {
  scale: 2,
  transparentBackground: false,
  region: "full",
};

export function mergePngExportParams(
  base: PngExportParams,
  patch: Partial<PngExportParams>,
): PngExportParams {
  return {
    scale: patch.scale ?? base.scale,
    transparentBackground:
      patch.transparentBackground ?? base.transparentBackground,
    region: patch.region ?? base.region,
  };
}
