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

// Shared constants
export {
  SMALL_HEIGHT,
  TRAVEL_DURATION,
  INITIAL_PULSE,
  deepWater,
  shallowGradient,
  updateDeepWaterTranslation,
} from './shared';

// Individual story exports
export { PROGRESSION_NO_DAMPING, ENERGY_FIELD_STRIP_NO_DAMPING } from './stories/01-no-damping';
export { PROGRESSION_LOW_DAMPING, ENERGY_FIELD_STRIP_LOW_DAMPING } from './stories/02-low-damping';
export {
  PROGRESSION_HIGH_DAMPING,
  ENERGY_FIELD_STRIP_HIGH_DAMPING,
} from './stories/03-high-damping';
export { PROGRESSION_WITH_DRAIN, ENERGY_FIELD_STRIP_WITH_DRAIN } from './stories/04-with-drain';

// Aggregated exports for convenience
import { PROGRESSION_NO_DAMPING, ENERGY_FIELD_STRIP_NO_DAMPING } from './stories/01-no-damping';
import { PROGRESSION_LOW_DAMPING, ENERGY_FIELD_STRIP_LOW_DAMPING } from './stories/02-low-damping';
import {
  PROGRESSION_HIGH_DAMPING,
  ENERGY_FIELD_STRIP_HIGH_DAMPING,
} from './stories/03-high-damping';
import { PROGRESSION_WITH_DRAIN, ENERGY_FIELD_STRIP_WITH_DRAIN } from './stories/04-with-drain';

export const ENERGY_FIELD_PROGRESSIONS = {
  noDamping: PROGRESSION_NO_DAMPING,
  lowDamping: PROGRESSION_LOW_DAMPING,
  highDamping: PROGRESSION_HIGH_DAMPING,
  withDrain: PROGRESSION_WITH_DRAIN,
};

export const ENERGY_FIELD_STRIPS = [
  ENERGY_FIELD_STRIP_NO_DAMPING,
  ENERGY_FIELD_STRIP_LOW_DAMPING,
  ENERGY_FIELD_STRIP_HIGH_DAMPING,
  ENERGY_FIELD_STRIP_WITH_DRAIN,
];
