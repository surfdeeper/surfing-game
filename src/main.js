// Surfing Game - Time-based wave model
// Wave position is derived from time, enabling deterministic tests
//
// Architecture:
// - Wave objects store spawnTime (immutable), not position
// - Position is calculated: progress = (currentTime - spawnTime) / travelDuration
// - Coordinates mapped: progress (0-1) → screen pixels at render time

import { createWave, getWaveProgress, getActiveWaves } from './state/waveModel.js';
import { progressToScreenY, getOceanBounds, calculateTravelDuration } from './render/coordinates.js';
import {
    DEFAULT_CONFIG,
    createInitialState,
    updateSetLullState,
} from './state/setLullModel.js';
import {
    BACKGROUND_CONFIG,
    createInitialBackgroundState,
    updateBackgroundWaveState,
} from './state/backgroundWaveModel.js';

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

    // Discrete wave objects (time-based)
    // Set waves: larger, organized waves during SET state
    setWaves: [],          // Array of { id, spawnTime, amplitude }
    // Background waves: smaller, frequent waves always present
    backgroundWaves: [],   // Array of { id, spawnTime, amplitude }
    gameTime: 0,           // Current game time in ms (for time-based positions)

    // Set/lull configuration (used by setLullModel)
    setConfig: DEFAULT_CONFIG,

    // Set/lull state machine (managed by setLullModel)
    setLullState: createInitialState(DEFAULT_CONFIG),

    // Background wave configuration and state
    backgroundConfig: BACKGROUND_CONFIG,
    backgroundState: createInitialBackgroundState(BACKGROUND_CONFIG),
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

// Time scale for testing (1x, 2x, 4x, 8x)
let timeScale = 1;
const TIME_SCALES = [1, 2, 4, 8];

// Toggle time scale with 'T' key
document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') {
        const currentIndex = TIME_SCALES.indexOf(timeScale);
        const nextIndex = (currentIndex + 1) % TIME_SCALES.length;
        timeScale = TIME_SCALES[nextIndex];
        console.log(`Time scale: ${timeScale}x`);
    }
});

// Spawn a set wave at the horizon with the given amplitude
function spawnSetWave(amplitude) {
    world.setWaves.push(createWave(world.gameTime, amplitude));
}

// Spawn a background wave at the horizon with the given amplitude
function spawnBackgroundWave(amplitude) {
    world.backgroundWaves.push(createWave(world.gameTime, amplitude));
}

function update(deltaTime) {
    // Apply time scale for testing
    const scaledDelta = deltaTime * timeScale;

    // Advance game time (in ms)
    world.gameTime += scaledDelta * 1000;

    // Update set/lull state machine (handles set waves only)
    const setResult = updateSetLullState(
        world.setLullState,
        scaledDelta,
        world.setConfig
    );
    world.setLullState = setResult.state;

    // Spawn set wave if the state machine says to
    if (setResult.shouldSpawn) {
        spawnSetWave(setResult.amplitude);
    }

    // Update background wave state (always spawning, independent of set/lull)
    const bgResult = updateBackgroundWaveState(
        world.backgroundState,
        scaledDelta,
        world.backgroundConfig
    );
    world.backgroundState = bgResult.state;

    // Spawn background wave if needed
    if (bgResult.shouldSpawn) {
        spawnBackgroundWave(bgResult.amplitude);
    }

    // Remove waves that have completed their journey (time-based)
    const { oceanBottom } = getOceanBounds(canvas.height, world.shoreHeight);
    const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed);
    // Add buffer for visual spacing past shore
    const bufferDuration = (world.swellSpacing / world.swellSpeed) * 1000;
    world.setWaves = getActiveWaves(world.setWaves, world.gameTime - bufferDuration, travelDuration);
    world.backgroundWaves = getActiveWaves(world.backgroundWaves, world.gameTime - bufferDuration, travelDuration);
}

