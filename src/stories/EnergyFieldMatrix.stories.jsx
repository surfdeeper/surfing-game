/**
 * Energy Field Matrix Stories
 *
 * Renders the exact output matrices from energyFieldPropagation.test.js
 * No interactivity, no backgrounds - just the raw heat map visualization.
 */
import { useRef, useEffect } from 'react';
import { renderEnergyField } from '../render/energyFieldRenderer.js';
import {
    PROGRESSION_NO_DAMPING,
    PROGRESSION_WITH_DAMPING,
    PROGRESSION_HIGH_DAMPING,
    PROGRESSION_WITH_DRAIN,
} from '../state/energyFieldPropagation.test.js';

// Small canvas to match the 5x6 test matrix
const CELL_SIZE = 40;
const CANVAS_WIDTH = 5 * CELL_SIZE;
const CANVAS_HEIGHT = 6 * CELL_SIZE;

/**
 * Convert 2D matrix array to field object for renderer
 */
function matrixToField(matrix) {
    const gridHeight = matrix.length;
    const width = matrix[0].length;
    const height = new Float32Array(width * gridHeight);

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < width; x++) {
            height[y * width + x] = matrix[y][x];
        }
    }

    return { height, width, gridHeight };
}

/**
 * Single matrix canvas - renders one snapshot
 */
function MatrixCanvas({ matrix, label }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const field = matrixToField(matrix);

        // Clear
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Render using production renderer
        renderEnergyField(ctx, field, 0, CANVAS_HEIGHT, CANVAS_WIDTH);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= 5; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL_SIZE, 0);
            ctx.lineTo(x * CELL_SIZE, CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y <= 6; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL_SIZE);
            ctx.lineTo(CANVAS_WIDTH, y * CELL_SIZE);
            ctx.stroke();
        }

        // Draw values in each cell
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 5; x++) {
                const val = matrix[y][x];
                ctx.fillText(
                    val.toFixed(2),
                    x * CELL_SIZE + CELL_SIZE/2,
                    y * CELL_SIZE + CELL_SIZE/2 + 4
                );
            }
        }

        // Label
        ctx.fillStyle = 'yellow';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(label, 4, 12);

    }, [matrix, label]);

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ border: '1px solid #333', display: 'block' }}
        />
    );
}

/**
 * Timeline strip - shows progression at multiple time points
 */
function ProgressionStrip({ snapshots, title }) {
    return (
        <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontFamily: 'monospace', fontSize: '14px', color: '#ccc' }}>
                {title}
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {snapshots.map(({ time, matrix, label }) => (
                    <MatrixCanvas key={time} matrix={matrix} label={label || `t=${time}s`} />
                ))}
            </div>
        </div>
    );
}

// ============================================
// STORIES
// ============================================

/**
 * No damping - energy propagates without decay
 */
export const NoDamping = () => (
    <div>
        <h3 style={{ margin: '0 0 8px 0', fontFamily: 'monospace', fontSize: '14px', color: '#ccc' }}>
            No Damping (deep water)
        </h3>
        <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888', margin: '0 0 12px 0', maxWidth: '600px' }}>
            Energy pulse starts at row 0 (horizon) and propagates downward toward row 5 (shore).
            In deep water with no damping, energy maintains its magnitude as it travels.
            The pulse spreads vertically due to the blending algorithm (each row blends with the row above).
            Green = low energy, purple = high energy. Values show exact energy at each cell.
        </p>
        <ProgressionStrip
            snapshots={PROGRESSION_NO_DAMPING}
            title="t=0s to t=5s, travelDuration=6s"
        />
    </div>
);

/**
 * With damping - energy decays in shallow water
 */
export const WithDamping = () => (
    <div>
        <h3 style={{ margin: '0 0 8px 0', fontFamily: 'monospace', fontSize: '14px', color: '#ccc' }}>
            With Damping (coeff=0.1, exp=2.0)
        </h3>
        <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888', margin: '0 0 12px 0', maxWidth: '600px' }}>
            Depth-based damping causes energy to decay faster in shallow water.
            The damping formula is: energy *= exp(-coefficient * dt / depth^exponent).
            Depth decreases linearly from 10m at horizon to 0.5m at shore.
            Notice how energy fades as it approaches the bottom rows (shallow water near shore).
            This prevents energy from "piling up" at the shoreline.
        </p>
        <ProgressionStrip
            snapshots={PROGRESSION_WITH_DAMPING}
            title="t=0s to t=5s, depthDampingCoefficient=0.1"
        />
    </div>
);

/**
 * High damping - aggressive decay
 */
export const HighDamping = () => (
    <div>
        <h3 style={{ margin: '0 0 8px 0', fontFamily: 'monospace', fontSize: '14px', color: '#ccc' }}>
            High Damping (coeff=0.2, exp=2.0)
        </h3>
        <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888', margin: '0 0 12px 0', maxWidth: '600px' }}>
            Doubling the damping coefficient (0.2 vs 0.1) causes more aggressive energy decay.
            Energy dissipates before reaching the shore, which may be desirable to prevent
            visual artifacts at the shoreline. Compare with the previous story to see the difference.
            Too much damping can make waves feel weak; too little causes energy buildup at shore.
        </p>
        <ProgressionStrip
            snapshots={PROGRESSION_HIGH_DAMPING}
            title="t=0s to t=5s, depthDampingCoefficient=0.2"
        />
    </div>
);

/**
 * Compare all three progressions side by side
 */
export const CompareAll = () => (
    <div>
        <h3 style={{ margin: '0 0 8px 0', fontFamily: 'monospace', fontSize: '14px', color: '#ccc' }}>
            Side-by-Side Comparison
        </h3>
        <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888', margin: '0 0 12px 0', maxWidth: '600px' }}>
            All three damping configurations shown together for easy comparison.
            Look at how much energy remains at t=5s in each case.
            No damping: energy reaches shore at full strength.
            Coeff=0.1: energy reduced but still visible near shore.
            Coeff=0.2: energy mostly dissipated before reaching shore.
        </p>
        <ProgressionStrip
            snapshots={PROGRESSION_NO_DAMPING}
            title="No Damping (coeff=0)"
        />
        <ProgressionStrip
            snapshots={PROGRESSION_WITH_DAMPING}
            title="Moderate Damping (coeff=0.1)"
        />
        <ProgressionStrip
            snapshots={PROGRESSION_HIGH_DAMPING}
            title="High Damping (coeff=0.2)"
        />
    </div>
);

/**
 * Energy drain - shows gap where breaking drained energy over time
 */
export const DrainHole = () => (
    <div>
        <h3 style={{ margin: '0 0 8px 0', fontFamily: 'monospace', fontSize: '14px', color: '#ccc' }}>
            Energy Drain (Wave Breaking)
        </h3>
        <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888', margin: '0 0 12px 0', maxWidth: '600px' }}>
            At t=1s, the center column (x=0.5) is completely drained, simulating a wave breaking.
            Compare each frame's center column to its neighbors - the center should be 0 or near-0
            while neighbors retain energy. The drain persists as energy continues propagating,
            creating a vertical "stripe" where breaking removed all energy.
        </p>
        <ProgressionStrip
            snapshots={PROGRESSION_WITH_DRAIN}
            title="Center column drained at t=1s"
        />
    </div>
);

export default {
    title: 'Energy Field/Matrix',
};
