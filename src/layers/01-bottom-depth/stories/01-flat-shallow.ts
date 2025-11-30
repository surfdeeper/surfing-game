import { defineProgression, STATIC_CAPTURE, createFilledMatrix } from '../../../test-utils';

/**
 * Flat Bottom (Shallow) - Constant shallow depth (25%)
 *
 * Waves interact strongly with the bottom everywhere, causing uniform shoaling effects.
 */
export const PROGRESSION_FLAT_SHALLOW = defineProgression({
  id: 'bathymetry/flat-shallow',
  description: 'Constant shallow depth (25%) - waves interact strongly with bottom everywhere',
  initialMatrix: createFilledMatrix(0.25),
  captureTimes: STATIC_CAPTURE,
  metadata: { label: 'Flat Bottom (Shallow)' },
});
