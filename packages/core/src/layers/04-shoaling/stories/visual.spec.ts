import { defineStripVisualTests } from '../../../../../../packages/visual-regression-testing-viewer-react-application/src/visual-test-helpers';
import { SHOALING_STRIP_HEIGHT } from './01-wave-transformation';
import { SHOALING_STRIP_COMPRESSION } from './02-wavelength-compression';
import { SHOALING_STRIP_STATIC } from './03-speed-vs-depth';
import { SHOALING_STRIP_COMBINED } from './04-combined';

defineStripVisualTests([
  SHOALING_STRIP_HEIGHT,
  SHOALING_STRIP_COMPRESSION,
  SHOALING_STRIP_STATIC,
  SHOALING_STRIP_COMBINED,
]);
