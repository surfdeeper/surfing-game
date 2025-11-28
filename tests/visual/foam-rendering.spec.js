import { test, expect } from '@playwright/test';

// Ladle uses hash-based routing: /?story=story-id
// Story IDs match exports from FoamRendering.stories.jsx

const stories = [
  { id: 'foam-rendering--current-behavior', name: 'Current Behavior' },
  { id: 'foam-rendering--option-a-expand-bounds', name: 'Option A Expand Bounds' },
  { id: 'foam-rendering--option-b-age-blur', name: 'Option B Age Blur' },
  { id: 'foam-rendering--option-c-dispersion-radius', name: 'Option C Dispersion Radius' },
  { id: 'foam-rendering--compare-all-options', name: 'Compare All Options' },
  { id: 'foam-rendering--full-comparison-matrix', name: 'Full Comparison Matrix' },
  { id: 'foam-rendering--wave-size-comparison', name: 'Wave Size Comparison' },
];

test.describe('Foam Rendering Visual Tests', () => {
  for (const story of stories) {
    test(`${story.name} matches snapshot`, async ({ page }) => {
      // Navigate to the story
      await page.goto(`/?story=${story.id}`);

      // Wait for canvas to be rendered
      await page.waitForSelector('canvas');

      // Small delay to ensure rendering is complete
      await page.waitForTimeout(500);

      // Take screenshot of the canvas only
      const canvas = page.locator('canvas').first();
      await expect(canvas).toHaveScreenshot(`${story.id}.png`);
    });
  }
});
