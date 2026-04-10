/**
 * URLs for files in `public/` — must respect Vite `base` (e.g. GitHub Pages `/repo/`).
 */
export function publicUrl(pathFromPublic: string): string {
  const trimmed = pathFromPublic.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${trimmed}`;
}
