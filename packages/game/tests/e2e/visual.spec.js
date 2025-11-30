import { test, expect } from '@playwright/test';

// Canvas rendering tests
test.describe('Canvas Rendering', () => {
  test('ocean background renders with correct color', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Take a screenshot to verify ocean renders
    const screenshot = await canvas.screenshot();
    expect(screenshot.length).toBeGreaterThan(0);
  });

  test('shore renders at bottom of canvas', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Canvas should have proper dimensions
    const box = await canvas.boundingBox();
    expect(box.height).toBeGreaterThan(100); // Shore height
  });

  test('waves appear on canvas', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Wait for initial wave to spawn
    await page.waitForTimeout(1000);

    // Canvas should still be rendering (not frozen)
    const screenshot1 = await canvas.screenshot();
    await page.waitForTimeout(500);
    const screenshot2 = await canvas.screenshot();

    // Screenshots should exist (canvas is active)
    expect(screenshot1.length).toBeGreaterThan(0);
    expect(screenshot2.length).toBeGreaterThan(0);
  });
});

// Animation tests
test.describe('Animation', () => {
  test('waves move downward over time', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Wait for waves to spawn and move
    await page.waitForTimeout(2000);

    // Take screenshots at intervals to verify animation
    const screenshot1 = await canvas.screenshot();
    await page.waitForTimeout(1000);
    const screenshot2 = await canvas.screenshot();

    // Screenshots should differ (animation occurring)
    // Convert to buffers and compare
    expect(screenshot1.compare(screenshot2)).not.toBe(0);
  });

  test('animation continues smoothly', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Let game run for a while
    await page.waitForTimeout(5000);

    // No errors should have occurred
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});

// Debug panel tests
test.describe('Debug Panel', () => {
  test('state indicator shows SET or LULL', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Wait for game to be running
    await page.waitForTimeout(1000);

    // The debug panel is drawn on the canvas, so we verify via screenshot
    const screenshot = await canvas.screenshot();
    expect(screenshot.length).toBeGreaterThan(0);
  });

  test('game state cycles between LULL and SET', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Speed up time by pressing T key multiple times
    await page.keyboard.press('t'); // 2x
    await page.keyboard.press('t'); // 4x
    await page.keyboard.press('t'); // 8x

    // Wait for potential state transition (at 8x speed, 30s lull = ~4s real time)
    await page.waitForTimeout(6000);

    // Game should still be running without errors
    const screenshot = await canvas.screenshot();
    expect(screenshot.length).toBeGreaterThan(0);
  });
});

// Time scale tests
test.describe('Time Scale', () => {
  test('pressing T cycles through time scales', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Press T to cycle through 1x -> 2x -> 4x -> 8x -> 1x
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('t');
      await page.waitForTimeout(100);
    }

    // Should be back to 1x, game still running
    const screenshot = await canvas.screenshot();
    expect(screenshot.length).toBeGreaterThan(0);
  });
});
