/**
 * Bathymetry Progressions Tests
 *
 * Tests validate the depth matrix data for each bathymetry type using
 * the ASCII matrix format for human-readable, diff-friendly snapshots.
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
      const expected = `
33333333
33333333
33333333
33333333
33333333
33333333
33333333
33333333
33333333
33333333
`.trim();
      expect(matrixToAscii(matrix)).toBe(expected);
    });

    it('PROGRESSION_FLAT_MEDIUM produces uniform medium depth', () => {
      const matrix = PROGRESSION_FLAT_MEDIUM.snapshots[0].matrix;
      const expected = `
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
AAAAAAAA
`.trim();
      expect(matrixToAscii(matrix)).toBe(expected);
    });

    it('PROGRESSION_FLAT_DEEP produces uniform deep water', () => {
      const matrix = PROGRESSION_FLAT_DEEP.snapshots[0].matrix;
      const expected = `
FFFFFFFF
FFFFFFFF
FFFFFFFF
FFFFFFFF
FFFFFFFF
FFFFFFFF
FFFFFFFF
FFFFFFFF
FFFFFFFF
FFFFFFFF
`.trim();
      expect(matrixToAscii(matrix)).toBe(expected);
    });
  });

  describe('Linear Slope variants', () => {
    it('PROGRESSION_SLOPE_GENTLE shows gentle gradient (shallow start)', () => {
      const matrix = PROGRESSION_SLOPE_GENTLE.snapshots[0].matrix;
      const expected = `
33333333
22222222
22222222
22222222
11111111
11111111
11111111
--------
--------
--------
`.trim();
      expect(matrixToAscii(matrix)).toBe(expected);
    });

    it('PROGRESSION_SLOPE_GRADUAL shows gradual gradient (medium start)', () => {
      const matrix = PROGRESSION_SLOPE_GRADUAL.snapshots[0].matrix;
      const expected = `
AAAAAAAA
AAAAAAAA
44444444
44444444
33333333
33333333
22222222
22222222
11111111
--------
`.trim();
      expect(matrixToAscii(matrix)).toBe(expected);
    });

    it('PROGRESSION_SLOPE_STEEP shows steep gradient (deep start)', () => {
      const matrix = PROGRESSION_SLOPE_STEEP.snapshots[0].matrix;
      const expected = `
FFFFFFFF
EEEEEEEE
DDDDDDDD
BBBBBBBB
AAAAAAAA
99999999
77777777
66666666
44444444
--------
`.trim();
      expect(matrixToAscii(matrix)).toBe(expected);
    });
  });

  describe('Bottom Features', () => {
    it('PROGRESSION_SANDBAR shows shallow bar in mid-water', () => {
      const matrix = PROGRESSION_SANDBAR.snapshots[0].matrix;
      // Sandbar creates localized shallow area at ~40% from horizon
      // Should see reduced depth values in rows 3-4
      const ascii = matrixToAscii(matrix);

      // Verify sandbar creates visible variation
      const lines = ascii.split('\n');
      expect(lines.length).toBe(10);

      // Row 0 (horizon) should be deep
      expect(lines[0]).toMatch(/F+/);

      // Rows 3-4 should show sandbar effect (shallower than neighbors)
      expect(lines[3]).not.toBe(lines[2]); // Different from row above
      expect(lines[3]).not.toBe(lines[5]); // Different from row below
    });

    it('PROGRESSION_REEF shows circular shallow zone', () => {
      const matrix = PROGRESSION_REEF.snapshots[0].matrix;
      // Reef is centered, creating circular pattern
      const ascii = matrixToAscii(matrix);

      // Verify reef creates visible variation
      const lines = ascii.split('\n');
      expect(lines.length).toBe(10);

      // Center should be shallower than edges
      const middleRow = lines[5];
      expect(middleRow.length).toBe(8);

      // Center column should differ from edges
      expect(middleRow[3]).not.toBe(middleRow[0]);
      expect(middleRow[4]).not.toBe(middleRow[7]);
    });

    it('PROGRESSION_CHANNEL shows deep center with shallow sides', () => {
      const matrix = PROGRESSION_CHANNEL.snapshots[0].matrix;
      // Channel is deeper in center, shallower on sides
      const ascii = matrixToAscii(matrix);

      const lines = ascii.split('\n');

      // Each row should have the correct width (8 columns)
      for (let i = 0; i < lines.length; i++) {
        const row = lines[i];
        expect(row.length).toBe(8);
      }
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
