import { test, expect } from "@playwright/test";

test.describe("Patch & Diff Panel Flow", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.bringToFront();
  });

  test("renders diff panel and shows empty paste dropzone", async ({ page }) => {
    await page.goto("/");

    const dropzone = page.locator("text=/Click to paste response/i");
    await expect(dropzone).toBeVisible();
  });

  test("handles pasted patch block and displays diff card", async ({ page }) => {
    await page.goto("/");

    const searchMarker = "<".repeat(7) + " SEARCH";
    const equalsMarker = "=".repeat(7);
    const replaceMarker = ">".repeat(7) + " REPLACE";

    const sampleDiff = [
      "FILE: server/services/sampleService.ts",
      searchMarker,
      "const count = 0;",
      equalsMarker,
      "const count = 1;",
      replaceMarker,
    ].join("\n");

    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, sampleDiff);

    const dropzone = page.locator("text=/Click to paste response/i");
    await dropzone.click();

    const diffHeader = page.locator("text=/server\\/services\\/sampleService\\.ts/i");
    await expect(diffHeader).toBeVisible({ timeout: 10000 });
  });
});