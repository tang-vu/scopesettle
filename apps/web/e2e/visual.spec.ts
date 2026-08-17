import { expect, test } from "@playwright/test";

test("capture responsive product QA artifacts", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  await page.goto(mobile ? "/jobs/1952/42" : "/");
  await expect(page.locator("main")).toBeVisible();
  const artifactName = mobile ? "job-mobile.png" : "product-preview.png";
  const output = testInfo.outputPath(artifactName);

  await page.screenshot({ fullPage: true, path: output });
  await testInfo.attach(artifactName, {
    contentType: "image/png",
    path: output,
  });
});
