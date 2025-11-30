/**
 * Bathymetry Progressions Tests
 *
 * Tests validate the depth matrix data for each bathymetry type using
 * the ASCII matrix format for human-readable, diff-friendly snapshots.
 *
 * Uses Vitest inline snapshots - run `npx vitest -u` to update expectations.
 */
import { describe, it, expect } from 'vitest';
import { matrixToAscii } from '../../test-utils';

// Import progressions from sister .ts files
import { PROGRESSION_FLAT_SHALLOW } from './stories/01-flat-shallow';
import { PROGRESSION_FLAT_MEDIUM } from './stories/02-flat-medium';
import { PROGRESSION_FLAT_DEEP } from './stories/03-flat-deep';
import { PROGRESSION_SLOPE_GENTLE } from './stories/04-slope-gentle';
import { PROGRESSION_SLOPE_GRADUAL } from './stories/05-slope-gradual';
import { PROGRESSION_SLOPE_STEEP } from './stories/06-slope-steep';
import { PROGRESSION_SANDBAR } from './stories/07-sandbar';
import { PROGRESSION_REEF } from './stories/08-reef';
import { PROGRESSION_CHANNEL } from './stories/09-channel';

describe('Bathymetry Progressions - ASCII Snapshots', () => {
  describe('Flat Bottom variants', () => {
    it('PROGRESSION_FLAT_SHALLOW produces uniform shallow depth', () => {
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

    it('PROGRESSION_FLAT_MEDIUM produces uniform medium depth', () => {
      const matrix = PROGRESSION_FLAT_MEDIUM.snapshots[0].matrix;
      expect(matrixToAscii(matrix)).toMatchInlineSnapshot(`
        "AAAAAAAA
        AAAAAAAA
        AAAAAAAA
        AAAAAAAA
        AAAAAAAA
        AAAAAAAA
        AAAAAAAA
        AAAAAAAA
        AAAAAAAA
        AAAAAAAA"
      `);
    });

    it('PROGRESSION_FLAT_DEEP produces uniform deep water', () => {
      const matrix = PROGRESSION_FLAT_DEEP.snapshots[0].matrix;
      expect(matrixToAscii(matrix)).toMatchInlineSnapshot(`
        "FFFFFFFF
        FFFFFFFF
        FFFFFFFF
        FFFFFFFF
        FFFFFFFF
        FFFFFFFF
        FFFFFFFF
        FFFFFFFF
        FFFFFFFF
        FFFFFFFF"
      `);
    });
  });

  describe('Linear Slope variants', () => {
    it('PROGRESSION_SLOPE_GENTLE shows gentle gradient (shallow start)', () => {
      const matrix = PROGRESSION_SLOPE_GENTLE.snapshots[0].matrix;
      expect(matrixToAscii(matrix)).toMatchInlineSnapshot(`
        "33333333
        22222222
        22222222
        22222222
        11111111
        11111111
        11111111
        11111111
        --------
        --------"
      `);
    });

    it('PROGRESSION_SLOPE_GRADUAL shows gradual gradient (medium start)', () => {
      const matrix = PROGRESSION_SLOPE_GRADUAL.snapshots[0].matrix;
      expect(matrixToAscii(matrix)).toMatchInlineSnapshot(`
        "AAAAAAAA
        44444444
        44444444
        33333333
        33333333
        22222222
        22222222
        11111111
        11111111
        --------"
      `);
    });

    it('PROGRESSION_SLOPE_STEEP shows steep gradient (deep start)', () => {
      const matrix = PROGRESSION_SLOPE_STEEP.snapshots[0].matrix;
      expect(matrixToAscii(matrix)).toMatchInlineSnapshot(`
        "FFFFFFFF
        EEEEEEEE
        DDDDDDDD
        CCCCCCCC
        BBBBBBBB
        44444444
        33333333
        22222222
        11111111
        --------"
      `);
    });
  });

  describe('Bottom Features', () => {
    it('PROGRESSION_SANDBAR snapshot', () => {
      const matrix = PROGRESSION_SANDBAR.snapshots[0].matrix;
      expect(matrixToAscii(matrix)).toMatchInlineSnapshot(`
        "FFFFFFFF
        EEEEEEEE
        DDDDDDDD
        AAAAAAAA
        22222222
        22222222
        33333333
        22222222
        11111111
        --------"
      `);
    });

    it('PROGRESSION_REEF snapshot', () => {
      const matrix = PROGRESSION_REEF.snapshots[0].matrix;
      expect(matrixToAscii(matrix)).toMatchInlineSnapshot(`
        "FFFFFFFF
        EEEEEEEE
        DDDDDDDD
        CCCCCCCC
        BBB434BB
        4442-244
        33321233
        22222222
        11111111
        --------"
      `);
    });

    it('PROGRESSION_CHANNEL snapshot', () => {
      const matrix = PROGRESSION_CHANNEL.snapshots[0].matrix;
      expect(matrixToAscii(matrix)).toMatchInlineSnapshot(`
        "FFDFFFDF
        EECFFFCE
        DDBFFFBD
        CCAFFFAC
        BB4EEE4B
        442CCC24
        331BBB13
        22-AAA-2
        11-444-1
        ---333--"
      `);
    });
  });

  describe('Progression metadata', () => {
    it('all progressions have correct IDs', () => {
      expect(PROGRESSION_FLAT_SHALLOW.id).toBe('bathymetry/flat-shallow');
      expect(PROGRESSION_FLAT_MEDIUM.id).toBe('bathymetry/flat-medium');
      expect(PROGRESSION_FLAT_DEEP.id).toBe('bathymetry/flat-deep');
      expect(PROGRESSION_SLOPE_GENTLE.id).toBe('bathymetry/slope-gentle');
      expect(PROGRESSION_SLOPE_GRADUAL.id).toBe('bathymetry/slope-gradual');
      expect(PROGRESSION_SLOPE_STEEP.id).toBe('bathymetry/slope-steep');
      expect(PROGRESSION_SANDBAR.id).toBe('bathymetry/sandbar');
      expect(PROGRESSION_REEF.id).toBe('bathymetry/reef');
      expect(PROGRESSION_CHANNEL.id).toBe('bathymetry/channel');
    });

    it('all progressions have labels', () => {
      expect(PROGRESSION_FLAT_SHALLOW.metadata?.label).toBe('Flat Bottom (Shallow)');
      expect(PROGRESSION_FLAT_MEDIUM.metadata?.label).toBe('Flat Bottom (Medium)');
      expect(PROGRESSION_FLAT_DEEP.metadata?.label).toBe('Flat Bottom (Deep)');
      expect(PROGRESSION_SLOPE_GENTLE.metadata?.label).toBe('Linear Slope (Gentle)');
      expect(PROGRESSION_SLOPE_GRADUAL.metadata?.label).toBe('Linear Slope (Gradual)');
      expect(PROGRESSION_SLOPE_STEEP.metadata?.label).toBe('Linear Slope (Steep)');
      expect(PROGRESSION_SANDBAR.metadata?.label).toBe('Sandbar');
      expect(PROGRESSION_REEF.metadata?.label).toBe('Reef');
      expect(PROGRESSION_CHANNEL.metadata?.label).toBe('Channel');
    });

    it('all progressions have 8x10 grids', () => {
      const progressions = [
        PROGRESSION_FLAT_SHALLOW,
        PROGRESSION_FLAT_MEDIUM,
        PROGRESSION_FLAT_DEEP,
        PROGRESSION_SLOPE_GENTLE,
        PROGRESSION_SLOPE_GRADUAL,
        PROGRESSION_SLOPE_STEEP,
        PROGRESSION_SANDBAR,
        PROGRESSION_REEF,
        PROGRESSION_CHANNEL,
      ];

      for (const prog of progressions) {
        const matrix = prog.snapshots[0].matrix;
        expect(matrix.length).toBe(10); // 10 rows (horizon to shore)
        expect(matrix[0].length).toBe(8); // 8 columns (width)
      }
    });

    it('all progressions have single static snapshot', () => {
      const progressions = [
        PROGRESSION_FLAT_SHALLOW,
        PROGRESSION_FLAT_MEDIUM,
        PROGRESSION_FLAT_DEEP,
        PROGRESSION_SLOPE_GENTLE,
        PROGRESSION_SLOPE_GRADUAL,
        PROGRESSION_SLOPE_STEEP,
        PROGRESSION_SANDBAR,
        PROGRESSION_REEF,
        PROGRESSION_CHANNEL,
      ];

      for (const prog of progressions) {
        expect(prog.snapshots.length).toBe(1);
        expect(prog.snapshots[0].time).toBe(0);
      }
    });
  });
});
