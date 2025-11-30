/**
 * Matrix ↔ Field Conversion Utilities
 *
 * These utilities convert between 2D matrices (for readable test assertions)
 * and flat Float32Array fields (for efficient simulation).
 */

/**
 * Create a field from a 2D matrix
 * @param {number[][]} matrix - 2D array [row][col], row 0 = horizon
 * @param {object} options - Optional configuration
 * @param {number} options.width - Override width (defaults to matrix[0].length)
 * @param {number} options.height - Override height (defaults to matrix.length)
 * @returns {object} Field with height, velocity, width, gridHeight
 */
export function matrixToField(matrix, options: Record<string, any> = {}) {
  const height = options.height ?? matrix.length;
  const width = options.width ?? matrix[0]?.length ?? 0;
  const size = width * height;

  const heightArray = new Float32Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      heightArray[y * width + x] = matrix[y]?.[x] ?? 0;
    }
  }

  return {
    height: heightArray,
    velocity: new Float32Array(size),
    width,
    gridHeight: height,
  };
}

/**
 * Extract field as 2D matrix for assertions and visualization
 * @param {object} field - Field with height array
 * @param {object} options - Optional configuration
 * @param {number} options.decimals - Decimal places to round to (default: 2)
 * @returns {number[][]} 2D matrix [row][col]
 */
export function fieldToMatrix(field, options: Record<string, any> = {}) {
  const { decimals = 2 } = options;
  const matrix = [];

  for (let y = 0; y < field.gridHeight; y++) {
    const row = [];
    for (let x = 0; x < field.width; x++) {
      const val = field.height[y * field.width + x];
      row.push(Number(val.toFixed(decimals)));
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Clone a field (deep copy)
 * @param {object} field - Field to clone
 * @returns {object} New field with copied arrays
 */
export function cloneField(field) {
  return {
    height: new Float32Array(field.height),
    velocity: new Float32Array(field.velocity),
    width: field.width,
    gridHeight: field.gridHeight,
  };
}

/**
 * Compare two matrices for equality within tolerance
 * @param {number[][]} a - First matrix
 * @param {number[][]} b - Second matrix
 * @param {number} tolerance - Maximum allowed difference (default: 0.001)
 * @returns {boolean} True if matrices are equal within tolerance
 */
export function matricesEqual(a, b, tolerance = 0.001) {
  if (a.length !== b.length) return false;

  for (let y = 0; y < a.length; y++) {
    if (a[y].length !== b[y].length) return false;
    for (let x = 0; x < a[y].length; x++) {
      if (Math.abs(a[y][x] - b[y][x]) > tolerance) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get total energy in a matrix (sum of all values)
 * @param {number[][]} matrix - Matrix to sum
 * @returns {number} Total energy
 */
export function matrixTotalEnergy(matrix) {
  return matrix.flat().reduce((sum, val) => sum + Math.max(0, val), 0);
}

/**
 * Get maximum value in a matrix
 * @param {number[][]} matrix - Matrix to search
 * @returns {number} Maximum value
 */
export function matrixMax(matrix) {
  return Math.max(...matrix.flat());
}

/**
 * Get the row index with maximum energy
 * @param {number[][]} matrix - Matrix to search
 * @returns {number} Row index (0 = horizon)
 */
export function matrixPeakRow(matrix) {
  let maxRowSum = -Infinity;
  let maxRowIdx = 0;

  for (let y = 0; y < matrix.length; y++) {
    const rowSum = matrix[y].reduce((sum, val) => sum + val, 0);
    if (rowSum > maxRowSum) {
      maxRowSum = rowSum;
      maxRowIdx = y;
    }
  }

  return maxRowIdx;
}
