import { defineStripVisualTests } from '../../../../../../packages/visual-regression-testing-viewer-react-application/src/visual-test-helpers';
import { ENERGY_TRANSFER_STRIP_BREAKING } from './01-breaking-release';
import { ENERGY_TRANSFER_STRIP_SPREAD } from './02-spatial-spread';

defineStripVisualTests([ENERGY_TRANSFER_STRIP_BREAKING, ENERGY_TRANSFER_STRIP_SPREAD]);
