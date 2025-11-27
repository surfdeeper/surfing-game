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

    // Draw swell lines (horizontal lines moving toward shore/down)
    ctx.strokeStyle = colors.swellLine;
    ctx.lineWidth = 2;

    // Start from top, draw lines moving down
    // The offset makes them animate toward shore
    for (let y = world.swellOffset; y < shoreY; y += world.swellSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
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
    ctx.fillText('Swell lines traveling toward shore ↓', 10, 30);
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

console.log('Simple swell visualization');
console.log('Swell lines move toward shore (top of screen)');
