import "./tests/setup";
import { defineConfig, devices } from "@playwright/test";

const devServerEnv: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) {
    devServerEnv[key] = value;
  }
}

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  // Single worker avoids Vite 404s when multiple browser contexts hydrate islands at once.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4322",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:local -- --host 127.0.0.1 --port 4322",
    url: "http://127.0.0.1:4322",
    reuseExistingServer: false,
    timeout: 180_000,
    env: devServerEnv,
  },
  globalSetup: "./tests/e2e/global-setup.ts",
});
