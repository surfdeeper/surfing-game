import { expect, test } from '@playwright/test';

type StripDefinition = {
  testId: string;
  pageId: string;
};

/**
 * @deprecated Use defineStoryVisualTests instead
 */
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

/**
 * Story definition with id for visual testing.
 * The id is used to derive both the pageId and testId.
 */
type Story = {
  id: string; // e.g., 'energy-field/no-damping'
};

/**
 * Derives pageId from story id by prefixing with layer number.
 * Example: 'energy-field/no-damping' in layer '03-energy-field' -> '03-energy-field/01-no-damping'
 */
function derivePageId(layerPrefix: string, storyFileName: string): string {
  return `${layerPrefix}/${storyFileName}`;
}

/**
 * Derives testId from story id.
 * Matches App.tsx: testId={`strip-${story.id.replace(/\//g, '-')}`}
 */
function deriveTestId(storyId: string): string {
  return `strip-${storyId.replace(/\//g, '-')}`;
}

/**
 * Define visual tests for stories in a layer.
 *
 * @param layerPrefix - The layer folder name, e.g., '03-energy-field' or '09-foam-contours'
 * @param stories - Array of [storyFileName, story] tuples, e.g., [['01-no-damping', story], ...]
 */
export function defineStoryVisualTests(layerPrefix: string, stories: Array<[string, Story]>) {
  test.describe(`${layerPrefix} visual baselines`, () => {
    for (const [storyFileName, story] of stories) {
      const pageId = derivePageId(layerPrefix, storyFileName);
      const testId = deriveTestId(story.id);

      test(`${testId} matches baseline`, async ({ page }) => {
        await page.goto(`/?page=${pageId}`);
        await page.waitForSelector('[data-testid]', { timeout: 10000 });
        const element = page.locator(`[data-testid="${testId}"]`);
        await expect(element).toBeVisible();
        // Allow canvas rendering to complete
        await page.waitForTimeout(500);
        await expect(element).toHaveScreenshot(`${testId}.png`, {
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  });
}
