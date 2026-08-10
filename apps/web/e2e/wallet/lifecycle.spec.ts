import { expect, test } from "@playwright/test";

import {
  accounts,
  connectWallet,
  installMockWallet,
  mockAuthentication,
  mockRpc,
} from "./support";

test("connects on the wrong network and switches to X Layer Testnet", async ({
  page,
}) => {
  await installMockWallet(page, { chainId: 1 });
  await page.goto("/jobs/new");
  await page
    .getByRole("button", { exact: true, name: "Connect wallet" })
    .click();
  const switchButton = page.getByRole("button", {
    name: "Switch to Testnet",
  });
  await expect(switchButton).toBeVisible();
  await switchButton.click();
  await expect(
    page.getByRole("button", { name: /0x0000.*cafe/iu }),
  ).toBeVisible();
});

test("resumes create and funding after wallet rejection without a duplicate job", async ({
  page,
}) => {
  await installMockWallet(page, { rejectTransactionAt: 2 });
  await mockAuthentication(page);
  await mockRpc(page);
  await page.route("**/api/jobs", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { jobId: "7" },
      status: 201,
    });
  });
  await page.goto("/jobs/new");
  await connectWallet(page);
  await page.getByLabel("Job title").fill("Idempotent settlement API");
  await page
    .getByLabel("Detailed scope")
    .fill("Implement a deterministic settlement endpoint with safe retries.");
  await page
    .getByLabel("Public repository URL")
    .fill("https://github.com/scopesettle/scopesettle");
  await page.getByLabel("Provider wallet").fill(accounts.provider);
  await page.getByRole("button", { name: "Review immutable job" }).click();
  await page.getByRole("button", { name: "Create and fund job" }).click();

  await expect(page.locator(".error-summary")).toContainText(
    "wallet request was rejected",
  );
  await expect(
    page.getByRole("button", { name: "Resume funding job 7" }),
  ).toBeVisible();
  await expect(page.getByLabel("Job title")).toBeDisabled();
  await page.getByRole("button", { name: "Resume funding job 7" }).click();
  await page.waitForURL("**/jobs/1952/7");

  const transactions = await page.evaluate(() => {
    const state = (
      window as typeof window & {
        __scopeSettleMockWallet: {
          sentTransactions: Array<{ data?: string }>;
        };
      }
    ).__scopeSettleMockWallet;
    return state.sentTransactions;
  });
  expect(transactions).toHaveLength(5);
  expect(
    transactions.filter(
      (transaction) => transaction.data === transactions[0]?.data,
    ),
  ).toHaveLength(1);
});

test("handles provider submission, evaluation, verdict proposal, and finalization", async ({
  page,
}) => {
  await installMockWallet(page, { account: accounts.provider });
  await mockAuthentication(page);
  await mockRpc(page);
  await page.route("**/api/jobs/1952/7/deliverable/prepare", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        deliverable: {
          baseSha: "a".repeat(40),
          headSha: "b".repeat(40),
          owner: "scopesettle",
          pullNumber: 9,
          repository: "scopesettle",
        },
        deliverableHash: `0x${"44".repeat(32)}`,
      },
      status: 200,
    });
  });
  await page.route("**/api/jobs/1952/7/deliverable", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {},
      status: 201,
    });
  });
  await page.goto("/e2e-actions?stage=funded");
  await connectWallet(page, "beef");
  await page
    .getByLabel("Public GitHub pull request")
    .fill("https://github.com/scopesettle/scopesettle/pull/9");
  const deliverableSaved = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/jobs/1952/7/deliverable") &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: "Pin and submit commit" }).click();
  await deliverableSaved;
  await expect(
    page.getByRole("button", { name: "Pin and submit commit" }),
  ).toBeEnabled();

  await page.route("**/api/jobs/1952/7/evaluate", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {},
      status: 201,
    });
  });
  await page.goto("/e2e-actions?stage=submitted");
  const evaluationRequested = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/jobs/1952/7/evaluate") &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: "Run evidence evaluation" }).click();
  await evaluationRequested;
  await expect(
    page.getByRole("button", { name: "Run evidence evaluation" }),
  ).toBeEnabled();

  await page.goto("/e2e-actions?stage=signed");
  await page.getByRole("button", { name: "Propose signed verdict" }).click();
  await expect(
    page.getByRole("button", { name: "Propose signed verdict" }),
  ).toBeEnabled();

  await page.goto("/e2e-actions?stage=finalizable");
  await page.getByRole("button", { name: "Finalize permissionlessly" }).click();
  await expect(
    page.getByRole("button", { name: "Finalizing settlement" }),
  ).toBeHidden();
});

test("reviewer resolves challenged evidence with an explicit reason", async ({
  page,
}) => {
  await installMockWallet(page, { account: accounts.reviewer });
  await mockRpc(page);
  await page.goto("/e2e-actions?stage=challenged");
  await page
    .getByRole("button", { exact: true, name: "Connect wallet" })
    .click();
  await page
    .getByLabel("Manual review decision")
    .fill(
      "CI evidence confirms the requested behavior and regression coverage.",
    );
  await page.getByRole("button", { name: "Approve and release" }).click();
  await expect(page.getByText("Approving manual review")).toBeHidden();
});
