// Swell parameters - a single traveling wave
// Based on Plan 30: Single Traveling Swell
// Plan 40: Shoaling - wave grows in shallow water

export class Swell {
    constructor() {
        // Swell parameters
        this.amplitude = 1.5;       // meters (wave height = 2 * amplitude)
        this.wavelength = 50.0;     // meters between crests
        this.period = 6.0;          // seconds between crests
        this.direction = [0, 1];    // traveling toward +Z (shore)

        // Derived values
        this.updateDerivedValues();
    }

    updateDerivedValues() {
        // Wave number k = 2*pi / wavelength
        this.k = (2 * Math.PI) / this.wavelength;

        // Angular frequency omega = 2*pi / period
        this.omega = (2 * Math.PI) / this.period;

        // Wave speed (celerity) in deep water
        this.speed = this.wavelength / this.period;

        // Theoretical deep water speed: c = sqrt(g * L / 2*pi)
        this.theoreticalSpeed = Math.sqrt(9.8 * this.wavelength / (2 * Math.PI));
    }

    // Shoaling factor - how much the wave grows at given depth
    getShoalingFactor(depth) {
        const deepThreshold = this.wavelength * 0.5;

        if (depth > deepThreshold) {
            return 1.0;  // No shoaling in deep water
        }

        // Green's Law approximation
        const shoalFactor = Math.pow(this.wavelength / (4 * Math.max(depth, 0.5)), 0.25);
        return Math.min(shoalFactor, 3.0);  // Cap at 3x
    }

    // Wave speed at given depth
    getWaveSpeed(depth) {
        const k = this.k;

        // Deep water speed
        const deepSpeed = Math.sqrt(9.8 * this.wavelength / (2 * Math.PI));

        // Shallow water speed
        const shallowSpeed = Math.sqrt(9.8 * depth);

        // Transition
        const ratio = depth / (this.wavelength * 0.5);
        if (ratio > 1.0) return deepSpeed;
        if (ratio < 0.05) return shallowSpeed;

        // Intermediate: tanh formula
        return Math.sqrt(9.8 / k * Math.tanh(k * depth));
    }

    // Get wave height at position (x, z) and time t, considering shoaling
    getHeight(x, z, time, depth = null) {
        // If depth not provided, assume deep water
        if (depth === null) {
            depth = 50;  // Deep water default
        }

        // Calculate shoaling
        const shoalFactor = this.getShoalingFactor(depth);
        const localAmplitude = this.amplitude * shoalFactor;

        // Adjust wavelength for depth
        const deepSpeed = this.getWaveSpeed(50);
        const localSpeed = this.getWaveSpeed(depth);
        const speedRatio = localSpeed / deepSpeed;
        const localK = this.k / speedRatio;

        // Basic traveling wave: A * sin(k*z - omega*t)
        const phase = localK * z - this.omega * time;
        return localAmplitude * Math.sin(phase);
    }

    // Get wave slope (derivative) at position
    getSlope(x, z, time, depth = null) {
        if (depth === null) {
            depth = 50;
        }

        const shoalFactor = this.getShoalingFactor(depth);
        const localAmplitude = this.amplitude * shoalFactor;

        const deepSpeed = this.getWaveSpeed(50);
        const localSpeed = this.getWaveSpeed(depth);
        const speedRatio = localSpeed / deepSpeed;
        const localK = this.k / speedRatio;

        const phase = localK * z - this.omega * time;
        return localAmplitude * localK * Math.cos(phase);
    }

    // Get normal vector at position
    getNormal(x, z, time, depth = null) {
        const slope = this.getSlope(x, z, time, depth);
        const len = Math.sqrt(1 + slope * slope);
        return [0, 1 / len, -slope / len];
    }

    // Get local amplitude at depth (for display)
    getLocalAmplitude(depth) {
        return this.amplitude * this.getShoalingFactor(depth);
    }

    // Set parameters
    setAmplitude(a) {
        this.amplitude = a;
    }

    setWavelength(l) {
        this.wavelength = l;
        this.updateDerivedValues();
    }

    setPeriod(p) {
        this.period = p;
        this.updateDerivedValues();
    }
}
