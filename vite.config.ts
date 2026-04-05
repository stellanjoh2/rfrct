import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project Pages URL: https://stellanjoh2.github.io/rfrct/
const pagesBase = "/rfrct/";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? pagesBase : "/",
}));
