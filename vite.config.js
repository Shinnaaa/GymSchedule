import { defineConfig } from "vite";

// Relative asset paths, so the build works under any GitHub Pages sub-path.
export default defineConfig({
  base: "./",
  test: { environment: "node" },
});
