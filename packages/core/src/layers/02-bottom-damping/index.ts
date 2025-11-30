// Public API for Layer 02: Bottom Damping
// Maps ocean floor depth to damping coefficients - shallow water = high damping

export { depthToDamping, depthMatrixToDamping } from './model.js';

// Individual story exports
export { PROGRESSION_FLAT_SHALLOW } from './stories/01-flat-shallow.js';
export { PROGRESSION_FLAT_MEDIUM } from './stories/02-flat-medium.js';
export { PROGRESSION_FLAT_DEEP } from './stories/03-flat-deep.js';
export { PROGRESSION_SLOPE_GENTLE } from './stories/04-slope-gentle.js';
export { PROGRESSION_SLOPE_GRADUAL } from './stories/05-slope-gradual.js';
export { PROGRESSION_SLOPE_STEEP } from './stories/06-slope-steep.js';
export { PROGRESSION_SANDBAR } from './stories/07-sandbar.js';
export { PROGRESSION_REEF } from './stories/08-reef.js';
export { PROGRESSION_CHANNEL } from './stories/09-channel.js';

// Aggregated exports for convenience
import { PROGRESSION_FLAT_SHALLOW } from './stories/01-flat-shallow.js';
import { PROGRESSION_FLAT_MEDIUM } from './stories/02-flat-medium.js';
import { PROGRESSION_FLAT_DEEP } from './stories/03-flat-deep.js';
import { PROGRESSION_SLOPE_GENTLE } from './stories/04-slope-gentle.js';
import { PROGRESSION_SLOPE_GRADUAL } from './stories/05-slope-gradual.js';
import { PROGRESSION_SLOPE_STEEP } from './stories/06-slope-steep.js';
import { PROGRESSION_SANDBAR } from './stories/07-sandbar.js';
import { PROGRESSION_REEF } from './stories/08-reef.js';
import { PROGRESSION_CHANNEL } from './stories/09-channel.js';

export const DAMPING_PROGRESSIONS = {
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
