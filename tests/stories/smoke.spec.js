import { test, expect } from '@playwright/test';

test('stories viewer loads without JavaScript errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  // Wait for the sidebar navigation to be present
  await expect(page.locator('nav')).toBeVisible();

  // Wait for content to load
  await expect(page.locator('main')).toBeVisible();

  // Let the app run for a moment to catch runtime errors
  await page.waitForTimeout(1000);

  // No JS errors should have occurred
  expect(errors).toEqual([]);
});

test('stories viewer shows MDX content with sections', async ({ page }) => {
  await page.goto('/');

  // Wait for navigation
  await expect(page.locator('nav')).toBeVisible();

  // Should have page entries in the sidebar
  const navButtons = page.locator('nav button');
  await expect(navButtons.first()).toBeVisible();

  // Main content should have sections
  await page.waitForTimeout(500); // Let MDX render
  const sections = page.locator('main section[id]');
  const sectionCount = await sections.count();
  expect(sectionCount).toBeGreaterThan(0);
});

test('stories viewer can navigate between pages', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('nav')).toBeVisible();

  // Get all page buttons in sidebar
  const navButtons = page.locator('nav ul > li > button');
  const buttonCount = await navButtons.count();
  expect(buttonCount).toBeGreaterThan(1);

  // Click the second page
  await navButtons.nth(1).click();
  await page.waitForTimeout(500);

  // URL should have changed
  const url = page.url();
  expect(url).toContain('page=');

  // No errors during navigation
  expect(errors).toEqual([]);
});

test('presentation mode can be entered and exited', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('nav')).toBeVisible();

  // Enter presentation mode by pressing 'P'
  await page.keyboard.press('p');
  await page.waitForTimeout(500);

  // Should see presentation mode header with Exit button
  await expect(page.getByRole('button', { name: 'Exit' })).toBeVisible();

  // URL should have mode=presentation
  expect(page.url()).toContain('mode=presentation');

  // Exit with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Should be back to normal mode (sidebar visible)
  await expect(page.locator('nav')).toBeVisible();

  // No errors
  expect(errors).toEqual([]);
});

test('presentation mode shows sections one at a time', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?mode=presentation');

  // Should be in presentation mode
  await expect(page.getByRole('button', { name: 'Exit' })).toBeVisible();

  // Wait for sections to load and CSS to apply
  await page.waitForTimeout(2000);

  // Only one section should be visible (others have display: none)
  const allSections = page.locator('main section[id]');
  const allCount = await allSections.count();
  expect(allCount).toBeGreaterThan(1); // Should have multiple sections in DOM

  // Count visible sections by checking computed style
  const visibleCount = await page.evaluate(() => {
    const sections = document.querySelectorAll('main section[id]');
    let visible = 0;
    sections.forEach((s) => {
      if (getComputedStyle(s).display !== 'none') visible++;
    });
    return visible;
  });
  expect(visibleCount).toBe(1);

  // No errors
  expect(errors).toEqual([]);
});

test('presentation mode navigation works', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?mode=presentation');

  // Wait for sections to be extracted and initial section to be set
  await page.waitForTimeout(1000);

  // Get initial section from URL
  const initialUrl = page.url();

  // Get initial visible section
  const initialSection = await page.evaluate(() => {
    const sections = document.querySelectorAll('main section[id]');
    for (const s of sections) {
      if (getComputedStyle(s).display !== 'none') return s.id;
    }
    return null;
  });
  expect(initialSection).toBeTruthy();

  // Navigate to next section with arrow key
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);

  // Check which section is now visible
  const newSection = await page.evaluate(() => {
    const sections = document.querySelectorAll('main section[id]');
    for (const s of sections) {
      if (getComputedStyle(s).display !== 'none') return s.id;
    }
    return null;
  });

  // Section should have changed (or we moved to next file)
  const newUrl = page.url();
  const sectionChanged = newSection !== initialSection;
  const urlChanged = newUrl !== initialUrl;
  expect(sectionChanged || urlChanged).toBe(true);

  // Navigate back
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);

  // No errors during navigation
  expect(errors).toEqual([]);
});

test('visual components render in stories', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);

  // Look for canvas elements (BathymetryStrip renders to canvas)
  const canvases = page.locator('canvas');
  const canvasCount = await canvases.count();

  // Should have at least one canvas for the visual components
  expect(canvasCount).toBeGreaterThan(0);

  // First canvas should have dimensions
  const firstCanvas = canvases.first();
  const box = await firstCanvas.boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
});
