/**
 * Render Module Index
 *
 * Re-exports all rendering functions for clean imports in main.jsx
 */

// Bathymetry rendering
export {
    buildBathymetryCache,
    depthToColor,
    createBathymetryCacheManager,
} from './bathymetryRenderer.js';

// Wave rendering
export {
    WAVE_COLORS,
    getWaveColors,
    progressToScreenY,
    renderWave,
    renderWaves,
} from './waveRenderer.js';

// Energy field rendering
export { renderEnergyField } from './energyFieldRenderer.js';

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
} from './marchingSquares.js';

// Coordinate utilities
export {
    screenToNormalized,
    normalizedToScreen,
    progressToY,
    yToProgress,
} from './coordinates.js';
