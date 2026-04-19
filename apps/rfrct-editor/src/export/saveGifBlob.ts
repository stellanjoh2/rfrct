export type SaveGifBlobResult = {
  filename: string;
  mode: "download" | "directory";
};

/**
 * Writes a GIF blob either into a user-selected directory (File System Access API)
 * or triggers a browser download.
 */
export async function saveGifBlob(
  blob: Blob,
  dir: FileSystemDirectoryHandle | null,
  basename: string,
): Promise<SaveGifBlobResult> {
  const filename = `${basename}-${Date.now()}.gif`;
  if (dir) {
    const fh = await dir.getFileHandle(filename, { create: true });
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
    return { filename, mode: "directory" };
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
  return { filename, mode: "download" };
}
