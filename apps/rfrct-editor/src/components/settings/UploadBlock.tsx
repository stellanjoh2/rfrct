type UploadBlockProps = {
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string | null;
  onRemoveFile: () => void;
  accept?: string;
  uploadAriaLabel?: string;
};

export function UploadBlock({
  onFile,
  fileName,
  onRemoveFile,
  accept = "image/*,.svg+xml",
  uploadAriaLabel = "Upload raster or SVG image",
}: UploadBlockProps) {
  const hasFile = Boolean(fileName);
  return (
    <div className="upload-block">
      <div className="file-btn-wrap">
        <label className={`file-btn${hasFile ? " file-btn--has-remove" : ""}`}>
          <span className="file-btn__content">
            <span className="file-btn__name">{hasFile ? fileName : "Upload image"}</span>
          </span>
          <input
            type="file"
            accept={accept}
            onChange={onFile}
            aria-label={uploadAriaLabel}
          />
        </label>
        {hasFile ? (
          <button
            type="button"
            className="file-btn__remove"
            onClick={onRemoveFile}
            aria-label={`Remove ${fileName}`}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
