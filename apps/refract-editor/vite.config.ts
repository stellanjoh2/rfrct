import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev / vite preview: base "/". Production build: "./" so asset URLs are relative — works on
// GitHub Pages (/rfrct/), localhost preview, and avoids 404s from /rfrct/... on :5173.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "serve" ? "/" : "./",
  server: {
    // Avoid some browsers resolving "localhost" to IPv4 while Node only listens on IPv6.
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
}));
