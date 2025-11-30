import { expect, test } from '@playwright/test';

type StripDefinition = {
  testId: string;
  pageId: string;
};

export function defineStripVisualTests(strips: StripDefinition[]) {
  const stripsByPage = strips.reduce<Record<string, StripDefinition[]>>((acc, strip) => {
    if (!acc[strip.pageId]) acc[strip.pageId] = [];
    acc[strip.pageId].push(strip);
    return acc;
  }, {});

  for (const [pageId, pageStrips] of Object.entries(stripsByPage)) {
    test.describe(`${pageId} visual baselines`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`/?page=${pageId}`);
        await page.waitForSelector('[data-testid]', { timeout: 10000 });
      });

      for (const strip of pageStrips) {
        test(`${strip.testId} matches baseline`, async ({ page }) => {
          const element = page.locator(`[data-testid="${strip.testId}"]`);
          await expect(element).toBeVisible();
          // Allow canvas rendering to complete
          await page.waitForTimeout(500);
          await expect(element).toHaveScreenshot(`${strip.testId}.png`, {
            maxDiffPixelRatio: 0.02,
          });
        });
      }
    });
  }
}
