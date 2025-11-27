// Surfing Game - Step 1: Simple top-down view with swell lines
// Just a grid, a shore line, and swell lines traveling in
//
// Animation uses requestAnimationFrame with delta time:
// - Frame-rate independent: movement is based on elapsed time, not frame count
// - If frames are skipped/slow, deltaTime is larger so animation "catches up"
// - Swell lines move at consistent real-world speed regardless of fps

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Make canvas fill the screen
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// World settings
const world = {
    // Shore is at the bottom of the screen
    shoreHeight: 100,      // Height of shore strip at bottom

    // Swell parameters
    swellSpacing: 80,      // Distance between swell lines (pixels)
    swellSpeed: 50,        // Pixels per second toward shore (downward)
    swellOffset: 0,        // Current offset (animated)
};

// Colors
const colors = {
    ocean: '#1a4a6e',
    shore: '#c2a86e',
    swellLine: '#4a90b8',
    grid: '#2a5a7e',
    // Gradient swell colors
    swellPeak: '#1a4a6e',    // Dark blue at wave peaks (crests)
    swellTrough: '#4a90b8',  // Lighter blue at wave troughs (valleys)
};

function update(deltaTime) {
    // Move swell lines toward shore
    world.swellOffset += world.swellSpeed * deltaTime;

    // Wrap around when a full spacing has passed
    if (world.swellOffset >= world.swellSpacing) {
        world.swellOffset -= world.swellSpacing;
    }
}

function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const shoreY = h - world.shoreHeight;  // Y position where shore starts

    // Clear with ocean color
    ctx.fillStyle = colors.ocean;
    ctx.fillRect(0, 0, w, h);

    // Draw shore (bottom strip)
    ctx.fillStyle = colors.shore;
    ctx.fillRect(0, shoreY, w, world.shoreHeight);

    // Draw gradient swells (continuous gradient simulating 3D rolling waves)
    // Each "peak" position (where discrete lines used to be) is dark
    // Each "trough" position (midpoint between peaks) is light
    // This creates a sine-wave-like intensity pattern

    const halfSpacing = world.swellSpacing / 2;

    // Start one full spacing before the top to ensure smooth edge coverage
    // This accounts for the offset animation
    const startY = world.swellOffset - world.swellSpacing;

    // Draw gradient bands from peak to trough to peak
    for (let peakY = startY; peakY < shoreY; peakY += world.swellSpacing) {
        const troughY = peakY + halfSpacing;
        const nextPeakY = peakY + world.swellSpacing;

        // First half: peak (dark) to trough (light)
        if (troughY > 0 && peakY < shoreY) {
            const grad1 = ctx.createLinearGradient(0, peakY, 0, troughY);
            grad1.addColorStop(0, colors.swellPeak);
            grad1.addColorStop(1, colors.swellTrough);
            ctx.fillStyle = grad1;
            ctx.fillRect(0, Math.max(0, peakY), w, Math.min(troughY, shoreY) - Math.max(0, peakY));
        }

        // Second half: trough (light) to next peak (dark)
        if (nextPeakY > 0 && troughY < shoreY) {
            const grad2 = ctx.createLinearGradient(0, troughY, 0, nextPeakY);
            grad2.addColorStop(0, colors.swellTrough);
            grad2.addColorStop(1, colors.swellPeak);
            ctx.fillStyle = grad2;
            ctx.fillRect(0, Math.max(0, troughY), w, Math.min(nextPeakY, shoreY) - Math.max(0, troughY));
        }
    }

    // Draw grid lines for reference (faint)
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    // Vertical grid lines
    for (let x = 0; x < w; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, shoreY);
        ctx.stroke();
    }

    ctx.globalAlpha = 1.0;

    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText('Gradient swells traveling toward shore ↓', 10, 30);
    ctx.fillText('Shore', 10, h - 20);
}

// Game loop
let lastTime = 0;

function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

console.log('Gradient swell visualization');
console.log('Smooth gradient swells roll toward shore');
