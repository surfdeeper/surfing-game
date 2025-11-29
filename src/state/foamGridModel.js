// Foam Grid Model
// Grid-based foam simulation driven by energy transfer/breaking.
// All layers are grids: energy → energy transfer → foam density.

import { FIELD_HEIGHT, FIELD_WIDTH } from './energyFieldModel.js';

export const FOAM_GRID_WIDTH = FIELD_WIDTH;
export const FOAM_GRID_HEIGHT = FIELD_HEIGHT;

function createLayer(width = FOAM_GRID_WIDTH, height = FOAM_GRID_HEIGHT) {
    return {
        data: new Float32Array(width * height),
        width,
        height,
    };
}

export function createFoamGrids() {
    const energyTransfer = createLayer();
    // Snapshot of the most recent transfer frame for rendering/debugging
    energyTransfer.lastFrame = new Float32Array(energyTransfer.data.length);

    return {
        energyTransfer,
        foam: createLayer(),
    };
}

/**
 * Add dissipated energy to the energy transfer grid at a normalized position.
 */
export function accumulateEnergyTransfer(energyTransferGrid, normalizedX, normalizedY, amount) {
    const { data, width, height } = energyTransferGrid;
    const gx = Math.max(0, Math.min(width - 1, Math.floor(normalizedX * width)));
    const gy = Math.max(0, Math.min(height - 1, Math.floor(normalizedY * height)));
    data[gy * width + gx] += amount;
}

/**
 * Decay and advect the foam grid, depositing from the energy transfer grid.
 * Foam is read/write; energy transfer is cleared after transfer.
 */
export function updateFoamLayer(foamGrid, energyTransferGrid, dt, options = {}) {
    const {
        depositScale = 0.2,   // foam gain per unit transfer
        decayRate = 0.35,     // per-second decay
        advectRate = 0.35,    // fraction moved toward shore per second
    } = options;

    const { data: foam, width, height } = foamGrid;
    const { data: transfer } = energyTransferGrid;

    // Transfer energy into foam and apply decay
    for (let idx = 0; idx < foam.length; idx++) {
        const deposited = transfer[idx] * depositScale;
        const decayed = foam[idx] * Math.max(0, 1 - decayRate * dt);
        foam[idx] = Math.min(1, decayed + deposited);
        transfer[idx] = 0; // clear for next frame
    }

    // Simple shoreward advection: push a fraction of each row into the row below
    // Work bottom-up to avoid double counting
    if (advectRate > 0) {
        const advectFactor = Math.min(1, advectRate * dt);
        for (let y = height - 2; y >= 0; y--) {
            const rowStart = y * width;
            const nextRowStart = (y + 1) * width;
            for (let x = 0; x < width; x++) {
                const idx = rowStart + x;
                const downIdx = nextRowStart + x;
                const portion = foam[idx] * advectFactor;
                foam[idx] -= portion;
                foam[downIdx] = Math.min(1, foam[downIdx] + portion);
            }
        }
    }
}

/**
 * Sample foam density at normalized coordinates (bilinear interpolation).
 */
export function sampleFoamGrid(foamGrid, normalizedX, normalizedY) {
    const { data, width, height } = foamGrid;

    const gx = normalizedX * (width - 1);
    const gy = normalizedY * (height - 1);

    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);

    const fx = gx - x0;
    const fy = gy - y0;

    const idx00 = y0 * width + x0;
    const idx10 = y0 * width + x1;
    const idx01 = y1 * width + x0;
    const idx11 = y1 * width + x1;

    const h00 = data[idx00];
    const h10 = data[idx10];
    const h01 = data[idx01];
    const h11 = data[idx11];

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    return h0 * (1 - fy) + h1 * fy;
}
