// Energy Field Renderer
// Renders the 2D energy field as color-mapped cells
//
// Energy values are mapped to colors:
// - Zero/low energy = dark gray
// - High energy = bright purple (set waves have more energy)

/**
 * Render the energy field to canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {object} field - Energy field from energyFieldModel
 * @param {number} oceanTop - Y pixel position of horizon
 * @param {number} oceanBottom - Y pixel position of shore
 * @param {number} canvasWidth - Canvas width in pixels
 */
export function renderEnergyField(ctx, field, oceanTop, oceanBottom, canvasWidth) {
    const { height, width, gridHeight } = field;

    const cellW = canvasWidth / width;
    const cellH = (oceanBottom - oceanTop) / gridHeight;

    // Color scheme:
    // - nothing (0) = translucent
    // - low energy = green
    // - high energy = purple
    const lowColor = { r: 50, g: 200, b: 50 };     // Green - low energy
    const highColor = { r: 180, g: 50, b: 220 };   // Purple - high energy

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < width; x++) {
            const h = height[y * width + x];

            // Skip if no energy (translucent)
            if (h < 0.05) continue;

            // Map energy level to color
            // Background waves: ~0.2-0.4 amplitude = green
            // Set waves: ~0.7-1.0 amplitude * 2 = 1.4-2.0 = purple
            // Threshold at 0.6 - below is green, above trends to purple
            const t = Math.max(0, Math.min(1, (h - 0.2) / 0.8)); // green at 0.2, purple at 1.0+

            const r = lowColor.r + (highColor.r - lowColor.r) * t;
            const g = lowColor.g + (highColor.g - lowColor.g) * t;
            const b = lowColor.b + (highColor.b - lowColor.b) * t;

            ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
            ctx.fillRect(
                x * cellW,
                oceanTop + y * cellH,
                cellW + 1,
                cellH + 1
            );
        }
    }
}

/**
 * Render energy field with ImageData for better performance
 * Creates pixel buffer once and blits to canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {object} field - Energy field from energyFieldModel
 * @param {number} oceanTop - Y pixel position of horizon
 * @param {number} oceanBottom - Y pixel position of shore
 * @param {number} canvasWidth - Canvas width in pixels
 */
export function renderEnergyFieldFast(ctx, field, oceanTop, oceanBottom, canvasWidth) {
    const { height, width, gridHeight } = field;

    // Calculate pixel dimensions
    const pixelWidth = Math.ceil(canvasWidth);
    const pixelHeight = Math.ceil(oceanBottom - oceanTop);

    // Create ImageData buffer
    const imageData = ctx.createImageData(pixelWidth, pixelHeight);
    const data = imageData.data;

    // Color mapping parameters
    const baseColor = { r: 26, g: 74, b: 110 };
    const peakColor = { r: 74, g: 144, b: 184 };
    const troughColor = { r: 13, g: 58, b: 92 };

    // Fill each pixel
    for (let py = 0; py < pixelHeight; py++) {
        for (let px = 0; px < pixelWidth; px++) {
            // Map pixel to grid cell
            const gx = Math.floor((px / pixelWidth) * width);
            const gy = Math.floor((py / pixelHeight) * gridHeight);
            const h = height[gy * width + gx];

            // Map height to color
            const clampedH = Math.max(-1, Math.min(1, h));

            let r, g, b;
            if (clampedH >= 0) {
                const t = clampedH;
                r = baseColor.r + (peakColor.r - baseColor.r) * t;
                g = baseColor.g + (peakColor.g - baseColor.g) * t;
                b = baseColor.b + (peakColor.b - baseColor.b) * t;
            } else {
                const t = -clampedH;
                r = baseColor.r + (troughColor.r - baseColor.r) * t;
                g = baseColor.g + (troughColor.g - baseColor.g) * t;
                b = baseColor.b + (troughColor.b - baseColor.b) * t;
            }

            const idx = (py * pixelWidth + px) * 4;
            data[idx] = Math.round(r);
            data[idx + 1] = Math.round(g);
            data[idx + 2] = Math.round(b);
            data[idx + 3] = 255; // Alpha
        }
    }

    ctx.putImageData(imageData, 0, oceanTop);
}
