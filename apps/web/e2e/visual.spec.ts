import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";

test("capture responsive product QA artifacts", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  await page.goto(mobile ? "/jobs/1952/42" : "/");
  await expect(page.locator("main")).toBeVisible();
  const output = fileURLToPath(
    new URL(
      mobile
        ? "../../../docs/assets/job-mobile.png"
        : "../../../docs/assets/product-preview.png",
      import.meta.url,
    ),
  );
  await page.screenshot({ fullPage: true, path: output });
});
