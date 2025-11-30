/**
 * ASCII Matrix Format for Compact Energy Field Snapshots
 *
 * Inspired by RxJS marble testing, this provides a human-readable
 * format for energy field matrices that's easy to diff and understand.
 *
 * Format:
 *   - Each character represents a cell value (0.0 - 1.0)
 *   - Characters: - 0 1 2 3 4 5 6 7 8 9 A B C D E F
 *   - '-' = 0.0 (or values < 0.05)
 *   - '0'-'9' = 0.0-0.9 in 0.1 increments
 *   - 'A'-'F' = 0.95-1.0 (A=0.95, F=1.0)
 *   - Each row is a string of characters
 *   - Rows are separated by newlines
 *
 * Example (6x5 matrix):
 *   FFFFF
 *   -----
 *   -----
 *   -----
 *   -----
 *   -----
 *
 * This represents energy=1.0 at horizon (row 0), 0.0 everywhere else.
 */

/**
 * Convert a numeric value (0.0-1.0) to a single ASCII character
 */
export function valueToChar(value: number): string {
  if (value < 0.05) return '-';
  if (value >= 0.95) return 'F';
  if (value >= 0.85) return 'E';
  if (value >= 0.75) return 'D';
  if (value >= 0.65) return 'C';
  if (value >= 0.55) return 'B';
  if (value >= 0.45) return 'A';
  // 0.05 - 0.45 maps to '1' - '4'
  // Round to nearest 0.1
  const digit = Math.round(value * 10);
  return digit.toString();
}

/**
 * Convert an ASCII character back to a numeric value
 */
export function charToValue(char: string): number {
  if (char === '-') return 0;
  if (char === 'F') return 1.0;
  if (char === 'E') return 0.9;
  if (char === 'D') return 0.8;
  if (char === 'C') return 0.7;
  if (char === 'B') return 0.6;
  if (char === 'A') return 0.5;
  const digit = parseInt(char, 10);
  if (!isNaN(digit)) return digit / 10;
  throw new Error(`Invalid ASCII matrix character: '${char}'`);
}

/**
 * Convert a 2D matrix to compact ASCII format
 */
export function matrixToAscii(matrix: number[][]): string {
  return matrix.map((row) => row.map(valueToChar).join('')).join('\n');
}

/**
 * Convert ASCII format back to a 2D matrix
 */
export function asciiToMatrix(ascii: string): number[][] {
  return ascii
    .trim()
    .split('\n')
    .map((line) => line.split('').map(charToValue));
}

/**
 * Convert a progression (array of snapshots) to a compact multi-frame ASCII format
 *
 * Output format:
 *   t=0s     t=1s     t=2s
 *   FFFFF    66666    44444
 *   -----    55555    55555
 *   -----    22222    44444
 *   -----    11111    22222
 *   -----    -----    11111
 *   -----    -----    -----
 */
export function progressionToAscii(
  snapshots: Array<{ time: number; matrix: number[][]; label?: string }>
): string {
  if (snapshots.length === 0) return '';

  const numRows = snapshots[0].matrix.length;
  const colWidth = snapshots[0].matrix[0].length + 2; // +2 for spacing

  // Build header row with time labels
  const headers = snapshots.map((s) => {
    const label = s.label || `t=${s.time}s`;
    return label.padEnd(colWidth);
  });
  const headerLine = headers.join('').trimEnd();

  // Build each row across all frames
  const rows: string[] = [];
  for (let r = 0; r < numRows; r++) {
    const rowParts = snapshots.map((s) => {
      const asciiRow = s.matrix[r].map(valueToChar).join('');
      return asciiRow.padEnd(colWidth);
    });
    rows.push(rowParts.join('').trimEnd());
  }

  return [headerLine, ...rows].join('\n');
}

/**
 * Parse a multi-frame ASCII format back to snapshots
 */
export function asciiToProgression(ascii: string): Array<{ time: number; matrix: number[][] }> {
  const lines = ascii.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header to get number of frames and their labels
  const headerLine = lines[0];
  const labels = headerLine.trim().split(/\s{2,}/); // Split on 2+ spaces

  const numFrames = labels.length;
  const numRows = lines.length - 1;

  // Determine column width from first data row
  const firstDataLine = lines[1];
  const totalWidth = firstDataLine.length;
  const colWidth = Math.floor(totalWidth / numFrames);

  // Parse each frame
  const snapshots: Array<{ time: number; matrix: number[][] }> = [];

  for (let f = 0; f < numFrames; f++) {
    const matrix: number[][] = [];
    const startCol = f * colWidth;

    for (let r = 0; r < numRows; r++) {
      const line = lines[r + 1];
      const segment = line.substring(startCol, startCol + colWidth).trim();
      const row = segment.split('').map(charToValue);
      matrix.push(row);
    }

    // Parse time from label (e.g., "t=0s" -> 0)
    const label = labels[f];
    const timeMatch = label.match(/t=(\d+)/);
    const time = timeMatch ? parseInt(timeMatch[1], 10) : f;

    snapshots.push({ time, matrix });
  }

  return snapshots;
}

/**
 * Compare two matrices and return true if they match within ASCII precision
 * (values that map to the same character are considered equal)
 */
export function matricesMatchAscii(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (valueToChar(a[r][c]) !== valueToChar(b[r][c])) return false;
    }
  }
  return true;
}
