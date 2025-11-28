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
    swellSpacing: 80,      // Visual spacing of wave gradient (pixels)
    swellSpeed: 50,        // Pixels per second toward shore (downward)

    // Discrete wave objects
    waves: [],             // Array of { y: number, amplitude: number }

    // Wave timing (in seconds) - based on real ocean physics
    // Swell period: time between wave crests passing a fixed point
    swellPeriod: 15,       // Base seconds between waves (typical long-period swell)
    periodVariation: 5,    // +/- seconds of variation

    // Set/lull timing
    setConfig: {
        wavesPerSet: [4, 8],      // waves per set
        lullWavesPerSet: [2, 4],  // waves during lull (smaller waves)
        lullDuration: 30,         // base seconds between sets
        lullVariation: 5,         // +/- seconds
        peakPosition: 0.4,        // biggest wave at 40% through set
        minAmplitude: 0.3,        // smallest waves in set
        lullMaxAmplitude: 0.35,   // max amplitude during lull
        lullMinAmplitude: 0.15,   // min amplitude during lull
    },

    // State machine for sets/lulls
    setState: 'LULL',             // LULL, SET
    setTimer: 0,                  // Time in current state
    setDuration: 0,               // Duration of current state
    currentSetWaves: 0,           // Number of waves to spawn in current set
    wavesSpawned: 0,              // Waves spawned so far in current set
    timeSinceLastWave: 0,         // Time since last wave spawned
    nextWaveTime: 0,              // When to spawn next wave
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

// Calculate next wave spawn time
function getNextWaveTime() {
    return world.swellPeriod + randomInRange(-world.periodVariation, world.periodVariation);
}

// Initialize a new lull period
function startLull() {
    world.setState = 'LULL';
    world.setTimer = 0;
    world.setDuration = world.setConfig.lullDuration +
        randomInRange(-world.setConfig.lullVariation, world.setConfig.lullVariation);
    world.currentSetWaves = Math.floor(randomInRange(
        world.setConfig.lullWavesPerSet[0],
        world.setConfig.lullWavesPerSet[1] + 1
    ));
    world.wavesSpawned = 0;
    world.timeSinceLastWave = 0;
    world.nextWaveTime = getNextWaveTime();
}

// Initialize a new set
function startSet() {
    world.setState = 'SET';
    world.setTimer = 0;
    world.currentSetWaves = Math.floor(randomInRange(
        world.setConfig.wavesPerSet[0],
        world.setConfig.wavesPerSet[1] + 1
    ));
    // Estimate set duration based on waves * period (for UI display)
    world.setDuration = (world.currentSetWaves - 1) * world.swellPeriod;
    world.wavesSpawned = 0;
    world.timeSinceLastWave = 0;
    world.nextWaveTime = getNextWaveTime();
}

