// Public API for Layer 03: Shoaling
// Wave transformation as waves enter shallow water

// Shared utilities
export { GRID_WIDTH, GRID_HEIGHT, createMatrix } from './shared';
export type { Matrix } from './shared';

// Individual story exports
export { PROGRESSION_WAVE_SHOALING, SHOALING_STRIP_HEIGHT } from './stories/01-wave-transformation';
export {
  PROGRESSION_WAVELENGTH_COMPRESSION,
  SHOALING_STRIP_COMPRESSION,
} from './stories/02-wavelength-compression';
export {
  PROGRESSION_ORBITAL_FLATTENING,
  PROGRESSION_SPEED_GRADIENT,
  SHOALING_STRIP_STATIC,
} from './stories/03-speed-vs-depth';
export { PROGRESSION_SHOALING_COMBINED, SHOALING_STRIP_COMBINED } from './stories/04-combined';

// Aggregated exports for convenience
import { PROGRESSION_WAVE_SHOALING, SHOALING_STRIP_HEIGHT } from './stories/01-wave-transformation';
import {
  PROGRESSION_WAVELENGTH_COMPRESSION,
  SHOALING_STRIP_COMPRESSION,
} from './stories/02-wavelength-compression';
import {
  PROGRESSION_ORBITAL_FLATTENING,
  PROGRESSION_SPEED_GRADIENT,
  SHOALING_STRIP_STATIC,
} from './stories/03-speed-vs-depth';
import { PROGRESSION_SHOALING_COMBINED, SHOALING_STRIP_COMBINED } from './stories/04-combined';

export const SHOALING_PROGRESSIONS = {
  waveShoaling: PROGRESSION_WAVE_SHOALING,
  wavelengthCompression: PROGRESSION_WAVELENGTH_COMPRESSION,
  orbitalFlattening: PROGRESSION_ORBITAL_FLATTENING,
  speedGradient: PROGRESSION_SPEED_GRADIENT,
  combined: PROGRESSION_SHOALING_COMBINED,
};

export const SHOALING_STRIPS = [
  SHOALING_STRIP_HEIGHT,
  SHOALING_STRIP_COMPRESSION,
  SHOALING_STRIP_STATIC,
  SHOALING_STRIP_COMBINED,
];
