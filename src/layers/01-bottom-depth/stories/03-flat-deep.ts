import { defineProgression, STATIC_CAPTURE, createFilledMatrix } from '../../../test-utils';

/**
 * Flat Bottom (Deep) - Constant deep water (100%)
 *
 * Waves travel unaffected by bottom - deep water conditions.
 */
export const PROGRESSION_FLAT_DEEP = defineProgression({
  id: 'bathymetry/flat-deep',
  description: 'Constant deep water (100%) - waves travel unaffected by bottom',
  initialMatrix: createFilledMatrix(1.0),
  captureTimes: STATIC_CAPTURE,
  metadata: { label: 'Flat Bottom (Deep)' },
});
