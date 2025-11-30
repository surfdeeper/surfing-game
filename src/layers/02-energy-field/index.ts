// Public API for Layer 02: Energy Field
// Continuous 2D field where waves are emergent peaks, not discrete objects

// Model exports - physics/simulation
export {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  createEnergyField,
  createSwellSource,
  DEFAULT_SWELLS,
  injectSwells,
  updateEnergyField,
  getHeightAt,
  injectWavePulse,
  drainEnergyAt,
  modulateSwells,
  resetRowAccumulator,
} from './model';

// Renderer exports - production rendering
export { renderEnergyField, renderEnergyFieldFast } from './renderer';

// Progression exports - test fixtures and strips
export {
  ENERGY_FIELD_PROGRESSIONS,
  ENERGY_FIELD_STRIPS,
  PROGRESSION_NO_DAMPING,
  PROGRESSION_LOW_DAMPING,
  PROGRESSION_HIGH_DAMPING,
  PROGRESSION_WITH_DRAIN,
} from './progressions';
