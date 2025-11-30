import { defineStripVisualTests } from '../../../../../../stories/visual-test-helpers';
import { FOAM_DISPERSION_STRIP_DECAY } from './01-decay-rate';
import { FOAM_DISPERSION_STRIP_SPATIAL } from './02-spatial-spreading';
import { FOAM_DISPERSION_STRIP_COMBINED } from './03-combined';

defineStripVisualTests([
  FOAM_DISPERSION_STRIP_DECAY,
  FOAM_DISPERSION_STRIP_SPATIAL,
  FOAM_DISPERSION_STRIP_COMBINED,
]);
