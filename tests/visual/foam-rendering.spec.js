import { test, expect } from '@playwright/test';

// Ladle uses hash-based routing: /?story=story-id
// Story IDs are kebab-case: "foam-rendering--zones-early-wave"

const stories = [
  { id: 'foam-rendering--zones-early-wave', name: 'Zones Early Wave' },
  { id: 'foam-rendering--zones-mid-wave', name: 'Zones Mid Wave' },
  { id: 'foam-rendering--zones-late-wave', name: 'Zones Late Wave' },
  { id: 'foam-rendering--samples-early-wave', name: 'Samples Early Wave' },
  { id: 'foam-rendering--samples-mid-wave', name: 'Samples Mid Wave' },
  { id: 'foam-rendering--comparison-mid-wave', name: 'Comparison Mid Wave' },
  { id: 'foam-rendering--small-wave', name: 'Small Wave' },
  { id: 'foam-rendering--large-wave', name: 'Large Wave' },
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

test.describe('Foam Rendering Animation Capture', () => {
  test('capture foam zones animation', async ({ page }) => {
    // This test records a video of the mid-wave story
    // The video can be converted to GIF later
    await page.goto('/?story=foam-rendering--zones-mid-wave');
    await page.waitForSelector('canvas');

    // Take multiple screenshots at "different times" by reloading
    // (In a real animation, we'd interact with the component)
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(200);
      const canvas = page.locator('canvas').first();
      await canvas.screenshot({ path: `tests/visual/results/animation-frame-${i}.png` });
    }
  });
});
