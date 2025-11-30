import { defineProgression } from '../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 8;
const GRID_HEIGHT = 10; // More rows for depth profiles (horizon to shore)
const STATIC_CAPTURE = [0];

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Bathymetry progressions show depth profiles from horizon (top) to shore (bottom).
 * Values represent normalized depth: 1.0 = deep water, 0.0 = beach/shore
 */

function toProgression(id: string, label: string, description: string, buildMatrix: () => Matrix) {
  return defineProgression({
    id,
    description,
    initialMatrix: buildMatrix(),
    captureTimes: STATIC_CAPTURE,
    updateFn: () => {},
    metadata: { label },
  });
}

// Linear gradient from deep (1.0) at horizon to shallow (0.0) at shore
export const PROGRESSION_LINEAR_SLOPE = toProgression(
  'bathymetry/linear-slope',
  'Linear Slope',
  'Linear depth gradient from deep (horizon) to shore',
  () => {
    const matrix = createMatrix();
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = 1 - row / (GRID_HEIGHT - 1); // 1.0 at top, 0 at bottom
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  }
);

// Steep drop-off near shore (exponential curve)
export const PROGRESSION_STEEP_SHORE = toProgression(
  'bathymetry/steep-shore',
  'Steep Shore',
  'Deep water plateau with steep drop-off near shore',
  () => {
    const matrix = createMatrix();
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const normalized = row / (GRID_HEIGHT - 1);
      // Exponential curve: stays deep longer, drops quickly near shore
      const depth = Math.exp(-normalized * 3);
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  }
);

// Sandbar: shallow region in the middle
export const PROGRESSION_SANDBAR = toProgression(
  'bathymetry/sandbar',
  'Sandbar',
  'Shallow sandbar in mid-water creates secondary breaking zone',
  () => {
    const matrix = createMatrix();
    const barRow = Math.floor(GRID_HEIGHT * 0.4); // 40% from horizon
    const barWidth = 2; // Rows affected by bar

    for (let row = 0; row < GRID_HEIGHT; row++) {
      const baseDepth = 1 - row / (GRID_HEIGHT - 1);

      // Add sandbar bump (reduces depth locally)
      const distFromBar = Math.abs(row - barRow);
      const barEffect = distFromBar < barWidth ? 0.4 * (1 - distFromBar / barWidth) : 0;

      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = Math.max(0, baseDepth - barEffect);
      }
    }
    return matrix;
  }
);

// Reef: localized shallow spot
export const PROGRESSION_REEF = toProgression(
  'bathymetry/reef',
  'Reef',
  'Localized reef creates circular shallow zone',
  () => {
    const matrix = createMatrix();
    const reefRow = Math.floor(GRID_HEIGHT * 0.5);
    const reefCol = Math.floor(GRID_WIDTH * 0.5);
    const reefRadius = 2;

    for (let row = 0; row < GRID_HEIGHT; row++) {
      const baseDepth = 1 - row / (GRID_HEIGHT - 1);

      for (let col = 0; col < GRID_WIDTH; col++) {
        const dist = Math.sqrt((row - reefRow) ** 2 + (col - reefCol) ** 2);
        const reefEffect = dist < reefRadius ? 0.5 * (1 - dist / reefRadius) : 0;
        matrix[row][col] = Math.max(0, baseDepth - reefEffect);
      }
    }
    return matrix;
  }
);

// Channel: deeper groove between sandbars (common at river mouths)
export const PROGRESSION_CHANNEL = toProgression(
  'bathymetry/channel',
  'Channel',
  'Deep channel between shallow areas (river mouth pattern)',
  () => {
    const matrix = createMatrix();
    const channelCol = Math.floor(GRID_WIDTH / 2);

    for (let row = 0; row < GRID_HEIGHT; row++) {
      const baseDepth = 1 - row / (GRID_HEIGHT - 1);

      for (let col = 0; col < GRID_WIDTH; col++) {
        const distFromChannel = Math.abs(col - channelCol);
        // Channel is deeper, sides are shallower
        const channelEffect = distFromChannel <= 1 ? 0.3 : distFromChannel <= 2 ? -0.2 : 0;
        matrix[row][col] = Math.max(0, Math.min(1, baseDepth + channelEffect));
      }
    }
    return matrix;
  }
);

// Flat bottom (constant depth - for reference)
export const PROGRESSION_FLAT = toProgression(
  'bathymetry/flat',
  'Flat Bottom',
  'Constant depth (no bathymetry gradient)',
  () => {
    const matrix = createMatrix();
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = 0.5; // Mid-depth everywhere
      }
    }
    return matrix;
  }
);

// Export organized by category
export const BATHYMETRY_PROGRESSIONS = {
  linearSlope: PROGRESSION_LINEAR_SLOPE,
  steepShore: PROGRESSION_STEEP_SHORE,
  sandbar: PROGRESSION_SANDBAR,
  reef: PROGRESSION_REEF,
  channel: PROGRESSION_CHANNEL,
  flat: PROGRESSION_FLAT,
};
