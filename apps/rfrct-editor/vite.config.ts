import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev / vite preview: base "/". Production build: "./" so asset URLs are relative — works on
// GitHub Pages (/rfrct/), localhost preview, and avoids 404s from /rfrct/... on :5173.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "serve" ? "/" : "./",
  server: {
    // Listen on all interfaces so localhost / 127.0.0.1 / LAN IP all work.
    host: true,
    port: 5173,
    // If 5173 is taken, use5174+ and print the real URL — always open what Vite prints.
    strictPort: false,
    open: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
