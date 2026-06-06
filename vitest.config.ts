import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "import.meta.env.DEV": JSON.stringify(true),
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "astro:env/server": path.resolve(import.meta.dirname, "./tests/mocks/astro-env-server.ts"),
      "astro:middleware": path.resolve(import.meta.dirname, "./tests/mocks/astro-middleware.ts"),
    },
  },
});
