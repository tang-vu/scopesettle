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
  await page.getByRole("link", { name: "Explore a verified job" }).click();
  await expect(page).toHaveURL(/\/jobs\/1952\/42$/u);
  await expect(page.getByText("Illustrative fixture.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI evidence by criterion" }),
  ).toBeVisible();
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
});
