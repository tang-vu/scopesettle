import { expect, test } from "@playwright/test";
import path from "node:path";

import {
  connectWallet,
  installMockWallet,
} from "../apps/web/e2e/wallet/support";

const asset = (name: string) => path.resolve(__dirname, "assets", name);

test("capture public verification certificate", async ({ page }) => {
  await page.goto("https://scopesettle.vercel.app/jobs/1952/3", {
    waitUntil: "networkidle",
  });
  const certificate = page.locator(".verification-certificate");
  await expect(certificate).toContainText("10 reproducible checks");
  await certificate.scrollIntoViewIfNeeded();
  await page.screenshot({ path: asset("verification-certificate-v2.png") });
});

test("capture developer console local UI fixture", async ({ page }) => {
  await installMockWallet(page);
  const organizationId = "11111111-1111-4111-8111-111111111111";
  await page.route("**/api/developer/organizations", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizations: [
          {
            id: organizationId,
            name: "Demo workspace",
            role: "owner",
            createdAt: "2026-08-17T00:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.route("**/api/developer/api-keys?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        keys: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Production verifier",
            prefix: "7f12a91c40e52b8d",
            scopes: ["jobs:read", "reports:read"],
            expiresAt: null,
            lastUsedAt: "2026-08-17T00:03:00.000Z",
            revokedAt: null,
            createdAt: "2026-08-17T00:00:00.000Z",
          },
        ],
      },
    }),
  );
  await page.route("**/api/developer/webhooks?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        endpoints: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Evaluation events",
            url: "https://api.example.com/scopesettle",
            eventTypes: ["deliverable.submitted", "evaluation.completed"],
            chainId: 1952,
            jobId: "3",
            active: true,
          },
        ],
      },
    }),
  );
  await page.route("**/api/developer/webhook-deliveries?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { deliveries: [] },
    }),
  );
  await page.route("**/api/developer/audit?**", (route) =>
    route.fulfill({ contentType: "application/json", json: { events: [] } }),
  );

  await page.goto("/developers");
  await connectWallet(page);
  await expect(page.getByRole("heading", { name: "API keys" })).toBeVisible();
  await page.locator(".developer-grid").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const badge = document.createElement("div");
    badge.textContent = "LOCAL UI FIXTURE · NO PRODUCTION CREDENTIALS";
    badge.style.cssText =
      "position:fixed;z-index:9999;top:22px;left:22px;padding:10px 14px;border:1px solid #b8ff5a;background:#0a0c0b;color:#b8ff5a;font:700 15px Consolas;letter-spacing:1px";
    document.body.append(badge);
  });
  await page.screenshot({ path: asset("developer-console-v2.png") });
});

test("capture verified CLI scene", async ({ page }) => {
  await page.setContent(`
    <style>
      *{box-sizing:border-box} body{margin:0;background:#080b09;color:#eef1e9;font-family:Inter,Arial,sans-serif}
      body:before{content:"";position:fixed;inset:0;background-image:linear-gradient(#b8ff5a0b 1px,transparent 1px),linear-gradient(90deg,#b8ff5a0b 1px,transparent 1px);background-size:64px 64px}
      main{position:relative;width:1600px;margin:110px auto}.kicker{color:#b8ff5a;font:700 18px Consolas;letter-spacing:2px}.title{font-size:66px;line-height:1.04;margin:18px 0 42px;letter-spacing:-3px}.terminal{border:1px solid #344034;border-radius:12px;background:#0d110e;box-shadow:0 35px 100px #0009;overflow:hidden}.bar{height:52px;border-bottom:1px solid #283128;padding:17px 24px;color:#7f8a80;font:14px Consolas}.body{padding:34px 40px;font:20px/1.8 Consolas}.command{color:#dbe3d7}.pass{color:#b8ff5a}.dim{color:#8a958b}.result{display:flex;justify-content:space-between;border-top:1px solid #283128;padding:24px 40px;font:700 22px Consolas}.hash{color:#909b91}.verified{color:#b8ff5a}
    </style>
    <main>
      <div class="kicker">INDEPENDENT VERIFICATION · X LAYER RPC</div>
      <h1 class="title">Trust the commitments.<br/>Not the ScopeSettle server.</h1>
      <section class="terminal">
        <div class="bar">scopesettle verifier · Testnet job 3</div>
        <div class="body">
          <div class="command">$ scopesettle --chain-id 1952 --job-id 3 --report report.json --specification specification.json</div>
          <div><span class="pass">PASS</span> <span class="dim">Canonical report hash</span></div>
          <div><span class="pass">PASS</span> <span class="dim">Funded specification + rubric commitment</span></div>
          <div><span class="pass">PASS</span> <span class="dim">Evaluator contract + pinned deliverable binding</span></div>
          <div><span class="pass">PASS</span> <span class="dim">Onchain verdict commitment</span></div>
        </div>
        <div class="result"><span class="verified">VERIFIED · 10 / 10 CHECKS</span><span class="hash">report 0xe76ff0…0181f</span></div>
      </section>
    </main>
  `);
  await page.screenshot({ path: asset("verifier-cli-v2.png") });
});
