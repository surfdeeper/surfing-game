// Orbit camera controls - click drag to orbit, scroll to zoom

export class CameraControls {
    constructor(canvas) {
        this.canvas = canvas;

        // Spherical coordinates for orbiting
        this.theta = 0;           // Horizontal angle (radians)
        this.phi = Math.PI / 4;   // Vertical angle (radians)
        this.radius = 40;         // Distance from target

        // Target point (what we're looking at)
        this.target = [0, 0, 0];

        // Computed camera position
        this.position = [0, 0, 0];

        // Input state
        this.isDragging = false;
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.setupEventListeners();
        this.updatePosition();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    onMouseDown(e) {
        if (e.button === 0) { // Left click - orbit
            this.isDragging = true;
        } else if (e.button === 2) { // Right click - pan
            this.isPanning = true;
        }
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    onMouseMove(e) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        if (this.isDragging) {
            // Orbit
            this.theta -= dx * 0.01;
            this.phi -= dy * 0.01;

            // Clamp phi to avoid flipping
            this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));

            this.updatePosition();
        } else if (this.isPanning) {
            // Pan
            const panSpeed = this.radius * 0.002;
            const forward = this.getForward();
            const right = this.getRight();
            const up = [0, 1, 0];

            // Move target perpendicular to view direction
            this.target[0] -= right[0] * dx * panSpeed;
            this.target[2] -= right[2] * dx * panSpeed;
            this.target[1] += dy * panSpeed;

            this.updatePosition();
        }
    }

    onMouseUp() {
        this.isDragging = false;
        this.isPanning = false;
    }

    onWheel(e) {
        e.preventDefault();
        const zoomSpeed = 0.1;
        this.radius *= 1 + e.deltaY * zoomSpeed * 0.01;
        this.radius = Math.max(5, Math.min(200, this.radius));
        this.updatePosition();
    }

    updatePosition() {
        // Convert spherical to cartesian
        const sinPhi = Math.sin(this.phi);
        const cosPhi = Math.cos(this.phi);
        const sinTheta = Math.sin(this.theta);
        const cosTheta = Math.cos(this.theta);

        this.position[0] = this.target[0] + this.radius * sinPhi * sinTheta;
        this.position[1] = this.target[1] + this.radius * cosPhi;
        this.position[2] = this.target[2] + this.radius * sinPhi * cosTheta;
    }

    getForward() {
        const dx = this.target[0] - this.position[0];
        const dy = this.target[1] - this.position[1];
        const dz = this.target[2] - this.position[2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return [dx / len, dy / len, dz / len];
    }

    getRight() {
        const forward = this.getForward();
        const up = [0, 1, 0];
        // Cross product: up x forward
        return [
            up[1] * forward[2] - up[2] * forward[1],
            up[2] * forward[0] - up[0] * forward[2],
            up[0] * forward[1] - up[1] * forward[0]
        ];
    }

    getPosition() {
        return [...this.position];
    }

    getTarget() {
        return [...this.target];
    }

    // Preset views
    setTopView() {
        this.theta = 0;
        this.phi = 0.1; // Almost straight down
        this.radius = 60;
        this.target = [0, 0, 0];
        this.updatePosition();
    }

    setSideView() {
        this.theta = Math.PI / 2;
        this.phi = Math.PI / 2;
        this.radius = 50;
        this.target = [0, 0, 0];
        this.updatePosition();
    }

    setBeachView() {
        // Looking from shore toward the wave
        this.theta = Math.PI;
        this.phi = Math.PI / 3;
        this.radius = 40;
        this.target = [0, 0, -20];
        this.updatePosition();
    }

    setSurferPOV() {
        // Low angle from water level
        this.theta = Math.PI * 0.8;
        this.phi = Math.PI / 2.5;
        this.radius = 15;
        this.target = [0, 2, -10];
        this.updatePosition();
    }

    resetView() {
        this.theta = 0;
        this.phi = Math.PI / 4;
        this.radius = 40;
        this.target = [0, 0, 0];
        this.updatePosition();
    }
}
