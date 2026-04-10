import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Production base: `./` by default; set `VITE_BASE=/repo-name/` for GitHub Pages project sites. */
function productionBase(): string {
  const raw = process.env.VITE_BASE?.trim();
  if (!raw) return "./";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "serve" ? "/" : productionBase(),
  server: {
    // Listen on all interfaces so http://localhost:5174 and http://127.0.0.1:5174 both work.
    host: true,
    // 5173 = refrct-editor; Blod prefers 5174 so both can run at once.
    port: 5174,
    strictPort: false,
  },
}));
