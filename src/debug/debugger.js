// Main debugger controller - coordinates all debug visualization

import { debugVertexShader, debugFragmentShader } from './debug-shaders.js';
import { Grid } from './grid.js';
import { Axes } from './axes.js';
import { Probe } from './probe.js';
import { CameraControls } from './camera-controls.js';
import { createPerspectiveMatrix, createLookAtMatrix } from '../core/math.js';
import { Ocean } from '../world/ocean.js';
import { SurferRenderer } from './surfer-renderer.js';

export class Debugger {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        // State
        this.time = 0;
        this.paused = false;
        this.timeScale = 1.0;

        // Visibility toggles
        this.showGrid = true;
        this.showAxes = true;
        this.showWater = true;

        // Initialize components
        this.cameraControls = new CameraControls(canvas);
        this.initShaders();
        this.initObjects();
        this.resize();

        // Handle window resize
        window.addEventListener('resize', () => this.resize());
    }

    initShaders() {
        const gl = this.gl;

        // Compile vertex shader
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, debugVertexShader);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
        }

        // Compile fragment shader
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, debugFragmentShader);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
        }

        // Link program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
        }

        // Get uniform locations
        this.uProjection = gl.getUniformLocation(this.program, 'uProjection');
        this.uView = gl.getUniformLocation(this.program, 'uView');
    }

    initObjects() {
        const gl = this.gl;
        this.grid = new Grid(gl, 100, 20);
        this.axes = new Axes(gl, 10);
        this.probe = new Probe(gl);
        this.ocean = new Ocean(gl);
        this.surferRenderer = new SurferRenderer(gl);
    }

    resize() {
        const canvas = this.canvas;
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            this.gl.viewport(0, 0, displayWidth, displayHeight);
        }

        this.aspect = displayWidth / displayHeight;
    }

    update(deltaTime) {
        if (!this.paused) {
            this.time += deltaTime * this.timeScale;
            this.ocean.update(deltaTime * this.timeScale);
        }
    }

    render() {
        const gl = this.gl;

        // Clear with sky color
        gl.clearColor(0.4, 0.6, 0.9, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        // Set up matrices (shared by all renderers)
        const projection = createPerspectiveMatrix(
            Math.PI / 4,  // 45 degree FOV
            this.aspect,
            0.1,
            500
        );

        const cameraPos = this.cameraControls.getPosition();
        const view = createLookAtMatrix(
            cameraPos,
            this.cameraControls.getTarget(),
            [0, 1, 0]
        );

        // Store matrices for other renderers
        this.currentProjection = projection;
        this.currentView = view;
        this.currentCameraPos = cameraPos;

        // Render water first (so grid shows through if desired)
        if (this.showWater) {
            this.ocean.render(projection, view, cameraPos);
        }

        // Use debug shader for debug objects
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(this.uProjection, false, projection);
        gl.uniformMatrix4fv(this.uView, false, view);

        // Render debug objects
        if (this.showGrid) {
            this.grid.render(this.program);
        }

        if (this.showAxes) {
            this.axes.render(this.program);
        }

        this.probe.render(this.program);

        // Render surfer
        this.surferRenderer.render(this.program, projection, view);
    }

    // Surfer controls
    setSurferPosition(pos, rotation, wipedOut) {
        this.surferRenderer.setPosition(pos[0], pos[1], pos[2]);
        this.surferRenderer.setRotation(rotation);
        this.surferRenderer.setWipedOut(wipedOut);
    }

    // Probe controls
    setProbePosition(x, y, z) {
        this.probe.setPosition(x, y, z);
    }

    getProbePosition() {
        return this.probe.getPosition();
    }

    // Camera preset shortcuts
    setTopView() { this.cameraControls.setTopView(); }
    setSideView() { this.cameraControls.setSideView(); }
    setBeachView() { this.cameraControls.setBeachView(); }
    setSurferPOV() { this.cameraControls.setSurferPOV(); }
    resetView() { this.cameraControls.resetView(); }

    // Time controls
    pause() { this.paused = true; }
    play() { this.paused = false; }
    togglePause() { this.paused = !this.paused; }
    setTimeScale(scale) { this.timeScale = scale; }

    // Getters for UI
    getTime() { return this.time; }
    getCameraPosition() { return this.cameraControls.getPosition(); }
    getCameraTarget() { return this.cameraControls.getTarget(); }

    // Water controls
    getDepthAt(x, z) {
        return this.ocean.getDepthAt(x, z);
    }

    getWaveHeightAt(x, z) {
        return this.ocean.getWaveHeightAt(x, z);
    }

    getLocalAmplitudeAt(x, z) {
        return this.ocean.getLocalAmplitudeAt(x, z);
    }

    setWaterDebugMode(mode) {
        this.ocean.setDebugMode(mode);
    }

    // Swell controls
    setSwellEnabled(enabled) {
        this.ocean.setSwellEnabled(enabled);
    }

    setSwellAmplitude(a) {
        this.ocean.setSwellAmplitude(a);
    }

    setSwellWavelength(l) {
        this.ocean.setSwellWavelength(l);
    }

    setSwellPeriod(p) {
        this.ocean.setSwellPeriod(p);
    }

    getSwell() {
        return this.ocean.getSwell();
    }

    getOcean() {
        return this.ocean;
    }
}
