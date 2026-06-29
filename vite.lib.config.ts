import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/lib",
    lib: {
      entry: resolve(__dirname, "app/interfaces/rain_iso/browser/index.ts"),
      name: "RainIsoBrowser",
      fileName: "rain-iso-browser",
      formats: ["es"]
    }
  },
  worker: {
    format: "es"
  }
});
