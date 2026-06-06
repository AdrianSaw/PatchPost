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
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:local",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: devServerEnv,
  },
  globalSetup: "./tests/e2e/global-setup.ts",
});
