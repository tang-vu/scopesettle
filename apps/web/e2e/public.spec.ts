import { expect, test } from "@playwright/test";

test("public visitor understands the product and opens a completed example", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Verified work.",
  );
  await expect(
    page.getByText("Verified work. Automatic settlement."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Inspect Testnet proof" }),
  ).toHaveAttribute(
    "href",
    "https://www.oklink.com/x-layer-testnet/tx/0x7016b1c12d0fcbf0c1a9b1b9eb7313ad8fb017e97c6d210e6adea3bdca2da330",
  );
  await expect(
    page.getByText(
      "X Layer · Testnet lifecycle + Mainnet contracts · source-verified",
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explore example report" }).click();
  await expect(page).toHaveURL(/\/jobs\/1952\/42$/u);
  await expect(page.getByText("Illustrative fixture.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI evidence by criterion" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Why this verdict was reached" }),
  ).toBeVisible();
  await expect(page.getByLabel("Weighted score formula")).toContainText(
    "94 × 40% + 88 × 30% + 91 × 30% = 91.3",
  );
  await expect(
    page.getByText("meets the locked 80-point threshold"),
  ).toBeVisible();
  await expect(page.getByText("meets the locked 75% threshold")).toBeVisible();
  await expect(page.getByText("Weighted score / 100")).toBeVisible();
});

test("dashboard distinguishes disconnected, deployment, and public-data states", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Connect to see your jobs" }),
  ).toBeVisible();
  await expect(page.getByText("Deploy pending")).toBeVisible();
  await expect(
    page.getByText("Illustrative fixture · no onchain transaction"),
  ).toBeVisible();
});

test("job creator validates before any wallet request", async ({ page }) => {
  await page.goto("/jobs/new");
  await page.getByRole("button", { name: "Review immutable job" }).click();
  const alert = page.locator(".error-summary");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Review");
  await expect(
    page.getByRole("button", { name: "Deployment required" }),
  ).toBeDisabled();
});

test("live job fails closed when chain or index reconciliation is unavailable", async ({
  page,
}) => {
  await page.goto("/jobs/1952/999");
  await expect(
    page.getByRole("heading", { name: "Live job temporarily unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByText("No cached status is being presented as final"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Retry reconciliation" }),
  ).toBeVisible();
});

test("mobile pages do not overflow horizontally", async ({ page }) => {
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  await page.goto("/jobs/1952/42");
  const jobDimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(jobDimensions.scroll).toBeLessThanOrEqual(jobDimensions.client + 1);
  await page.goto("/developers");
  await expect(
    page.getByRole("heading", { name: "Developer console" }),
  ).toBeVisible();
  const developerDimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(developerDimensions.scroll).toBeLessThanOrEqual(
    developerDimensions.client + 1,
  );
});
