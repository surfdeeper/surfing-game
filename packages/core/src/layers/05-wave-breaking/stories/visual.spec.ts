import { defineStripVisualTests } from '../../../../../../packages/visual-regression-testing-viewer-react-application/src/visual-test-helpers';
import { WAVE_BREAKING_STRIP_CRITERION } from './01-breaking-criterion';
import { WAVE_BREAKING_STRIP_TYPES } from './02-breaking-types';
import { WAVE_BREAKING_STRIP_ENERGY } from './03-energy-to-foam';

defineStripVisualTests([
  WAVE_BREAKING_STRIP_CRITERION,
  WAVE_BREAKING_STRIP_TYPES,
  WAVE_BREAKING_STRIP_ENERGY,
]);
