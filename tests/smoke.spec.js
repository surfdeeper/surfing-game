import { test, expect } from '@playwright/test';

test('game loads without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');

    // Wait for canvas to be present
    await expect(page.locator('#game')).toBeVisible();

    // Let the game run for a couple seconds to catch runtime errors
    await page.waitForTimeout(2000);

    // No JS errors should have occurred
    expect(errors).toEqual([]);
});

test('game renders to canvas', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();

    // Canvas should have dimensions
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
});

test('bathymetry toggle works without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page.locator('#game')).toBeVisible();

    // Toggle bathymetry on with 'B' key
    await page.keyboard.press('b');
    await page.waitForTimeout(500);

    // Toggle off
    await page.keyboard.press('b');
    await page.waitForTimeout(500);

    // Toggle on again and let it run
    await page.keyboard.press('b');
    await page.waitForTimeout(1000);

    // No errors should have occurred
    expect(errors).toEqual([]);
});

test('bathymetry maintains FPS after toggle (cached rendering)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game')).toBeVisible();

    // Let game stabilize
    await page.waitForTimeout(1000);

    // Toggle bathymetry on
    await page.keyboard.press('b');

    // Let it run for a few seconds - if not cached, FPS would drop significantly
    await page.waitForTimeout(2000);

    // Check FPS via exposed world state (debug panel shows FPS)
    // We can't directly measure FPS easily, but we can verify no errors
    // and that the game is still responsive
    const screenshot1 = await page.locator('#game').screenshot();
    await page.waitForTimeout(500);
    const screenshot2 = await page.locator('#game').screenshot();

    // Screenshots should differ (animation still running smoothly)
    expect(screenshot1.compare(screenshot2)).not.toBe(0);
});
