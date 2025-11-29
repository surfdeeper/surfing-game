import { test, expect } from '@playwright/test';

// Import all strips from their colocated progression files
import { BATHYMETRY_STRIPS } from '../../src/render/bathymetryProgressions';
import { SHOALING_STRIPS } from '../../src/render/shoalingProgressions';
import { WAVE_BREAKING_STRIPS } from '../../src/render/waveBreakingProgressions';
import { ENERGY_TRANSFER_STRIPS } from '../../src/render/energyTransferProgressions';
import { FOAM_GRID_STRIPS } from '../../src/render/foamGridProgressions';
import { FOAM_DISPERSION_STRIPS } from '../../src/render/foamDispersionProgressions';
import { FOAM_CONTOUR_STRIPS } from '../../src/render/foamContoursProgressions';
import { ENERGY_FIELD_STRIPS } from '../../src/state/energyFieldProgressions';

// Combine all strips with their page info for navigation
const ALL_STRIPS = [
  ...BATHYMETRY_STRIPS,
  ...ENERGY_FIELD_STRIPS,
  ...SHOALING_STRIPS,
  ...WAVE_BREAKING_STRIPS,
  ...ENERGY_TRANSFER_STRIPS,
  ...FOAM_GRID_STRIPS,
  ...FOAM_DISPERSION_STRIPS,
  ...FOAM_CONTOUR_STRIPS,
];

// Group strips by page for efficient navigation
const stripsByPage = ALL_STRIPS.reduce(
  (acc, strip) => {
    const page = strip.pageId;
    if (!acc[page]) acc[page] = [];
    acc[page].push(strip);
    return acc;
  },
  {} as Record<string, typeof ALL_STRIPS>
);

test.describe('Visual Regression Tests', () => {
  for (const [pageId, strips] of Object.entries(stripsByPage)) {
    test.describe(`Page: ${pageId}`, () => {
      test.beforeEach(async ({ page }) => {
        // Navigate to the specific story page
        await page.goto(`/?page=${pageId}`);
        // Wait for React to render
        await page.waitForSelector('[data-testid]', { timeout: 10000 });
      });

      for (const strip of strips) {
        test(`${strip.testId} matches baseline`, async ({ page }) => {
          const element = page.locator(`[data-testid="${strip.testId}"]`);
          await expect(element).toBeVisible();

          // Screenshot the strip element
          await expect(element).toHaveScreenshot(`${strip.testId}.png`, {
            // Allow small differences for anti-aliasing
            maxDiffPixelRatio: 0.01,
          });
        });
      }
    });
  }
});
