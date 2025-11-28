// AI Player Model
// Active surfing AI - seeks foam at the peak triangle and rides along the diagonal

import { sampleFoamIntensity } from './playerProxyModel.js';
import { getPeakX } from './bathymetryModel.js';

// AI States
export const AI_STATE = {
    SEEKING: 'SEEKING',   // Looking for foam to catch
    RIDING: 'RIDING',     // Riding a wave
};

// AI Modes
export const AI_MODE = {
    BEGINNER: 'BEGINNER',
    INTERMEDIATE: 'INTERMEDIATE',
    EXPERT: 'EXPERT',
};

// Mode-specific configs
const MODE_CONFIG = {
    [AI_MODE.BEGINNER]: {
        // Waits further from shore, catches already-broken waves
        minProgress: 0.40,
        maxProgress: 0.70,
        foamThreshold: 0.15,
        wipeoutChance: 0.3,
    },
    [AI_MODE.INTERMEDIATE]: {
        minProgress: 0.50,
        maxProgress: 0.80,
        foamThreshold: 0.20,
        wipeoutChance: 0.1,
    },
    [AI_MODE.EXPERT]: {
        // Expert surfs the peak triangle (0.55-0.90 progress)
        // This is where the long diagonal foam peel happens
        minProgress: 0.55,
        maxProgress: 0.90,
        foamThreshold: 0.12,     // Catch waves early
        wipeoutChance: 0.01,     // Rarely wipes out
    },
};

/**
 * Create initial AI state
 */
export function createAIState(mode = AI_MODE.INTERMEDIATE) {
    return {
        state: AI_STATE.SEEKING,
        mode,
        config: MODE_CONFIG[mode],
        rideDirection: 1,
        rideTimer: 0,
        rideStartPos: null,    // {x, y} where ride started
        rideDistance: 0,       // Distance traveled this ride
        cooldownTimer: 0,      // Time since last ride ended - prevents immediate re-catch
        targetFoam: null,      // Current foam row we're targeting
        lastPos: null,         // Last position for distance calculation
        stats: {
            wavesCaught: 0,
            wipeouts: 0,
            totalRideTime: 0,
            longestRide: 0,
            totalDistance: 0,
            longestDistance: 0,
            bestScore: 0,
        },
        logTimer: 0,
    };
}

/**
 * Find the best foam to target in the peak triangle area
 * Returns {x, y} screen position or null if no good foam found
 */
function findBestFoam(world, canvasWidth, oceanTop, oceanBottom, cfg, peakX) {
    if (!world.foamRows || world.foamRows.length === 0) {
        return null;
    }

    const minY = oceanTop + (oceanBottom - oceanTop) * cfg.minProgress;
    const maxY = oceanTop + (oceanBottom - oceanTop) * cfg.maxProgress;

    let bestFoam = null;
    let bestScore = -1;

    for (const row of world.foamRows) {
        // Skip foam outside our target zone
        if (row.y < minY || row.y > maxY) continue;
        if (row.opacity < 0.3) continue; // Skip faded foam

        for (const seg of row.segments) {
            // Check if this segment is near the peak X
            const segCenterX = ((seg.startX + seg.endX) / 2) * canvasWidth;
            const distFromPeak = Math.abs(segCenterX - peakX);

            // Prefer foam near the peak and with good intensity
            const score = seg.intensity * row.opacity * (1 - distFromPeak / canvasWidth);

            if (score > bestScore) {
                bestScore = score;
                bestFoam = {
                    x: segCenterX,
                    y: row.y,
                    intensity: seg.intensity * row.opacity,
                };
            }
        }
    }

    return bestFoam;
}

/**
 * Main AI update - returns synthetic input {left, right, up, down}
 *
 * EXPERT behavior:
 * 1. SEEKING: Actively look for foam in the peak triangle area
 * 2. Paddle toward foam when found
 * 3. When in foam, start RIDING along the diagonal
 * 4. Ride smoothly until foam ends, then go back to SEEKING
 */
