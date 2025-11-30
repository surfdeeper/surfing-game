/**
 * Render Module Index
 *
 * Re-exports all rendering functions for clean imports in main.jsx
 */

// Bathymetry rendering (re-exported from layer for backwards compatibility)
export {
  buildBathymetryCache,
  depthToColor,
  createBathymetryCacheManager,
} from '@layers/01-bathymetry';

// Wave rendering
export { WAVE_COLORS, getWaveColors, renderWave, renderWaves } from './waveRenderer.js';

// Energy field rendering
export { renderEnergyField } from '@layers/02-energy-field';

// Foam rendering (marching squares)
export {
  buildIntensityGrid,
  buildIntensityGridOptionA,
  boxBlur,
  extractLineSegments,
  renderMultiContour,
  renderMultiContourOptionA,
  renderMultiContourOptionB,
  renderMultiContourOptionC,
  renderMultiContourFromGrid,
  renderMultiContourOptionAFromGrid,
  renderMultiContourOptionBFromGrid,
  renderMultiContourOptionCFromGrid,
} from './marchingSquares.js';

// Coordinate utilities
export {
  progressToScreenY,
  screenYToProgress,
  getOceanBounds,
  calculateTravelDuration,
} from './coordinates.js';
