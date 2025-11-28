import { test, expect } from '@playwright/test';

// Tests for set wave spawning behavior
// Verifies that set waves spawn during SET state and not during LULL state

test.describe('Set Wave Spawning', () => {
    test('game starts in LULL state', async ({ page }) => {
        // Clear localStorage before navigation
        await page.addInitScript(() => localStorage.clear());
        await page.goto('/');
        await expect(page.locator('#game')).toBeVisible();

        // Wait for world to be exposed
        await page.waitForFunction(() => window.world !== undefined);

        // Check state machine is in LULL
        const state = await page.evaluate(() => window.world?.setLullState?.setState);
        expect(state).toBe('LULL');
    });

    test('set waves spawn when state transitions to SET', async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
        await page.goto('/');
        await expect(page.locator('#game')).toBeVisible();

        // Wait for world to be available
        await page.waitForFunction(() => window.world !== undefined);

        // Use 8x time scale to speed up the test
        // Press 'T' three times to cycle to 8x (1x -> 2x -> 4x -> 8x)
        await page.keyboard.press('t');
        await page.keyboard.press('t');
        await page.keyboard.press('t');

        // Wait for state to transition from LULL to SET
        // Default lull is ~30s, at 8x that's ~4 seconds
        await page.waitForFunction(
            () => window.world?.setLullState?.setState === 'SET',
            { timeout: 15000 }
        );

        // Wait a bit longer for waves to spawn (15s period / 8x = ~2s)
        await page.waitForTimeout(3000);

        // Check if any set waves exist
        const setWaveCount = await page.evaluate(() => {
            return window.world?.waves?.filter(w => w.type === 'set').length || 0;
        });

        expect(setWaveCount).toBeGreaterThan(0);
    });

    test('no set waves spawn during LULL state', async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
        await page.goto('/');
        await expect(page.locator('#game')).toBeVisible();

        // Wait for world to be available
        await page.waitForFunction(() => window.world !== undefined);

        // Verify we start in LULL
        const state = await page.evaluate(() => window.world?.setLullState?.setState);
        expect(state).toBe('LULL');

        // Wait a few seconds (but not long enough to transition to SET at 1x speed)
        await page.waitForTimeout(2000);

        // Check that no set waves have spawned (only background waves)
        const setWaveCount = await page.evaluate(() => {
            return window.world?.waves?.filter(w => w.type === 'set').length || 0;
        });

        expect(setWaveCount).toBe(0);
    });

    test('background waves spawn continuously regardless of state', async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
        await page.goto('/');
        await expect(page.locator('#game')).toBeVisible();

        // Wait for world to be available
        await page.waitForFunction(() => window.world !== undefined);

        // Use 4x time scale
        await page.keyboard.press('t');
        await page.keyboard.press('t');

        // Wait for some background waves to spawn
        await page.waitForTimeout(3000);

        // Check for background waves
        const bgWaveCount = await page.evaluate(() => {
            return window.world?.waves?.filter(w => w.type === 'background').length || 0;
        });

        expect(bgWaveCount).toBeGreaterThan(0);
    });

    test('waves array contains both types after full cycle', async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
        await page.goto('/');
        await expect(page.locator('#game')).toBeVisible();

        // Wait for world to be available
        await page.waitForFunction(() => window.world !== undefined);

        // Use 8x time scale
        for (let i = 0; i < 3; i++) {
            await page.keyboard.press('t');
        }

        // Wait for a full LULL -> SET transition and wave spawns
        await page.waitForFunction(
            () => {
                const waves = window.world?.waves || [];
                const setWaves = waves.filter(w => w.type === 'set');
                const bgWaves = waves.filter(w => w.type === 'background');
                return setWaves.length > 0 && bgWaves.length > 0;
            },
            { timeout: 15000 }
        );

        // Get final wave type counts
        const waveCounts = await page.evaluate(() => {
            const waves = window.world?.waves || [];
            return {
                set: waves.filter(w => w.type === 'set').length,
                background: waves.filter(w => w.type === 'background').length,
                total: waves.length
            };
        });

        console.log('Wave counts:', waveCounts);

        // Should have both wave types
        expect(waveCounts.background).toBeGreaterThan(0);
        expect(waveCounts.set).toBeGreaterThan(0);
    });

    test('state cycles LULL -> SET -> LULL', async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
        await page.goto('/');
        await expect(page.locator('#game')).toBeVisible();

        // Wait for world to be available
        await page.waitForFunction(() => window.world !== undefined);

        // Verify we start in LULL
        let state = await page.evaluate(() => window.world?.setLullState?.setState);
        expect(state).toBe('LULL');

        // Use 8x time scale
        for (let i = 0; i < 3; i++) {
            await page.keyboard.press('t');
        }

        // Wait for transition to SET
        await page.waitForFunction(
            () => window.world?.setLullState?.setState === 'SET',
            { timeout: 15000 }
        );

        // Wait for transition back to LULL (set waves all spawn then transition)
        // At 8x, a set of 4-8 waves at ~15s period = ~8-15s real time
        await page.waitForFunction(
            () => window.world?.setLullState?.setState === 'LULL',
            { timeout: 30000 }
        );

        state = await page.evaluate(() => window.world?.setLullState?.setState);
        expect(state).toBe('LULL');
    });

    test('set wave toggle affects visibility but waves still simulate', async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
        await page.goto('/');
        await expect(page.locator('#game')).toBeVisible();

        // Wait for world to be available
        await page.waitForFunction(() => window.world !== undefined);

        // Speed up to get to SET state and spawn waves
        for (let i = 0; i < 3; i++) {
            await page.keyboard.press('t');
        }

        // Wait for set waves to spawn
        await page.waitForFunction(
            () => window.world?.waves?.filter(w => w.type === 'set').length > 0,
            { timeout: 15000 }
        );

        // Get count before toggle
        const countBefore = await page.evaluate(() => {
            return window.world?.waves?.filter(w => w.type === 'set').length || 0;
        });

        // Press 'S' to toggle set wave visibility
        await page.keyboard.press('s');

        // Check toggle state changed
        const toggleState = await page.evaluate(() => window.toggles?.showSetWaves);
        expect(toggleState).toBe(false);

        // Wait a moment for more waves to potentially spawn
        await page.waitForTimeout(2000);

        // Waves should still exist in the array even if hidden
        const countAfter = await page.evaluate(() => {
            return window.world?.waves?.filter(w => w.type === 'set').length || 0;
        });

        // Should have at least as many set waves (simulation continues)
        expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    });
});
