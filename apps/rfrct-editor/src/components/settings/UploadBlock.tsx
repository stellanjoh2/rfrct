type UploadBlockProps = {
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string | null;
  onRemoveFile: () => void;
};

export function UploadBlock({ onFile, fileName, onRemoveFile }: UploadBlockProps) {
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
            accept="image/*,.svg+xml"
            onChange={onFile}
            aria-label="Upload raster or SVG image"
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
