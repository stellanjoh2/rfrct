export type ExportSectionProps = {
  transparentBackground: boolean;
  setTransparentBackground: (v: boolean) => void;
  region: "full" | "image";
  setRegion: (v: "full" | "image") => void;
  hasImage: boolean;
  onExport1x: () => void;
  onExport2x: () => void;
};

export function ExportSection({
  transparentBackground,
  setTransparentBackground,
  region,
  setRegion,
  hasImage,
  onExport1x,
  onExport2x,
}: ExportSectionProps) {
  return (
    <>
      <h2 className="export-section__title">Export</h2>
      <section className="export-section">
        <div className="export-field">
          <span className="export-field__label">Transparent</span>
          <div
            className="export-toggle"
            role="group"
            aria-label="Transparent background in PNG"
          >
            <button
              type="button"
              className={`export-toggle__btn${transparentBackground ? " export-toggle__btn--on" : ""}`}
              onClick={() => setTransparentBackground(true)}
            >
              Yes
            </button>
            <button
              type="button"
              className={`export-toggle__btn${!transparentBackground ? " export-toggle__btn--on" : ""}`}
              onClick={() => setTransparentBackground(false)}
            >
              No
            </button>
          </div>
        </div>

        <div className="export-field">
          <span className="export-field__label">Region</span>
          <div
            className="export-toggle"
            role="group"
            aria-label="Export full canvas or image crop"
          >
            <button
              type="button"
              className={`export-toggle__btn${region === "full" ? " export-toggle__btn--on" : ""}`}
              onClick={() => setRegion("full")}
            >
              Canvas
            </button>
            <button
              type="button"
              disabled={!hasImage}
              title={
                hasImage
                  ? "Crop to the fitted image bounds"
                  : "Load an image to enable"
              }
              className={`export-toggle__btn${region === "image" ? " export-toggle__btn--on" : ""}`}
              onClick={() => hasImage && setRegion("image")}
            >
              Image
            </button>
          </div>
        </div>

        <div className="export-actions">
          <button
            type="button"
            className="export-actions__btn"
            onClick={onExport1x}
          >
            <span className="export-actions__icon" aria-hidden>
              ↓
            </span>
            PNG 1×
          </button>
          <button
            type="button"
            className="export-actions__btn"
            onClick={onExport2x}
          >
            <span className="export-actions__icon" aria-hidden>
              ↓
            </span>
            PNG 2×
          </button>
        </div>
      </section>
    </>
  );
}