export function updateAIPlayer(
    player,
    aiState,
    world,
    dt,
    canvasWidth,
    _canvasHeight,
    oceanTop,
    oceanBottom,
    _travelDuration
) {
    const input = { left: false, right: false, up: false, down: false };
    const cfg = aiState.config;

    // Sample foam at player position
    const foamIntensity = sampleFoamIntensity(player.x, player.y, world.foamRows, canvasWidth);

    // Peak position for reference
    const peakX = getPeakX(world.bathymetry) * canvasWidth;

    // Find best foam to target
    const bestFoam = findBestFoam(world, canvasWidth, oceanTop, oceanBottom, cfg, peakX);

    // Default position when no foam: center of target zone at peak X
    const defaultY = oceanTop + (oceanBottom - oceanTop) * ((cfg.minProgress + cfg.maxProgress) / 2);

    // Logging
    aiState.logTimer += 1;
    if (aiState.logTimer >= 60) {
        aiState.logTimer = 0;
        const foamInfo = bestFoam ? `foam@(${Math.round(bestFoam.x)},${Math.round(bestFoam.y)})` : 'no foam';
        console.log(`[AI ${aiState.mode}] ${aiState.state} pos:(${Math.round(player.x)},${Math.round(player.y)}) ${foamInfo} intensity:${foamIntensity.toFixed(2)}`);
    }

    if (aiState.state === AI_STATE.SEEKING) {
        // Update cooldown timer
        if (aiState.cooldownTimer > 0) {
            aiState.cooldownTimer -= dt;
        }

        // Check if we're in foam AND cooldown has expired - start riding!
        if (foamIntensity > cfg.foamThreshold && aiState.cooldownTimer <= 0) {
            // Small chance of wipeout
            if (Math.random() < cfg.wipeoutChance) {
                aiState.stats.wipeouts++;
                console.log(`[AI ${aiState.mode}] WIPEOUT #${aiState.stats.wipeouts}`);
                aiState.cooldownTimer = 2.0; // Cooldown after wipeout
                return input;
            }

            // Caught a wave! Start riding
            aiState.state = AI_STATE.RIDING;
            // Ride away from peak (along the diagonal)
            aiState.rideDirection = player.x < peakX ? -1 : 1;
            aiState.rideTimer = 0;
            aiState.rideStartPos = { x: player.x, y: player.y };
            aiState.rideDistance = 0;
            aiState.lastPos = { x: player.x, y: player.y };
            aiState.stats.wavesCaught++;
            console.log(`[AI ${aiState.mode}] Caught wave #${aiState.stats.wavesCaught}!`);
            return input;
        }

        // Target: best foam if found, otherwise default position
        let targetX, targetY;
        if (bestFoam) {
            targetX = bestFoam.x;
            targetY = bestFoam.y;
        } else {
            // No foam - patrol the peak area
            targetX = peakX;
            targetY = defaultY;
        }

        // Move toward target
        const dx = targetX - player.x;
        const dy = targetY - player.y;

        // Horizontal movement (tighter threshold when chasing foam)
        const hThreshold = bestFoam ? 20 : 50;
        if (dx > hThreshold) {
            input.right = true;
        } else if (dx < -hThreshold) {
            input.left = true;
        }

        // Vertical movement
        const vThreshold = bestFoam ? 15 : 30;
        if (dy > vThreshold) {
            input.down = true;
        } else if (dy < -vThreshold) {
            input.up = true;
        }

    } else if (aiState.state === AI_STATE.RIDING) {
        aiState.rideTimer += dt;

        // Track distance traveled
        if (aiState.lastPos) {
            const dx = player.x - aiState.lastPos.x;
            const dy = player.y - aiState.lastPos.y;
            aiState.rideDistance += Math.sqrt(dx * dx + dy * dy);
        }
        aiState.lastPos = { x: player.x, y: player.y };

        // Ride along the diagonal: sideways AND toward horizon (up)
        // The foam peels diagonally - to stay with it we need to ride up and sideways
        if (aiState.rideDirection > 0) {
            input.right = true;
        } else {
            input.left = true;
        }

        // Move UP (toward horizon) to ride along the peeling diagonal
        // This is the key - foam peels from shore toward horizon along the diagonal
        input.up = true;

        // Helper to finish ride and calculate score
        const finishRide = (reason) => {
            aiState.stats.totalRideTime += aiState.rideTimer;
            aiState.stats.totalDistance += aiState.rideDistance;

            if (aiState.rideTimer > aiState.stats.longestRide) {
                aiState.stats.longestRide = aiState.rideTimer;
            }
            if (aiState.rideDistance > aiState.stats.longestDistance) {
                aiState.stats.longestDistance = aiState.rideDistance;
            }

            // Score = distance (weighted more) + time bonus
            const score = Math.round(aiState.rideDistance + aiState.rideTimer * 50);
            if (score > aiState.stats.bestScore) {
                aiState.stats.bestScore = score;
            }

            console.log(`[AI ${aiState.mode}] ${reason}: ${aiState.rideTimer.toFixed(1)}s, ${Math.round(aiState.rideDistance)}px, score=${score}`);
            aiState.state = AI_STATE.SEEKING;
            aiState.cooldownTimer = 1.5;
        };

        // End ride when foam dissipates AND we've ridden a minimum time
        if (foamIntensity < 0.05 && aiState.rideTimer > 1.0) {
            finishRide('Ride complete');
        }

        // Hit edge of screen - end ride
        if (player.x < 50 || player.x > canvasWidth - 50) {
            finishRide('Hit edge');
        }

        // Reached horizon zone - great ride, end it
        if (player.y < oceanTop + 50) {
            finishRide('Reached horizon!');
        }
    }

    return input;
}

/**
 * Draw AI key indicator
 */
export function drawAIKeyIndicator(ctx, input, aiState, x, y) {
    const size = 24;
    const gap = 4;

    ctx.save();
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const keys = [
        { key: '↑', pressed: input.up, dx: 0, dy: -1 },
        { key: '←', pressed: input.left, dx: -1, dy: 0 },
        { key: '↓', pressed: input.down, dx: 0, dy: 0 },
        { key: '→', pressed: input.right, dx: 1, dy: 0 },
    ];

    for (const k of keys) {
        const kx = x + k.dx * (size + gap);
        const ky = y + k.dy * (size + gap);

        ctx.fillStyle = k.pressed
            ? 'rgba(100, 200, 100, 0.9)'
            : 'rgba(50, 50, 50, 0.6)';
        ctx.beginPath();
        ctx.roundRect(kx - size / 2, ky - size / 2, size, size, 4);
        ctx.fill();

        ctx.strokeStyle = k.pressed
            ? 'rgba(150, 255, 150, 1)'
            : 'rgba(100, 100, 100, 0.8)';
        ctx.lineWidth = k.pressed ? 2 : 1;
        ctx.stroke();

        ctx.fillStyle = k.pressed
            ? 'rgba(255, 255, 255, 1)'
            : 'rgba(200, 200, 200, 0.7)';
        ctx.fillText(k.key, kx, ky);
    }

    ctx.restore();
}
