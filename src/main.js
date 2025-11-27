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

    // Discrete wave objects (v2: each wave has its own amplitude)
    waves: [],             // Array of { y: number, amplitude: number }
    lastSpawnY: 0,         // Track position for spawning waves at consistent intervals

    // Wave set/lull parameters
    setConfig: {
        wavesPerSet: [4, 8],      // min, max waves per set
        lullDuration: [20, 60],   // min, max seconds between sets
        peakPosition: 0.4,        // biggest wave at 40% through set
        minAmplitude: 0.3,        // smallest waves in set (visible but subtle)
    },
    // State machine for sets/lulls
    setState: 'LULL',             // LULL, SET
    setTimer: 0,                  // Time in current state
    setDuration: 0,               // Duration of current state
    currentSetWaves: 0,           // Number of waves to spawn in current set
    wavesSpawned: 0,              // Waves spawned so far in current set
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

// Parse hex color to RGB components
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

// Lerp between two colors based on amplitude
// At low amplitude, trough color approaches peak color (less contrast)
function getTroughColor(amplitude) {
    const peak = hexToRgb(colors.swellPeak);
    const trough = hexToRgb(colors.swellTrough);

    // Interpolate: at amplitude=1, use full trough color; at amplitude=0, use peak color
    const r = peak.r + (trough.r - peak.r) * amplitude;
    const g = peak.g + (trough.g - peak.g) * amplitude;
    const b = peak.b + (trough.b - peak.b) * amplitude;

    return rgbToHex(r, g, b);
}

// Random number in range [min, max]
function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

// Initialize a new lull period
function startLull() {
    world.setState = 'LULL';
    world.setTimer = 0;
    world.setDuration = randomInRange(
        world.setConfig.lullDuration[0],
        world.setConfig.lullDuration[1]
    );
}

// Initialize a new set
function startSet() {
    world.setState = 'SET';
    world.setTimer = 0;
    world.currentSetWaves = Math.floor(randomInRange(
        world.setConfig.wavesPerSet[0],
        world.setConfig.wavesPerSet[1] + 1
    ));
    world.wavesSpawned = 0;
}

// Spawn a wave at the top of the screen with the given amplitude
function spawnWave(amplitude) {
    world.waves.push({
        y: 0,
        amplitude: amplitude,
    });
}

// Calculate amplitude based on progress through the set (0 to 1)
function calculateSetAmplitude(progress) {
    const peak = world.setConfig.peakPosition;
    const min = world.setConfig.minAmplitude;

    // Bell curve centered at peakPosition
    // Use a smooth envelope: ramp up, peak, ramp down
    let amplitude;
    if (progress < peak) {
        // Building phase: ease in from min to 1.0
        const t = progress / peak;
        amplitude = min + (1.0 - min) * (t * t); // quadratic ease in
    } else {
        // Fading phase: ease out from 1.0 to min
        const t = (progress - peak) / (1.0 - peak);
        amplitude = 1.0 - (1.0 - min) * (t * t); // quadratic ease out
    }
    return amplitude;
}

// Update set/lull state machine
function updateSetState(deltaTime) {
    world.setTimer += deltaTime;

    switch (world.setState) {
        case 'LULL':
            // During lull, no new waves are spawned
            // Existing waves continue to travel (handled in update())
            if (world.setTimer >= world.setDuration) {
                startSet();
            }
            break;

        case 'SET':
            // Check if we should spawn a new wave
            // Waves spawn when enough distance has been traveled since last spawn
            if (world.wavesSpawned < world.currentSetWaves) {
                // Check if the last wave has traveled far enough to spawn another
                const lastWave = world.waves.length > 0 ? world.waves[world.waves.length - 1] : null;
                const canSpawn = !lastWave || lastWave.y >= world.swellSpacing;

                if (canSpawn) {
                    // Calculate amplitude based on progress through the set
                    // Handle single-wave sets by defaulting to peak amplitude
                    const progress = world.currentSetWaves > 1
                        ? world.wavesSpawned / (world.currentSetWaves - 1)
                        : world.setConfig.peakPosition;  // Single wave gets peak amplitude
                    const amplitude = calculateSetAmplitude(progress);
                    spawnWave(amplitude);
                    world.wavesSpawned++;
                }
            }

            // Set is complete when all waves have been spawned
            if (world.wavesSpawned >= world.currentSetWaves) {
                startLull();
            }
            break;
    }
}

function update(deltaTime) {
    // Update set/lull state machine
    updateSetState(deltaTime);

    // Move all waves toward shore
    for (const wave of world.waves) {
        wave.y += world.swellSpeed * deltaTime;
    }

    // Remove waves that have passed the shore
    const shoreY = canvas.height - world.shoreHeight;
    world.waves = world.waves.filter(wave => wave.y < shoreY + world.swellSpacing);
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

    // Draw each wave as a gradient band
    // Each wave has its own amplitude that determines contrast
    const halfSpacing = world.swellSpacing / 2;

    for (const wave of world.waves) {
        const peakY = wave.y;
        const troughY = peakY + halfSpacing;
        const nextPeakY = peakY + world.swellSpacing;
        const currentTroughColor = getTroughColor(wave.amplitude);

        // First half: peak (dark) to trough (light)
        if (troughY > 0 && peakY < shoreY) {
            const grad1 = ctx.createLinearGradient(0, peakY, 0, troughY);
            grad1.addColorStop(0, colors.swellPeak);
            grad1.addColorStop(1, currentTroughColor);
            ctx.fillStyle = grad1;
            ctx.fillRect(0, Math.max(0, peakY), w, Math.min(troughY, shoreY) - Math.max(0, peakY));
        }

        // Second half: trough (light) to next peak (dark)
        if (nextPeakY > 0 && troughY < shoreY) {
            const grad2 = ctx.createLinearGradient(0, troughY, 0, nextPeakY);
            grad2.addColorStop(0, currentTroughColor);
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
    ctx.fillText('Wave sets and lulls (v2) ↓', 10, 30);
    ctx.fillText('Shore', 10, h - 20);

    // Debug UI: Set/Lull status
    const stateLabel = world.setState;
    const wavesInfo = world.setState === 'SET'
        ? `${world.wavesSpawned}/${world.currentSetWaves}`
        : `${world.waves.length} on screen`;
    const timeRemaining = Math.max(0, world.setDuration - world.setTimer).toFixed(1);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(w - 220, 10, 210, 80);

    ctx.fillStyle = '#fff';
    ctx.fillText(`State: ${stateLabel}`, w - 210, 30);
    ctx.fillText(`Waves: ${wavesInfo}`, w - 210, 50);
    ctx.fillText(`Time left: ${timeRemaining}s`, w - 210, 70);

    // Wave count bar (shows waves on screen)
    ctx.fillStyle = '#333';
    ctx.fillRect(w - 210, 75, 190, 10);
    ctx.fillStyle = '#4a90b8';
    const maxWaves = 10;
    ctx.fillRect(w - 210, 75, 190 * Math.min(world.waves.length / maxWaves, 1), 10);
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

// Initialize first lull with random duration
startLull();

requestAnimationFrame(gameLoop);

console.log('Wave Sets and Lulls visualization');
console.log('Watch for sets of waves building and fading, separated by calm lulls');
