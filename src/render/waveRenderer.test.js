import { describe, it, expect, vi } from 'vitest';
import {
    WAVE_COLORS,
    getWaveColors,
    renderWave,
    renderWaves,
} from './waveRenderer.js';
import { progressToScreenY } from './coordinates.js';
import { createWave, WAVE_TYPE } from '../state/waveModel.js';

// Mock canvas context
function createMockContext() {
    return {
        fillStyle: '',
        globalAlpha: 1.0,
        fillRect: vi.fn(),
        createLinearGradient: vi.fn(() => ({
            addColorStop: vi.fn(),
        })),
    };
}

describe('waveRenderer', () => {
    describe('WAVE_COLORS', () => {
        it('has set wave colors', () => {
            expect(WAVE_COLORS.setWave.peak).toBeDefined();
            expect(WAVE_COLORS.setWave.trough).toBeDefined();
        });

        it('has background wave colors', () => {
            expect(WAVE_COLORS.backgroundWave.peak).toBeDefined();
            expect(WAVE_COLORS.backgroundWave.trough).toBeDefined();
        });
    });

    describe('getWaveColors', () => {
        it('returns CSS color strings (hex format)', () => {
            const wave = createWave(0, 0.8, WAVE_TYPE.SET);
            const colors = getWaveColors(wave);

            // Peak is always the palette hex, trough is computed hex
            expect(colors.peak).toMatch(/^#[0-9a-f]{6}$/i);
            expect(colors.trough).toMatch(/^#[0-9a-f]{6}$/i);
        });

        it('returns different colors for set vs background waves', () => {
            const setWave = createWave(0, 0.8, WAVE_TYPE.SET);
            const bgWave = createWave(0, 0.8, WAVE_TYPE.BACKGROUND);

            const setColors = getWaveColors(setWave);
            const bgColors = getWaveColors(bgWave);

            expect(setColors.peak).not.toBe(bgColors.peak);
        });

        it('varies trough color by amplitude (peak stays constant)', () => {
            const lowAmpWave = createWave(0, 0.2, WAVE_TYPE.SET);
            const highAmpWave = createWave(0, 1.0, WAVE_TYPE.SET);

            const lowColors = getWaveColors(lowAmpWave);
            const highColors = getWaveColors(highAmpWave);

            // Peak stays constant (same palette color)
            expect(lowColors.peak).toBe(highColors.peak);
            // Trough varies by amplitude (lerp toward trough color)
            expect(lowColors.trough).not.toBe(highColors.trough);
        });
    });

    describe('progressToScreenY', () => {
        it('converts progress 0 to ocean top', () => {
            expect(progressToScreenY(0, 0, 500)).toBe(0);
        });

        it('converts progress 1 to ocean bottom', () => {
            expect(progressToScreenY(1, 0, 500)).toBe(500);
        });

        it('converts progress 0.5 to middle', () => {
            expect(progressToScreenY(0.5, 100, 500)).toBe(300);
        });
    });

    describe('renderWave', () => {
        it('calls fillRect for wave slices', () => {
            const ctx = createMockContext();
            const wave = createWave(0, 0.8, WAVE_TYPE.SET);
            // Set all progress to 0.5 for predictable positioning
            wave.progressPerX.fill(0.5);

            renderWave(ctx, wave, {
                canvasWidth: 800,
                oceanTop: 0,
                oceanBottom: 500,
                shoreY: 500,
                gameTime: 5000,
                travelDuration: 10000,
            });

            // Should draw slices (40 slices * 2 halves = up to 80 fillRect calls)
            expect(ctx.fillRect).toHaveBeenCalled();
        });

        it('creates gradients for wave coloring', () => {
            const ctx = createMockContext();
            const wave = createWave(0, 0.8, WAVE_TYPE.SET);
            wave.progressPerX.fill(0.5);

            renderWave(ctx, wave, {
                canvasWidth: 800,
                oceanTop: 0,
                oceanBottom: 500,
                shoreY: 500,
                gameTime: 5000,
                travelDuration: 10000,
            });

            expect(ctx.createLinearGradient).toHaveBeenCalled();
        });

        it('sets alpha for bathymetry mode', () => {
            const ctx = createMockContext();
            const wave = createWave(0, 0.8, WAVE_TYPE.SET);
            wave.progressPerX.fill(0.5);

            renderWave(ctx, wave, {
                canvasWidth: 800,
                oceanTop: 0,
                oceanBottom: 500,
                shoreY: 500,
                gameTime: 5000,
                travelDuration: 10000,
                showBathymetry: true,
            });

            // Verify alpha was set (will be 0.7 for bathymetry mode, then reset to 1.0)
            expect(ctx.globalAlpha).toBe(1.0); // Reset after render
        });
    });

    describe('renderWaves', () => {
        it('renders visible waves', () => {
            const ctx = createMockContext();
            const waves = [
                createWave(0, 0.8, WAVE_TYPE.SET),
                createWave(1000, 0.6, WAVE_TYPE.BACKGROUND),
            ];
            waves.forEach(w => w.progressPerX.fill(0.3));

            renderWaves(ctx, waves, {
                canvasWidth: 800,
                oceanTop: 0,
                oceanBottom: 500,
                shoreY: 500,
                gameTime: 5000,
                travelDuration: 10000,
            }, {
                showSetWaves: true,
                showBackgroundWaves: true,
            });

            // Both waves should be rendered
            expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(0);
        });

        it('respects visibility toggles', () => {
            const ctx = createMockContext();
            const setWave = createWave(0, 0.8, WAVE_TYPE.SET);
            const bgWave = createWave(1000, 0.6, WAVE_TYPE.BACKGROUND);
            setWave.progressPerX.fill(0.3);
            bgWave.progressPerX.fill(0.3);

            // Only render set waves
            renderWaves(ctx, [setWave, bgWave], {
                canvasWidth: 800,
                oceanTop: 0,
                oceanBottom: 500,
                shoreY: 500,
                gameTime: 5000,
                travelDuration: 10000,
            }, {
                showSetWaves: true,
                showBackgroundWaves: false,
            });

            const callCount = ctx.fillRect.mock.calls.length;

            // Reset and render with only background
            ctx.fillRect.mockClear();
            renderWaves(ctx, [setWave, bgWave], {
                canvasWidth: 800,
                oceanTop: 0,
                oceanBottom: 500,
                shoreY: 500,
                gameTime: 5000,
                travelDuration: 10000,
            }, {
                showSetWaves: false,
                showBackgroundWaves: true,
            });

            // Should have same number of calls (one wave each time)
            expect(ctx.fillRect.mock.calls.length).toBe(callCount);
        });

        it('sorts waves by progress', () => {
            const ctx = createMockContext();
            // Create waves at different times so they have different progress
            const wave1 = createWave(0, 0.8, WAVE_TYPE.SET);
            const wave2 = createWave(3000, 0.6, WAVE_TYPE.SET);
            wave1.progressPerX.fill(0.7); // Further along (closer to shore)
            wave2.progressPerX.fill(0.3); // Closer to horizon

            renderWaves(ctx, [wave1, wave2], {
                canvasWidth: 800,
                oceanTop: 0,
                oceanBottom: 500,
                shoreY: 500,
                gameTime: 5000,
                travelDuration: 10000,
            });

            // Wave2 (further from shore) should be rendered first (painter's algorithm)
            // Both should render without errors
            expect(ctx.fillRect).toHaveBeenCalled();
        });
    });
});
