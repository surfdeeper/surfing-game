/**
 * @surf/render - Rendering utilities for canvas
 *
 * Re-exports from src/render
 */

// Bathymetry rendering
export {
  buildBathymetryCache,
  depthToColor,
  createBathymetryCacheManager,
} from '../../src/render/bathymetryRenderer';

// Wave rendering
export { WAVE_COLORS, getWaveColors, renderWave, renderWaves } from '../../src/render/waveRenderer';

// Energy field rendering
export { renderEnergyField } from '../../src/render/energyFieldRenderer';

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
} from '../../src/render/marchingSquares';

// Coordinate utilities
export {
  progressToScreenY,
  screenYToProgress,
  getOceanBounds,
  calculateTravelDuration,
} from '../../src/render/coordinates';

// Color scales
export * from '../../src/render/colorScales';

// Foam config
export * from '../../src/render/foamConfig';
