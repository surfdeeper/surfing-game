// Depth map - returns water depth at any (x, z) position
// Depth is measured from water surface (Y=0) down to bottom

export class DepthMap {
    constructor() {
        // Basic beach slope
        this.beachSlope = 0.15;  // depth increases as we go toward horizon (-Z)

        // Reef/sandbar configuration (where wave will break)
        this.reefEnabled = true;
        this.reefStart = -8;     // Z position where reef begins
        this.reefEnd = -3;       // Z position where reef ends
        this.reefDepth = 2.5;    // Depth over the reef (shallow spot)
    }

    // Get water depth at position (x, z)
    // Returns depth in meters (0 = surface, positive = underwater)
    getDepth(x, z) {
        // Basic depth from beach slope
        // At z=0 (shore): depth = 0
        // As z goes negative (toward horizon): depth increases
        let depth = Math.max(0, -z * this.beachSlope + 1);

        // Add reef/sandbar - a shallow spot where wave will break
        if (this.reefEnabled && z > this.reefStart && z < this.reefEnd) {
            // Smooth transition to reef depth
            const reefCenter = (this.reefStart + this.reefEnd) / 2;
            const reefWidth = this.reefEnd - this.reefStart;
            const distFromCenter = Math.abs(z - reefCenter);
            const reefFactor = 1 - (distFromCenter / (reefWidth / 2));

            // Blend toward reef depth
            depth = Math.min(depth, this.reefDepth + (1 - reefFactor) * 2);
        }

        return depth;
    }

    // Check if position is over water (depth > 0)
    isOverWater(x, z) {
        return this.getDepth(x, z) > 0;
    }

    // Get the slope of the bottom at position
    // Returns dDepth/dZ (positive = getting deeper toward -Z)
    getSlope(x, z) {
        const delta = 0.1;
        const d1 = this.getDepth(x, z - delta);
        const d2 = this.getDepth(x, z + delta);
        return (d1 - d2) / (2 * delta);
    }
}
