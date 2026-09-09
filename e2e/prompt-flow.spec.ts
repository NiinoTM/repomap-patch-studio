import { test, expect } from "@playwright/test";

test.describe("Prompt Builder Flow", () => {
  test.beforeEach(async ({ context, page }) => {
    // Grant clipboard permissions for automated clipboard actions in headless mode
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.bringToFront();

    // In-memory clipboard stub to prevent Chromium "Document is not focused" DOMException in UI mode
    await page.addInitScript(() => {
      let memoryClipboard = "";
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (text: string) => {
            memoryClipboard = text;
          },
          readText: async () => memoryClipboard,
        },
        configurable: true,
      });
    });
  });

  test("renders prompt builder and copies full context prompt", async ({ page }) => {
    await page.goto("/");

    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await textarea.fill("Refactor authentication error handling");

    const fullContextButton = page.getByRole("button", { name: /Full Context/i });
    await expect(fullContextButton).toBeVisible();
    await fullContextButton.click();

    const toast = page.locator("text=/copied to clipboard/i");
    await expect(toast).toBeVisible({ timeout: 10000 });
  });

  test("displays Test Prompt button for unit test generation", async ({ page }) => {
    await page.goto("/");

    const textarea = page.locator("textarea");
    await textarea.fill("Add edge case coverage for parser");

    const testPromptButton = page.getByRole("button", { name: /Test Prompt/i });
    await expect(testPromptButton).toBeVisible();
  });
});