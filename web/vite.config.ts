import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Relative paths so the build works under any host path (e.g. GitHub Pages /scout-analyzer/).
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: here("./index.html"),
        embedCheck: here("./embed-check.html"),
      },
    },
  },
  test: {
    environment: "node",
  },
});
