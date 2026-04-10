type UploadBlockProps = {
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function UploadBlock({ onFile }: UploadBlockProps) {
  return (
    <div className="upload-block">
      <label className="file-btn">
        Upload image
        <input
          type="file"
          accept="image/*,.svg+xml"
          onChange={onFile}
          aria-label="Upload raster or SVG image"
        />
      </label>
    </div>
  );
}
