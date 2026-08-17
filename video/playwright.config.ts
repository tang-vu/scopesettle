import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "capture-v2.spec.ts",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3420",
    viewport: { width: 1920, height: 1080 },
  },
  webServer: {
    command: "pnpm --dir ../apps/web exec next dev --port 3420",
    env: {
      NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS:
        "0x1111111111111111111111111111111111111111",
      NEXT_PUBLIC_APP_URL: "http://localhost:3420",
      NEXT_PUBLIC_DEFAULT_CHAIN_ID: "1952",
      NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS:
        "0x3333333333333333333333333333333333333333",
      NEXT_PUBLIC_SCOPESETTLE_EVALUATOR_ADDRESS:
        "0x2222222222222222222222222222222222222222",
      SCOPESETTLE_E2E: "1",
    },
    url: "http://localhost:3420",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "capture", use: { ...devices["Desktop Chrome"] } }],
});
