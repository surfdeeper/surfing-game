import { test, expect } from '@playwright/test';

// Progression strip visual regression tests
// Each strip is a film strip showing all frames of a progression side-by-side

const STRIPS = ['strip-no-damping', 'strip-with-damping', 'strip-high-damping', 'strip-with-drain'];

test.describe('Progression Strips', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to stories page (baseURL from config)
    await page.goto('/');
    // Wait for React to render
    await page.waitForSelector('[data-testid]', { timeout: 10000 });
  });

  for (const testId of STRIPS) {
    test(`${testId} matches baseline`, async ({ page }) => {
      const strip = page.locator(`[data-testid="${testId}"]`);
      await expect(strip).toBeVisible();

      // Screenshot the strip element
      await expect(strip).toHaveScreenshot(`${testId}.png`, {
        // Allow small differences for anti-aliasing
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
