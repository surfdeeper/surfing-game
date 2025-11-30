import { describe, it, expect } from 'vitest';
import {
  PLAYER_PROXY_CONFIG,
  createPlayerProxy,
  updatePlayerProxy,
  getZone,
  sampleFoamIntensity,
} from './playerProxyModel.js';
import { createFoamGrids } from './foamGridModel.js';

describe('playerProxyModel', () => {
  const config = PLAYER_PROXY_CONFIG;
  const canvasWidth = 800;
  const canvasHeight = 600;
  const shoreY = 500;
  const oceanTop = 0;
  const oceanBottom = canvasHeight;

  describe('createPlayerProxy', () => {
    it('creates player on shore', () => {
      const player = createPlayerProxy(canvasWidth, shoreY);
      expect(player.x).toBe(canvasWidth / 2);
      expect(player.y).toBe(shoreY + 30);
      expect(player.vx).toBe(0);
      expect(player.vy).toBe(0);
    });
  });

  describe('getZone', () => {
    it('returns SHORE when below shoreY', () => {
      expect(getZone(shoreY + 10, shoreY)).toBe('SHORE');
      expect(getZone(shoreY + 100, shoreY)).toBe('SHORE');
    });

    it('returns WATER when at or above shoreY', () => {
      expect(getZone(shoreY, shoreY)).toBe('WATER');
      expect(getZone(shoreY - 10, shoreY)).toBe('WATER');
      expect(getZone(100, shoreY)).toBe('WATER');
    });
  });

  describe('sampleFoamIntensity', () => {
    it('returns 0 when no foam', () => {
      const { foam: foamGrid } = createFoamGrids();
      const intensity = sampleFoamIntensity(400, 300, foamGrid, canvasWidth, oceanTop, oceanBottom);
      expect(intensity).toBe(0);
    });

    it('returns intensity at occupied cell', () => {
      const { foam: foamGrid } = createFoamGrids();
      // Screen center (400, 300) maps to grid position (29.5, 19.5) due to bilinear sampling
      // Set all 4 neighboring cells to the same value so interpolation returns that value
      const cy = 19;
      const cx = 29;
      foamGrid.data[cy * foamGrid.width + cx] = 0.8; // (29, 19)
      foamGrid.data[cy * foamGrid.width + (cx + 1)] = 0.8; // (30, 19)
      foamGrid.data[(cy + 1) * foamGrid.width + cx] = 0.8; // (29, 20)
      foamGrid.data[(cy + 1) * foamGrid.width + (cx + 1)] = 0.8; // (30, 20)
      const intensity = sampleFoamIntensity(400, 300, foamGrid, canvasWidth, oceanTop, oceanBottom);
      expect(intensity).toBeCloseTo(0.8, 2);
    });

    it('interpolates between cells', () => {
      const { foam: foamGrid } = createFoamGrids();
      // Set two adjacent cells with different values
      const y = Math.floor(foamGrid.height / 2);
      foamGrid.data[y * foamGrid.width + 0] = 0.2;
      foamGrid.data[y * foamGrid.width + 1] = 0.6;
      // Position halfway between x=0 and x=1
      const normalizedX = 0.5 / foamGrid.width;
      const x = normalizedX * canvasWidth;
      const yScreen = (y / (foamGrid.height - 1)) * (oceanBottom - oceanTop);
      const intensity = sampleFoamIntensity(
        x,
        yScreen,
        foamGrid,
        canvasWidth,
        oceanTop,
        oceanBottom
      );
      expect(intensity).toBeGreaterThan(0.2);
      expect(intensity).toBeLessThan(0.6);
    });
  });

  describe('updatePlayerProxy', () => {
    const noInput = { left: false, right: false, up: false, down: false };
    const upInput = { left: false, right: false, up: true, down: false };
    const _downInput = { left: false, right: false, up: false, down: true };

    it('player stays still with no input and no foam', () => {
      const player = { x: 400, y: 300, vx: 0, vy: 0 };
      const { foam: foamGrid } = createFoamGrids();
      const updated = updatePlayerProxy(
        player,
        0.1,
        noInput,
        foamGrid,
        shoreY,
        canvasWidth,
        canvasHeight,
        oceanTop,
        oceanBottom,
        config
      );

      expect(updated.vx).toBeCloseTo(0, 1);
      expect(updated.vy).toBeCloseTo(0, 1);
    });

    it('player moves up (toward horizon) with up input in water', () => {
      const player = { x: 400, y: 300, vx: 0, vy: 0 };
      const { foam: foamGrid } = createFoamGrids();
      const updated = updatePlayerProxy(
        player,
        0.5,
        upInput,
        foamGrid,
        shoreY,
        canvasWidth,
        canvasHeight,
        oceanTop,
        oceanBottom,
        config
      );

      expect(updated.vy).toBeLessThan(0); // Negative = toward top of screen
      expect(updated.y).toBeLessThan(300);
    });

    it('player moves faster on shore than in water', () => {
      const playerOnShore = { x: 400, y: shoreY + 50, vx: 0, vy: 0 };
      const playerInWater = { x: 400, y: shoreY - 50, vx: 0, vy: 0 };

      const { foam: foamGrid } = createFoamGrids();
      const updatedShore = updatePlayerProxy(
        playerOnShore,
        0.5,
        upInput,
        foamGrid,
        shoreY,
        canvasWidth,
        canvasHeight,
        oceanTop,
        oceanBottom,
        config
      );
      const updatedWater = updatePlayerProxy(
        playerInWater,
        0.5,
        upInput,
        foamGrid,
        shoreY,
        canvasWidth,
        canvasHeight,
        oceanTop,
        oceanBottom,
        config
      );

      // Shore velocity should be faster (more negative)
      expect(Math.abs(updatedShore.vy)).toBeGreaterThan(Math.abs(updatedWater.vy));
    });

    it('player gets pushed shoreward in foam with no input', () => {
      const player = { x: 400, y: 300, vx: 0, vy: 0 };
      const { foam: foamGrid } = createFoamGrids();
      const midY = Math.floor(foamGrid.height / 2);
      const midX = Math.floor(foamGrid.width / 2);
      foamGrid.data[midY * foamGrid.width + midX] = 0.8;

      const updated = updatePlayerProxy(
        player,
        0.5,
        noInput,
        foamGrid,
        shoreY,
        canvasWidth,
        canvasHeight,
        oceanTop,
        oceanBottom,
        config
      );

      expect(updated.vy).toBeGreaterThan(0); // Positive = toward shore
      expect(updated.y).toBeGreaterThan(300);
    });

    it('clamps player to screen bounds', () => {
      const playerAtTop = { x: 400, y: 5, vx: 0, vy: -100 };
      const { foam: foamGrid } = createFoamGrids();
      const updated = updatePlayerProxy(
        playerAtTop,
        0.1,
        upInput,
        foamGrid,
        shoreY,
        canvasWidth,
        canvasHeight,
        oceanTop,
        oceanBottom,
        config
      );

      expect(updated.y).toBeGreaterThanOrEqual(config.radius);
    });
  });

  describe('gameplay balance', () => {
    const upInput = { left: false, right: false, up: true, down: false };
    const noInput = { left: false, right: false, up: false, down: false };

    /**
     * Simulate player paddling for a duration and return net Y displacement
     */
    function simulatePaddling(foamIntensity, duration, input) {
      let player = { x: 400, y: 300, vx: 0, vy: 0 };
      const dt = 0.016; // ~60fps
      const steps = Math.floor(duration / dt);

      const { foam: foamGrid } = createFoamGrids();
      if (foamIntensity > 0) {
        // Fill a band with foam intensity
        for (let y = 0; y < foamGrid.height; y++) {
          for (let x = 0; x < foamGrid.width; x++) {
            foamGrid.data[y * foamGrid.width + x] = foamIntensity;
          }
        }
      }

      for (let i = 0; i < steps; i++) {
        player = updatePlayerProxy(
          player,
          dt,
          input,
          foamGrid,
          shoreY,
          canvasWidth,
          canvasHeight,
          oceanTop,
          oceanBottom,
          config
        );
      }

      return 300 - player.y; // Positive = made progress toward horizon
    }

    it('player makes good progress in calm water (no foam)', () => {
      const progress = simulatePaddling(0, 5, upInput); // 5 seconds of paddling

      // Should make significant progress - at least 100px in 5 seconds
      expect(progress).toBeGreaterThan(100);
      console.log(`Calm water (5s): ${progress.toFixed(1)}px progress`);
    });

    it('player makes slow progress through light foam (0.3 intensity)', () => {
      const progress = simulatePaddling(0.3, 5, upInput);

      // Should still make some progress, but slower
      expect(progress).toBeGreaterThan(20);
      expect(progress).toBeLessThan(100);
      console.log(`Light foam 0.3 (5s): ${progress.toFixed(1)}px progress`);
    });

    it('player barely holds position in medium foam (0.5 intensity)', () => {
      const progress = simulatePaddling(0.5, 5, upInput);

      // Should be close to zero - hard fight
      expect(progress).toBeGreaterThan(-30);
      expect(progress).toBeLessThan(50);
      console.log(`Medium foam 0.5 (5s): ${progress.toFixed(1)}px progress`);
    });

    it('player loses ground in heavy foam (0.8 intensity)', () => {
      const progress = simulatePaddling(0.8, 5, upInput);

      // Should be pushed back despite paddling
      expect(progress).toBeLessThan(20);
      console.log(`Heavy foam 0.8 (5s): ${progress.toFixed(1)}px progress`);
    });

    it('player gets pushed back quickly in foam with no input', () => {
      const progress = simulatePaddling(0.6, 3, noInput);

      // Should be pushed back significantly
      expect(progress).toBeLessThan(-50);
      console.log(`No input in foam 0.6 (3s): ${progress.toFixed(1)}px (negative = pushed back)`);
    });

    it('balance summary', () => {
      console.log('\n=== PLAYER BALANCE SUMMARY ===');
      console.log(`Water speed: ${config.waterSpeed} px/s`);
      console.log(`Foam speed: ${config.foamSpeed} px/s`);
      console.log(`Max push force: ${config.maxPushForce} px/s`);
      console.log(`Foam speed penalty: ${config.foamSpeedPenalty * 100}%`);

      // Calculate theoretical breakeven point
      // At breakeven: foamSpeed * (1 - intensity * penalty) = intensity * maxPushForce
      // This is where paddling up exactly counters the push
      const findBreakeven = () => {
        for (let i = 0; i <= 100; i++) {
          const intensity = i / 100;
          const paddleSpeed = config.foamSpeed * (1 - intensity * config.foamSpeedPenalty);
          const pushSpeed = intensity * config.maxPushForce;
          if (pushSpeed >= paddleSpeed) {
            return intensity;
          }
        }
        return 1;
      };

      const breakeven = findBreakeven();
      console.log(`Theoretical breakeven foam intensity: ${(breakeven * 100).toFixed(0)}%`);
      console.log('(Above this, player cannot make progress even while paddling)\n');

      expect(true).toBe(true); // Always passes, just for logging
    });
  });
});
