// Surfer - controlled by player, constrained to wave surface
// Based on Plan 70: The Surfer

export class Surfer {
    constructor() {
        // Position in world
        this.x = 0;       // Along the wave (left/right)
        this.y = 0;       // Height (calculated from wave)
        this.z = -15;     // Toward shore (start in deeper water)

        // Velocity
        this.vx = 0;      // Along wave
        this.vz = 0;      // Toward/away from shore

        // Rotation (yaw)
        this.rotation = 0;

        // State
        this.isWipedOut = false;
        this.wipeoutTimer = 0;
        this.wipeoutReason = '';

        // Physics constants
        this.turnAccel = 15;      // Turning acceleration
        this.pumpAccel = 8;       // Moving up the face
        this.dropAccel = 10;      // Dropping down the face
        this.friction = 0.94;     // Velocity decay
        this.gravityFactor = 3.0; // Gravity assist on slopes
        this.maxSpeed = 15;

        // Wave interaction
        this.facePosition = 0.5;  // 0 = trough, 1 = crest
    }

    handleInput(keys) {
        if (this.isWipedOut) return;

        const dt = 0.016;  // Assume ~60fps for input

        // Left/right: move along the wave
        if (keys.left || keys.a) {
            this.vx -= this.turnAccel * dt;
        }
        if (keys.right || keys.d) {
            this.vx += this.turnAccel * dt;
        }

        // Up: paddle out (away from shore, toward horizon)
        if (keys.up || keys.w) {
            this.vz -= this.pumpAccel * dt;
        }

        // Down: drop in (toward shore)
        if (keys.down || keys.s) {
            this.vz += this.dropAccel * dt;
        }
    }

    update(deltaTime, ocean, time) {
        // Sanity check deltaTime
        if (deltaTime > 0.1) deltaTime = 0.016;
        if (deltaTime <= 0) return;

        // Handle wipeout recovery
        if (this.isWipedOut) {
            this.wipeoutTimer -= deltaTime;

            // Slow tumble
            this.vx *= 0.96;
            this.vz *= 0.96;

            // Drift toward shore
            this.vz += 0.5 * deltaTime;

            this.x += this.vx * deltaTime;
            this.z += this.vz * deltaTime;

            if (this.wipeoutTimer <= 0) {
                this.recover();
            }

            // Get wave height
            this.y = ocean.getWaveHeightAt(this.x, this.z);
            return;
        }

        // === Wave physics ===
        const depth = ocean.getDepthAt(this.x, this.z);
        const waveHeight = ocean.getWaveHeightAt(this.x, this.z);
        const localAmp = ocean.getLocalAmplitudeAt(this.x, this.z);
        const swell = ocean.getSwell();

        // Get wave slope for gravity effect
        const slope = swell.getSlope(this.x, this.z, time, depth);

        // Gravity down the face
        // Positive slope means wave is rising toward shore, so surfer slides toward shore
        this.vz += slope * this.gravityFactor * deltaTime;

        // Apply friction
        this.vx *= this.friction;
        this.vz *= this.friction;

        // Clamp velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
        if (speed > this.maxSpeed) {
            const scale = this.maxSpeed / speed;
            this.vx *= scale;
            this.vz *= scale;
        }

        // Update position
        this.x += this.vx * deltaTime;
        this.z += this.vz * deltaTime;

        // Calculate face position (where on the wave face)
        const k = (2 * Math.PI) / swell.wavelength;
        const omega = (2 * Math.PI) / swell.period;
        const phase = k * this.z - omega * time;
        const sinPhase = Math.sin(phase);
        this.facePosition = (sinPhase + 1) / 2;  // 0 to 1

        // Update Y to wave surface
        this.y = waveHeight + 0.3;  // Slightly above water

        // Update rotation based on velocity direction
        if (speed > 0.5) {
            this.rotation = Math.atan2(this.vz, this.vx);
        }

        // === Wipeout conditions ===
        this.checkWipeout(depth, localAmp, speed, time, swell);
    }

    checkWipeout(depth, localAmp, speed, time, swell) {
        const H = localAmp * 2;  // Wave height
        const breakingIndex = 0.78;
        const isInBreakingZone = H > breakingIndex * depth && depth < 5 && depth > 0.3;

        // 1. Too shallow - ran aground
        if (depth < 0.3) {
            this.triggerWipeout('Ran aground!');
            return;
        }

        // 2. Stalled in breaking zone
        if (speed < 1.5 && isInBreakingZone && this.facePosition > 0.4) {
            this.triggerWipeout('Stalled - not enough speed!');
            return;
        }

        // 3. Over the falls - at the lip when breaking
        if (this.facePosition > 0.88 && isInBreakingZone) {
            this.triggerWipeout('Over the falls!');
            return;
        }

        // 4. Pearl - going too fast down steep face at bottom
        if (this.facePosition < 0.15 && this.vz > 10 && isInBreakingZone) {
            this.triggerWipeout('Pearled!');
            return;
        }

        // 5. Too far behind the peel (caught inside)
        // Peel moves along X axis
        const peelSpeed = 4.0;
        const peelPosition = -20 + ((time * peelSpeed) % 60);

        if (isInBreakingZone && this.x < peelPosition - 10) {
            this.triggerWipeout('Caught inside!');
            return;
        }
    }

    triggerWipeout(reason) {
        if (this.isWipedOut) return;

        console.log('WIPEOUT:', reason);
        this.isWipedOut = true;
        this.wipeoutTimer = 2.5;
        this.wipeoutReason = reason;

        // Tumble effect
        this.vx = -2 - Math.random() * 3;
        this.vz = 3 + Math.random() * 2;
    }

    recover() {
        this.isWipedOut = false;
        this.wipeoutReason = '';

        // Reset to safe position in deeper water
        this.x = 0;
        this.z = -20;
        this.vx = 0;
        this.vz = 0;
        this.facePosition = 0.5;
    }

    getPosition() {
        const yOffset = this.isWipedOut ? -0.5 : 0;
        return [this.x, this.y + yOffset, this.z];
    }

    getRotation() {
        return this.rotation;
    }

    getState() {
        return {
            x: this.x,
            z: this.z,
            facePosition: this.facePosition,
            speed: Math.sqrt(this.vx * this.vx + this.vz * this.vz),
            isWipedOut: this.isWipedOut,
            wipeoutReason: this.wipeoutReason
        };
    }
}
