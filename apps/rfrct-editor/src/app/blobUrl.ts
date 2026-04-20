export function revokeSvgObjectUrlIfBlob(url: string | null): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}
