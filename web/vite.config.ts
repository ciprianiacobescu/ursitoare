// Build configuration for the web app (owner-maintained). The engine serves `web/dist` (docs/roadmap.md, M0).
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
});
