import { expect, test } from "@playwright/test";

test("serves hardened browser headers and private API cache policy", async ({
  page,
  request,
}) => {
  const response = await page.goto("/");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  const api = await request.get("/api/examples/report");
  expect(api.headers()["cache-control"]).toContain("no-store");
});

test("publishes crawl, install, and social metadata without exposing the test harness", async ({
  request,
}) => {
  const [robots, sitemap, manifest, socialImage, harness] = await Promise.all([
    request.get("/robots.txt"),
    request.get("/sitemap.xml"),
    request.get("/manifest.webmanifest"),
    request.get("/opengraph-image"),
    request.get("/e2e-actions"),
  ]);
  expect(await robots.text()).toContain("Disallow: /api/");
  expect(await sitemap.text()).toContain("/jobs/1952/42");
  expect((await manifest.json()).name).toContain("ScopeSettle");
  expect(socialImage.headers()["content-type"]).toContain("image/png");
  expect(harness.status()).toBe(404);
});
