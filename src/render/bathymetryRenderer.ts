// Bathymetry Heat Map Renderer (Plan 130)
// Renders ocean floor depth as a color-coded heat map
// Uses caching for performance - builds once, blits each frame

import { getDepth } from '../state/bathymetryModel.js';

/**
 * Build bathymetry heat map to an offscreen canvas
 * @param {number} width - Canvas width in pixels
 * @param {number} oceanTop - Y coordinate of ocean top (horizon)
 * @param {number} oceanBottom - Y coordinate of ocean bottom (shore line)
 * @param {object} bathymetry - Bathymetry configuration
 * @param {object} options - Rendering options
 * @param {number} options.stepX - Horizontal cell size (default 4)
 * @param {number} options.stepY - Vertical cell size (default 4)
 * @param {number} options.colorScaleDepth - Depth at which color saturates (default 15)
 * @returns {HTMLCanvasElement} Offscreen canvas with rendered heat map
 */
export function buildBathymetryCache(
  width,
  oceanTop,
  oceanBottom,
  bathymetry,
  options: Record<string, any> = {}
) {
  const { stepX = 4, stepY = 4, colorScaleDepth = 15 } = options;

  const cache = document.createElement('canvas');
  cache.width = width;
  cache.height = oceanBottom;
  const cacheCtx = cache.getContext('2d');

  for (let y = oceanTop; y < oceanBottom; y += stepY) {
    const progress = (y - oceanTop) / (oceanBottom - oceanTop);
    for (let x = 0; x < width; x += stepX) {
      const normalizedX = x / width;
      const depth = getDepth(normalizedX, bathymetry, progress);
      const { r, g, b } = depthToColor(depth, colorScaleDepth);
      cacheCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      cacheCtx.fillRect(x, y, stepX, stepY);
    }
  }

  return cache;
}

/**
 * Convert depth value to RGB color
 * Shallow = sand/tan, Deep = dark brown
 * @param {number} depth - Water depth in meters
 * @param {number} colorScaleDepth - Depth at which color saturates
 * @returns {{r: number, g: number, b: number}} RGB color values
 */
export function depthToColor(depth, colorScaleDepth = 15) {
  // Use sqrt for non-linear scaling - shows shallow areas more distinctly
  const depthRatio = Math.min(1, Math.sqrt(depth / colorScaleDepth));
  // Sand/tan for shallow (depthRatio near 0), dark brown for deep (depthRatio near 1)
  return {
    r: Math.floor(220 - 160 * depthRatio), // 220 -> 60
    g: Math.floor(180 - 140 * depthRatio), // 180 -> 40
    b: Math.floor(100 - 80 * depthRatio), // 100 -> 20
  };
}

/**
 * Create a cache manager for bathymetry rendering
 * Handles cache invalidation on resize
 * @returns {object} Cache manager with get() and invalidate() methods
 */
export function createBathymetryCacheManager() {
  let cache = null;
  let cachedWidth = 0;
  let cachedHeight = 0;

  return {
    /**
     * Get or build the bathymetry cache
     * @param {number} width - Canvas width
     * @param {number} oceanTop - Ocean top Y coordinate
     * @param {number} oceanBottom - Ocean bottom Y coordinate
     * @param {object} bathymetry - Bathymetry config
     * @param {object} options - Rendering options
     * @returns {HTMLCanvasElement} Cached canvas
     */
    get(width, oceanTop, oceanBottom, bathymetry, options = {}) {
      if (!cache || cachedWidth !== width || cachedHeight !== oceanBottom) {
        cache = buildBathymetryCache(width, oceanTop, oceanBottom, bathymetry, options);
        cachedWidth = width;
        cachedHeight = oceanBottom;
      }
      return cache;
    },

    /**
     * Invalidate the cache (call on resize)
     */
    invalidate() {
      cache = null;
      cachedWidth = 0;
      cachedHeight = 0;
    },

    /**
     * Check if cache is valid for given dimensions
     * @param {number} width - Canvas width
     * @param {number} height - Ocean bottom Y coordinate
     * @returns {boolean} True if cache is valid
     */
    isValid(width, height) {
      return cache !== null && cachedWidth === width && cachedHeight === height;
    },
  };
}