// Spawn a wave at the top of the screen with the given amplitude
function spawnWave(amplitude) {
    world.waves.push({
        y: 0,
        amplitude: amplitude,
    });
    world.timeSinceLastWave = 0;
    world.nextWaveTime = getNextWaveTime();
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

// Update set/lull state machine (time-based spawning)
function updateSetState(deltaTime) {
    world.setTimer += deltaTime;
    world.timeSinceLastWave += deltaTime;

    // Check if it's time to spawn a wave
    const shouldSpawn = world.timeSinceLastWave >= world.nextWaveTime;

    switch (world.setState) {
        case 'LULL':
            // Lulls have smaller waves at the same period
            if (shouldSpawn && world.wavesSpawned < world.currentSetWaves) {
                const amplitude = randomInRange(
                    world.setConfig.lullMinAmplitude,
                    world.setConfig.lullMaxAmplitude
                );
                spawnWave(amplitude);
                world.wavesSpawned++;
            }

            // Finished lull set, start another mini-set
            if (world.wavesSpawned >= world.currentSetWaves) {
                world.currentSetWaves = Math.floor(randomInRange(
                    world.setConfig.lullWavesPerSet[0],
                    world.setConfig.lullWavesPerSet[1] + 1
                ));
                world.wavesSpawned = 0;
            }

            // Lull duration over, time for a real set
            if (world.setTimer >= world.setDuration) {
                startSet();
            }
            break;

        case 'SET':
            if (shouldSpawn && world.wavesSpawned < world.currentSetWaves) {
                // Calculate amplitude based on progress through the set
                const progress = world.currentSetWaves > 1
                    ? world.wavesSpawned / (world.currentSetWaves - 1)
                    : world.setConfig.peakPosition;
                const amplitude = calculateSetAmplitude(progress);
                spawnWave(amplitude);
                world.wavesSpawned++;
            }

            // Set complete, start lull
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


    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText('Wave sets and lulls (v2) ↓', 10, 30);
    ctx.fillText('Shore', 10, h - 20);

    // Debug UI: Set/Lull status
    const stateLabel = world.setState;
    const nextWaveIn = Math.max(0, world.nextWaveTime - world.timeSinceLastWave).toFixed(1);
    const waveTimerProgress = Math.min(world.timeSinceLastWave / world.nextWaveTime, 1);
    const stateTimeLeft = Math.max(0, world.setDuration - world.setTimer).toFixed(1);
    const stateTimerProgress = Math.min(world.setTimer / world.setDuration, 1);
    const stateLabel2 = world.setState === 'LULL' ? 'Until set' : 'Set ends';

    // Calculate panel height based on wave count
    const baseHeight = 130;
    const waveListHeight = world.waves.length * 16;
    const panelHeight = baseHeight + waveListHeight;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(w - 220, 10, 210, panelHeight);

    ctx.fillStyle = '#fff';
    ctx.fillText(`State: ${stateLabel} (${world.wavesSpawned}/${world.currentSetWaves})`, w - 210, 30);

    ctx.fillText(`Next wave: ${nextWaveIn}s`, w - 210, 50);
    // Next wave progress bar
    ctx.fillStyle = '#333';
    ctx.fillRect(w - 210, 55, 190, 8);
    ctx.fillStyle = '#4a90b8';
    ctx.fillRect(w - 210, 55, 190 * waveTimerProgress, 8);

    ctx.fillStyle = '#fff';
    ctx.fillText(`${stateLabel2}: ${stateTimeLeft}s`, w - 210, 80);
    // State duration progress bar
    ctx.fillStyle = '#333';
    ctx.fillRect(w - 210, 85, 190, 8);
    ctx.fillStyle = world.setState === 'LULL' ? '#e8a644' : '#44e8a6';
    ctx.fillRect(w - 210, 85, 190 * stateTimerProgress, 8);

    // Active waves section
    ctx.fillStyle = '#fff';
    ctx.fillText(`Active waves: ${world.waves.length}`, w - 210, 115);

    // List each wave with amplitude, state, and time to shore
    for (let i = 0; i < world.waves.length; i++) {
        const wave = world.waves[i];
        const distanceToShore = shoreY - wave.y;
        const timeToShore = Math.max(0, distanceToShore / world.swellSpeed).toFixed(1);
        const ampPercent = Math.round(wave.amplitude * 100);

        // Determine wave state based on position
        let waveState;
        if (wave.y < 50) {
            waveState = 'approaching';
        } else if (wave.y >= shoreY) {
            waveState = 'at shore';
        } else {
            waveState = 'visible';
        }

        ctx.fillStyle = '#aaa';
        ctx.fillText(`  • ${ampPercent}% amp, ${timeToShore}s [${waveState}]`, w - 210, 130 + i * 16);
    }
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

// Initialize first lull and spawn first wave immediately
startLull();
// Spawn a lull wave right away so screen isn't empty
spawnWave(randomInRange(world.setConfig.lullMinAmplitude, world.setConfig.lullMaxAmplitude));
world.wavesSpawned++;

requestAnimationFrame(gameLoop);

console.log('Wave Sets and Lulls visualization');
console.log('Watch for sets of waves building and fading, separated by calm lulls');
