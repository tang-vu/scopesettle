import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "wallet/**",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3417",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec next dev --port 3417",
    env: {
      NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS: "",
      NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS: "",
      NEXT_PUBLIC_SCOPESETTLE_EVALUATOR_ADDRESS: "",
    },
    url: "http://localhost:3417",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
