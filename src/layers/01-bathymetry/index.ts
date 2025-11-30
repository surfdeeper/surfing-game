// Public API for Layer 01: Bathymetry
// Ocean floor depth map - defines where waves break based on shallow water

// Model exports - physics/simulation
export {
  DEFAULT_BATHYMETRY,
  getDepth,
  getMinDepth,
  getPeakX,
  shouldBreak,
  amplitudeToHeight,
} from './model';

// Renderer exports - production rendering
export { buildBathymetryCache, createBathymetryCacheManager, depthToColor } from './renderer';

// Progression exports - test fixtures and strips
export {
  BATHYMETRY_PROGRESSIONS,
  PROGRESSION_FLAT_SHALLOW,
  PROGRESSION_FLAT_MEDIUM,
  PROGRESSION_FLAT_DEEP,
  PROGRESSION_SLOPE_GENTLE,
  PROGRESSION_SLOPE_GRADUAL,
  PROGRESSION_SLOPE_STEEP,
  PROGRESSION_SANDBAR,
  PROGRESSION_REEF,
  PROGRESSION_CHANNEL,
} from './progressions';
