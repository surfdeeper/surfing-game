import { defineProgression, STATIC_CAPTURE, createFilledMatrix } from '../../../test-utils';

/**
 * Flat Bottom (Medium) - Constant medium depth (50%)
 *
 * Moderate wave-bottom interaction across the entire grid.
 */
export const PROGRESSION_FLAT_MEDIUM = defineProgression({
  id: 'bathymetry/flat-medium',
  description: 'Constant medium depth (50%) - moderate wave-bottom interaction',
  initialMatrix: createFilledMatrix(0.5),
  captureTimes: STATIC_CAPTURE,
  metadata: { label: 'Flat Bottom (Medium)' },
});
