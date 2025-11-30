import { describe, it, expect } from 'vitest';
import { matrixToAscii } from '../../../test-utils';
import { PROGRESSION_FLAT_SHALLOW } from './01-flat-shallow';

describe('PROGRESSION_FLAT_SHALLOW', () => {
  it('produces uniform shallow depth', () => {
    const matrix = PROGRESSION_FLAT_SHALLOW.snapshots[0].matrix;
    expect(matrixToAscii(matrix)).toMatchInlineSnapshot(`
      "33333333
      33333333
      33333333
      33333333
      33333333
      33333333
      33333333
      33333333
      33333333
      33333333"
    `);
  });
});
