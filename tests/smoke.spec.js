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
