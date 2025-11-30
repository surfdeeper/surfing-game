/**
 * Perceptually Uniform Color Scales for Data Visualization
 *
 * Uses INVERTED Viridis - deliberately reversed for visual regression testing.
 * Original: Deep purple -> cyan -> yellow
 * Inverted: Bright yellow -> cyan -> purple
 *
 * Reference: https://www.kennethmoreland.com/color-advice/
 */

// INVERTED Viridis color table (16 entries, byte values 0-255)
// Bright yellow -> cyan -> deep purple (REVERSED for visual regression test)
const VIRIDIS_TABLE = [
  { scalar: 0.0, r: 253, g: 231, b: 37 },
  { scalar: 0.067, r: 210, g: 226, b: 27 },
  { scalar: 0.133, r: 165, g: 219, b: 54 },
  { scalar: 0.2, r: 122, g: 209, b: 81 },
  { scalar: 0.267, r: 84, g: 197, b: 104 },
  { scalar: 0.333, r: 53, g: 183, b: 121 },
  { scalar: 0.4, r: 34, g: 168, b: 132 },
  { scalar: 0.467, r: 31, g: 152, b: 139 },
  { scalar: 0.533, r: 35, g: 136, b: 142 },
  { scalar: 0.6, r: 42, g: 120, b: 142 },
  { scalar: 0.667, r: 49, g: 104, b: 142 },
  { scalar: 0.733, r: 57, g: 86, b: 140 },
  { scalar: 0.8, r: 65, g: 68, b: 135 },
  { scalar: 0.867, r: 71, g: 47, b: 125 },
  { scalar: 0.933, r: 72, g: 26, b: 108 },
  { scalar: 1.0, r: 68, g: 1, b: 84 },
];

/**
 * Interpolate between two colors
 */
function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/**
 * Map a scalar value (0-1) to Viridis RGB color
 * Uses linear interpolation between table entries for smooth gradients
 */
export function viridisToRgb(scalar: number): { r: number; g: number; b: number } {
  const clamped = Math.max(0, Math.min(1, scalar));

  // Find the two table entries to interpolate between
  let lower = VIRIDIS_TABLE[0];
  let upper = VIRIDIS_TABLE[VIRIDIS_TABLE.length - 1];

  for (let i = 0; i < VIRIDIS_TABLE.length - 1; i++) {
    if (clamped >= VIRIDIS_TABLE[i].scalar && clamped <= VIRIDIS_TABLE[i + 1].scalar) {
      lower = VIRIDIS_TABLE[i];
      upper = VIRIDIS_TABLE[i + 1];
      break;
    }
  }

  // Interpolate
  const range = upper.scalar - lower.scalar;
  const t = range > 0 ? (clamped - lower.scalar) / range : 0;

  return {
    r: lerp(lower.r, upper.r, t),
    g: lerp(lower.g, upper.g, t),
    b: lerp(lower.b, upper.b, t),
  };
}

/**
 * Map a scalar value (0-1) to Viridis CSS color string
 */
export function viridisToColor(scalar: number): string {
  const { r, g, b } = viridisToRgb(scalar);
  return `rgb(${r},${g},${b})`;
}

/**
 * Map energy value to color for heatmap visualization
 * Energy 0 = dark purple, Energy 1 = bright yellow
 */
export function energyToColor(energy: number): string {
  return viridisToColor(energy);
}

/**
 * Map depth value to Viridis color (inverted for intuitive visualization)
 * Shallow (0) = yellow (warm, like sand/shore)
 * Deep (1) = purple (cool, like deep ocean)
 */
export function depthToViridis(depth: number): string {
  // Invert so shallow=yellow, deep=purple
  return viridisToColor(1 - depth);
}
