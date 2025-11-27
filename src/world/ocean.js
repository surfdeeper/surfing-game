// Ocean surface geometry and rendering
// Plan 20: Still water with depth-based coloring and Fresnel reflection
// Plan 30: Single traveling swell

import { waterVertexShader, waterFragmentShader } from './water-shaders.js';
import { DepthMap } from './depth-map.js';
import { Swell } from './swell.js';

export class Ocean {
    constructor(gl) {
        this.gl = gl;
        this.depthMap = new DepthMap();
        this.swell = new Swell();
        this.time = 0;

        // Debug mode: 0=normal, 1=depth grayscale, 2=depth colored
        this.debugMode = 0;

        // Swell enabled by default
        this.swellEnabled = true;

        this.initShaders();
        this.initGeometry();
    }

    initShaders() {
        const gl = this.gl;

        // Compile vertex shader
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, waterVertexShader);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('Water vertex shader error:', gl.getShaderInfoLog(vs));
        }

        // Compile fragment shader
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, waterFragmentShader);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('Water fragment shader error:', gl.getShaderInfoLog(fs));
        }

        // Link program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Water program link error:', gl.getProgramInfoLog(this.program));
        }

        // Get uniform locations
        this.uniforms = {
            projection: gl.getUniformLocation(this.program, 'uProjection'),
            view: gl.getUniformLocation(this.program, 'uView'),
            cameraPos: gl.getUniformLocation(this.program, 'uCameraPos'),
            sunDir: gl.getUniformLocation(this.program, 'uSunDir'),
            time: gl.getUniformLocation(this.program, 'uTime'),
            // Depth
            beachSlope: gl.getUniformLocation(this.program, 'uBeachSlope'),
            reefStart: gl.getUniformLocation(this.program, 'uReefStart'),
            reefEnd: gl.getUniformLocation(this.program, 'uReefEnd'),
            reefDepth: gl.getUniformLocation(this.program, 'uReefDepth'),
            reefEnabled: gl.getUniformLocation(this.program, 'uReefEnabled'),
            debugMode: gl.getUniformLocation(this.program, 'uDebugMode'),
            // Swell
            swellAmplitude: gl.getUniformLocation(this.program, 'uSwellAmplitude'),
            swellWavelength: gl.getUniformLocation(this.program, 'uSwellWavelength'),
            swellPeriod: gl.getUniformLocation(this.program, 'uSwellPeriod'),
            swellEnabled: gl.getUniformLocation(this.program, 'uSwellEnabled'),
            // Breaking
            breakingIndex: gl.getUniformLocation(this.program, 'uBreakingIndex'),
        };

        // Breaking parameters
        this.breakingIndex = 0.78;  // Wave breaks when H > 0.78 * depth
    }

    initGeometry() {
        const gl = this.gl;

        // Create a subdivided plane for the water surface
        const xMin = -100, xMax = 100;
        const zMin = -100, zMax = 10;
        const divisions = 200;  // Higher resolution for smooth waves

        const vertices = [];
        const indices = [];

        const xStep = (xMax - xMin) / divisions;
        const zStep = (zMax - zMin) / divisions;

        // Generate vertices
        for (let iz = 0; iz <= divisions; iz++) {
            for (let ix = 0; ix <= divisions; ix++) {
                const x = xMin + ix * xStep;
                const z = zMin + iz * zStep;
                const y = 0;  // Y displacement happens in shader
                vertices.push(x, y, z);
            }
        }

        // Generate indices for triangles
        for (let iz = 0; iz < divisions; iz++) {
            for (let ix = 0; ix < divisions; ix++) {
                const topLeft = iz * (divisions + 1) + ix;
                const topRight = topLeft + 1;
                const bottomLeft = (iz + 1) * (divisions + 1) + ix;
                const bottomRight = bottomLeft + 1;

                indices.push(topLeft, bottomLeft, topRight);
                indices.push(topRight, bottomLeft, bottomRight);
            }
        }

        // Create buffers
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

        this.indexCount = indices.length;

        // Enable 32-bit indices
        gl.getExtension('OES_element_index_uint');
    }

    update(deltaTime) {
        this.time += deltaTime;
    }

    render(projectionMatrix, viewMatrix, cameraPos) {
        const gl = this.gl;

        gl.useProgram(this.program);

        // Set uniforms
        gl.uniformMatrix4fv(this.uniforms.projection, false, projectionMatrix);
        gl.uniformMatrix4fv(this.uniforms.view, false, viewMatrix);
        gl.uniform3fv(this.uniforms.cameraPos, cameraPos);

        // Sun direction
        gl.uniform3fv(this.uniforms.sunDir, [0.3, 0.8, 0.5]);

        gl.uniform1f(this.uniforms.time, this.time);

        // Depth map parameters
        gl.uniform1f(this.uniforms.beachSlope, this.depthMap.beachSlope);
        gl.uniform1f(this.uniforms.reefStart, this.depthMap.reefStart);
        gl.uniform1f(this.uniforms.reefEnd, this.depthMap.reefEnd);
        gl.uniform1f(this.uniforms.reefDepth, this.depthMap.reefDepth);
        gl.uniform1i(this.uniforms.reefEnabled, this.depthMap.reefEnabled ? 1 : 0);
        gl.uniform1i(this.uniforms.debugMode, this.debugMode);

        // Swell parameters
        gl.uniform1f(this.uniforms.swellAmplitude, this.swell.amplitude);
        gl.uniform1f(this.uniforms.swellWavelength, this.swell.wavelength);
        gl.uniform1f(this.uniforms.swellPeriod, this.swell.period);
        gl.uniform1i(this.uniforms.swellEnabled, this.swellEnabled ? 1 : 0);

        // Breaking parameters
        gl.uniform1f(this.uniforms.breakingIndex, this.breakingIndex);

        // Bind vertex buffer
        const posLoc = gl.getAttribLocation(this.program, 'aPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    }

    // Get depth at a point
    getDepthAt(x, z) {
        return this.depthMap.getDepth(x, z);
    }

    // Get wave height at a point (for probe display)
    getWaveHeightAt(x, z) {
        if (!this.swellEnabled) return 0;
        const depth = this.depthMap.getDepth(x, z);
        return this.swell.getHeight(x, z, this.time, depth);
    }

    // Get local wave amplitude at depth (shoaled)
    getLocalAmplitudeAt(x, z) {
        if (!this.swellEnabled) return 0;
        const depth = this.depthMap.getDepth(x, z);
        return this.swell.getLocalAmplitude(depth);
    }

    // Set debug visualization mode
    setDebugMode(mode) {
        this.debugMode = mode;
    }

    // Swell controls
    setSwellEnabled(enabled) {
        this.swellEnabled = enabled;
    }

    setSwellAmplitude(a) {
        this.swell.setAmplitude(a);
    }

    setSwellWavelength(l) {
        this.swell.setWavelength(l);
    }

    setSwellPeriod(p) {
        this.swell.setPeriod(p);
    }

    getSwell() {
        return this.swell;
    }
}
