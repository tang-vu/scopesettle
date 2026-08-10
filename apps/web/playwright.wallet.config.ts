import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/wallet",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3418",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec next dev --port 3418",
    env: {
      NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS:
        "0x1111111111111111111111111111111111111111",
      NEXT_PUBLIC_APP_URL: "http://localhost:3418",
      NEXT_PUBLIC_DEFAULT_CHAIN_ID: "1952",
      NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS:
        "0x3333333333333333333333333333333333333333",
      NEXT_PUBLIC_SCOPESETTLE_EVALUATOR_ADDRESS:
        "0x2222222222222222222222222222222222222222",
      SCOPESETTLE_E2E: "1",
    },
    url: "http://localhost:3418",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "wallet", use: { ...devices["Desktop Chrome"] } }],
});
