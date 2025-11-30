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

// =============================================================================
// Flat Bottom variants (constant depth across entire grid)
// =============================================================================

export const PROGRESSION_FLAT_SHALLOW = toProgression(
  'bathymetry/flat-shallow',
  'Flat Bottom (Shallow)',
  'Constant shallow depth (25%) - waves interact strongly with bottom everywhere',
  () => {
    const matrix = createMatrix();
    const depth = 0.25;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  }
);

export const PROGRESSION_FLAT_MEDIUM = toProgression(
  'bathymetry/flat-medium',
  'Flat Bottom (Medium)',
  'Constant medium depth (50%) - moderate wave-bottom interaction',
  () => {
    const matrix = createMatrix();
    const depth = 0.5;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  }
);

export const PROGRESSION_FLAT_DEEP = toProgression(
  'bathymetry/flat-deep',
  'Flat Bottom (Deep)',
  'Constant deep water (100%) - waves travel unaffected by bottom',
  () => {
    const matrix = createMatrix();
    const depth = 1.0;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  }
);

// =============================================================================
// Linear Slope variants (constant gradient from horizon to shore)
// =============================================================================

export const PROGRESSION_SLOPE_GENTLE = toProgression(
  'bathymetry/slope-gentle',
  'Linear Slope (Gentle)',
  'Gentle gradient from shallow (25%) at horizon to shore - minimal depth change',
  () => {
    const matrix = createMatrix();
    const maxDepth = 0.25; // Starts shallow
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = maxDepth * (1 - row / (GRID_HEIGHT - 1));
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  }
);

export const PROGRESSION_SLOPE_GRADUAL = toProgression(
  'bathymetry/slope-gradual',
  'Linear Slope (Gradual)',
  'Gradual gradient from medium depth (50%) at horizon to shore',
  () => {
    const matrix = createMatrix();
    const maxDepth = 0.5;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = maxDepth * (1 - row / (GRID_HEIGHT - 1));
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  }
);

export const PROGRESSION_SLOPE_STEEP = toProgression(
  'bathymetry/slope-steep',
  'Linear Slope (Steep)',
  'Steep gradient from deep (100%) at horizon to shore - maximum depth change',
  () => {
    const matrix = createMatrix();
    const maxDepth = 1.0;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = maxDepth * (1 - row / (GRID_HEIGHT - 1));
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  }
);

// =============================================================================
// Bottom Features (localized depth variations)
// =============================================================================

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

// =============================================================================
// Exports
// =============================================================================

export const BATHYMETRY_PROGRESSIONS = {
  flatShallow: PROGRESSION_FLAT_SHALLOW,
  flatMedium: PROGRESSION_FLAT_MEDIUM,
  flatDeep: PROGRESSION_FLAT_DEEP,
  slopeGentle: PROGRESSION_SLOPE_GENTLE,
  slopeGradual: PROGRESSION_SLOPE_GRADUAL,
  slopeSteep: PROGRESSION_SLOPE_STEEP,
  sandbar: PROGRESSION_SANDBAR,
  reef: PROGRESSION_REEF,
  channel: PROGRESSION_CHANNEL,
};