function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const { oceanTop, oceanBottom, shoreY } = getOceanBounds(h, world.shoreHeight);
    const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed);

    // Clear with ocean color
    ctx.fillStyle = colors.ocean;
    ctx.fillRect(0, 0, w, h);

    // Draw shore (bottom strip)
    ctx.fillStyle = colors.shore;
    ctx.fillRect(0, shoreY, w, world.shoreHeight);

    // Helper function to draw a wave as a gradient band
    const drawWave = (wave, opacity = 1.0) => {
        const halfSpacing = world.swellSpacing / 2;
        const progress = getWaveProgress(wave, world.gameTime, travelDuration);
        const peakY = progressToScreenY(progress, oceanTop, oceanBottom);
        const troughY = peakY + halfSpacing;
        const nextPeakY = peakY + world.swellSpacing;
        const currentTroughColor = getTroughColor(wave.amplitude);

        ctx.globalAlpha = opacity;

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

        ctx.globalAlpha = 1.0;
    };

    // Draw background waves first (behind, with reduced opacity for subtle effect)
    for (const wave of world.backgroundWaves) {
        drawWave(wave, 0.4);  // 40% opacity for background waves
    }

    // Draw set waves on top (full opacity)
    for (const wave of world.setWaves) {
        drawWave(wave, 1.0);
    }


    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    const timeLabel = timeScale > 1 ? ` [${timeScale}x speed - press T]` : ' [press T for speed]';
    ctx.fillText('Wave sets and lulls (v2) ↓' + timeLabel, 10, 30);
    ctx.fillText('Shore', 10, h - 20);

    // Debug UI: Set/Lull status (read from setLullState)
    const sls = world.setLullState;
    const stateLabel = sls.setState;
    const nextWaveIn = Math.max(0, sls.nextWaveTime - sls.timeSinceLastWave).toFixed(1);
    const waveTimerProgress = Math.min(sls.timeSinceLastWave / sls.nextWaveTime, 1);
    const stateTimeLeft = Math.max(0, sls.setDuration - sls.setTimer).toFixed(1);
    const stateTimerProgress = Math.min(sls.setTimer / sls.setDuration, 1);
    const stateLabel2 = sls.setState === 'LULL' ? 'Until set' : 'Set ends';

    // Filter and sort set waves for display (exclude at-shore, sort by progress)
    const displaySetWaves = world.setWaves
        .map(wave => ({
            wave,
            progress: getWaveProgress(wave, world.gameTime, travelDuration)
        }))
        .filter(({ progress }) => progress < 1)
        .sort((a, b) => a.progress - b.progress);  // ascending: horizon first

    // Count background waves for display
    const bgWaveCount = world.backgroundWaves.filter(wave =>
        getWaveProgress(wave, world.gameTime, travelDuration) < 1
    ).length;

    // Calculate panel height based on wave count (each wave needs space for text + progress bar)
    const baseHeight = 150;  // Increased to fit background wave count
    const waveItemHeight = 28;  // 16 for text + 12 for progress bar
    const waveListHeight = displaySetWaves.length * waveItemHeight;
    const panelHeight = baseHeight + waveListHeight;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(w - 220, 10, 210, panelHeight);

    ctx.fillStyle = '#fff';
    ctx.fillText(`State: ${stateLabel} (${sls.wavesSpawned}/${sls.currentSetWaves})`, w - 210, 30);

    ctx.fillText(`Next wave: ${nextWaveIn}s`, w - 210, 50);
    // Next wave progress bar (countdown - starts full, empties as time passes)
    ctx.fillStyle = '#333';
    ctx.fillRect(w - 210, 55, 190, 8);
    ctx.fillStyle = '#4a90b8';
    ctx.fillRect(w - 210, 55, 190 * (1 - waveTimerProgress), 8);

    ctx.fillStyle = '#fff';
    ctx.fillText(`${stateLabel2}: ${stateTimeLeft}s`, w - 210, 80);
    // State duration progress bar (countdown - starts full, empties as time passes)
    ctx.fillStyle = '#333';
    ctx.fillRect(w - 210, 85, 190, 8);
    ctx.fillStyle = sls.setState === 'LULL' ? '#e8a644' : '#44e8a6';
    ctx.fillRect(w - 210, 85, 190 * (1 - stateTimerProgress), 8);

    ctx.fillStyle = '#fff';
    ctx.fillText(`Set waves: ${displaySetWaves.length}`, w - 210, 115);

    ctx.fillStyle = '#888';
    ctx.fillText(`Background: ${bgWaveCount}`, w - 210, 135);

    for (let i = 0; i < displaySetWaves.length; i++) {
        const { wave, progress } = displaySetWaves[i];
        // Time to shore = remaining progress * travel duration (convert to seconds)
        const timeToShore = ((1 - progress) * travelDuration / 1000).toFixed(1);
        const ampPercent = Math.round(wave.amplitude * 100);
        const yOffset = 150 + i * waveItemHeight;

        // Wave text
        ctx.fillStyle = '#aaa';
        ctx.fillText(`  • ${ampPercent}% amp, ${timeToShore}s`, w - 210, yOffset);

        // Wave progress bar (countdown - starts full at horizon, empties as wave approaches shore)
        ctx.fillStyle = '#333';
        ctx.fillRect(w - 195, yOffset + 4, 175, 6);
        ctx.fillStyle = '#6ab0d4';  // Lighter blue for wave progress
        ctx.fillRect(w - 195, yOffset + 4, 175 * (1 - progress), 6);
    }
}

// Game loop
const MAX_DELTA_TIME = 0.1;  // 100ms max - prevents huge jumps after tab restore
let lastTime = 0;

function gameLoop(timestamp) {
    let deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Clamp deltaTime to prevent huge jumps when returning from background
    if (deltaTime > MAX_DELTA_TIME) {
        deltaTime = MAX_DELTA_TIME;
    }

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Reset timing when tab becomes visible again
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        lastTime = performance.now();
    }
});

// Background waves spawn immediately and continuously
// Set waves only spawn during SET state (lulls are empty of set waves)

requestAnimationFrame(gameLoop);

console.log('Wave Sets and Lulls visualization');
console.log('Background waves always present, set waves only during SET state');
