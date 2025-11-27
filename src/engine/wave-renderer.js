import { waveVertexShader } from '../shaders/wave.vert.js';
import { waveFragmentShader } from '../shaders/wave.frag.js';
import { surferVertexShader } from '../shaders/surfer.vert.js';
import { surferFragmentShader } from '../shaders/surfer.frag.js';

export class WaveRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl');

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        this.time = 0;
        this.init();
    }

    init() {
        const gl = this.gl;

        // Create shader program
        this.program = this.createProgram(waveVertexShader, waveFragmentShader);

        // Get attribute locations
        this.attribs = {
            position: gl.getAttribLocation(this.program, 'aPosition'),
            uv: gl.getAttribLocation(this.program, 'aUV'),
        };

        // Get uniform locations
        this.uniforms = {
            projection: gl.getUniformLocation(this.program, 'uProjection'),
            view: gl.getUniformLocation(this.program, 'uView'),
            model: gl.getUniformLocation(this.program, 'uModel'),
            time: gl.getUniformLocation(this.program, 'uTime'),
            cameraPos: gl.getUniformLocation(this.program, 'uCameraPos'),
            lightDir: gl.getUniformLocation(this.program, 'uLightDir'),
            // Wave params
            waveHeight: gl.getUniformLocation(this.program, 'uWaveHeight'),
            waveWidth: gl.getUniformLocation(this.program, 'uWaveWidth'),
            lipCurl: gl.getUniformLocation(this.program, 'uLipCurl'),
            peelSpeed: gl.getUniformLocation(this.program, 'uPeelSpeed'),
            debugMode: gl.getUniformLocation(this.program, 'uDebugMode'),
        };

        // Default params (will be overwritten by GUI)
        this.params = {
            cameraX: 0,
            cameraY: 8,
            cameraZ: 25,
            lookAtY: 0,
            waveHeight: 5.0,
            waveWidth: 4.0,
            lipCurl: 1.5,
            peelSpeed: 4.0,
            debugMode: 0,
        };

        // Create wave mesh - high resolution for smooth waves
        this.createWaveMesh(100, 100, 200, 200);

        // Create surfer program and mesh
        this.initSurfer();

        // Set up WebGL state
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.5, 0.7, 0.9, 1.0); // Sky color
    }

    initSurfer() {
        const gl = this.gl;

        // Surfer shader program
        this.surferProgram = this.createProgram(surferVertexShader, surferFragmentShader);

        this.surferAttribs = {
            position: gl.getAttribLocation(this.surferProgram, 'aPosition'),
        };

        this.surferUniforms = {
            projection: gl.getUniformLocation(this.surferProgram, 'uProjection'),
            view: gl.getUniformLocation(this.surferProgram, 'uView'),
            model: gl.getUniformLocation(this.surferProgram, 'uModel'),
        };

        // Simple surfer geometry - a box/capsule shape
        // Board + body approximation
        const positions = [];
        const indices = [];

        // Board (flat box)
        const boardLength = 2.0;
        const boardWidth = 0.5;
        const boardHeight = 0.1;
        this.addBox(positions, indices, 0, 0.15, 0, boardLength, boardHeight, boardWidth);

        // Body (upright box)
        this.addBox(positions, indices, 0, 0.9, 0, 0.4, 1.2, 0.3);

        // Head (small box)
        this.addBox(positions, indices, 0, 1.7, 0, 0.25, 0.3, 0.25);

        this.surferPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.surferPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        this.surferIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.surferIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        this.surferIndexCount = indices.length;

        // Surfer position (will be updated by game)
        this.surferPosition = [0, 0, 2];
        this.surferRotation = 0;
    }

    addBox(positions, indices, cx, cy, cz, sx, sy, sz) {
        const baseIndex = positions.length / 3;

        // 8 vertices of a box
        const hx = sx / 2, hy = sy / 2, hz = sz / 2;
        const verts = [
            [cx - hx, cy - hy, cz - hz],
            [cx + hx, cy - hy, cz - hz],
            [cx + hx, cy + hy, cz - hz],
            [cx - hx, cy + hy, cz - hz],
            [cx - hx, cy - hy, cz + hz],
            [cx + hx, cy - hy, cz + hz],
            [cx + hx, cy + hy, cz + hz],
            [cx - hx, cy + hy, cz + hz],
        ];

        for (const v of verts) {
            positions.push(...v);
        }

        // 12 triangles (6 faces × 2)
        const faces = [
            [0, 1, 2, 3], // front
            [5, 4, 7, 6], // back
            [4, 0, 3, 7], // left
            [1, 5, 6, 2], // right
            [3, 2, 6, 7], // top
            [4, 5, 1, 0], // bottom
        ];

        for (const f of faces) {
            indices.push(baseIndex + f[0], baseIndex + f[1], baseIndex + f[2]);
            indices.push(baseIndex + f[0], baseIndex + f[2], baseIndex + f[3]);
        }
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    createWaveMesh(width, depth, segmentsX, segmentsZ) {
        const gl = this.gl;
        const positions = [];
        const uvs = [];
        const indices = [];

        // Generate vertices
        for (let z = 0; z <= segmentsZ; z++) {
            for (let x = 0; x <= segmentsX; x++) {
                const px = (x / segmentsX - 0.5) * width;
                const pz = (z / segmentsZ - 0.5) * depth;

                positions.push(px, 0, pz);
                uvs.push(x / segmentsX, z / segmentsZ);
            }
        }

        // Generate indices for triangles
        for (let z = 0; z < segmentsZ; z++) {
            for (let x = 0; x < segmentsX; x++) {
                const i = z * (segmentsX + 1) + x;
                const i1 = i;
                const i2 = i + 1;
                const i3 = i + (segmentsX + 1);
                const i4 = i + (segmentsX + 1) + 1;

                // Two triangles per quad
                indices.push(i1, i3, i2);
                indices.push(i2, i3, i4);
            }
        }

        // Create buffers
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Use 32-bit indices for high-res mesh
        const ext = gl.getExtension('OES_element_index_uint');
        if (ext) {
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
            this.indexType = gl.UNSIGNED_INT;
        } else {
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
            this.indexType = gl.UNSIGNED_SHORT;
        }

        this.indexCount = indices.length;
    }

    resize() {
        const canvas = this.canvas;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        this.gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Simple matrix math utilities
    perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) / (near - far), -1,
            0, 0, (2 * far * near) / (near - far), 0
        ]);
    }

    lookAt(eye, target, up) {
        const zAxis = this.normalize(this.subtract(eye, target));
        const xAxis = this.normalize(this.cross(up, zAxis));
        const yAxis = this.cross(zAxis, xAxis);

        return new Float32Array([
            xAxis[0], yAxis[0], zAxis[0], 0,
            xAxis[1], yAxis[1], zAxis[1], 0,
            xAxis[2], yAxis[2], zAxis[2], 0,
            -this.dot(xAxis, eye), -this.dot(yAxis, eye), -this.dot(zAxis, eye), 1
        ]);
    }

    identity() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    subtract(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    normalize(v) {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / len, v[1] / len, v[2] / len];
    }

    translate(x, y, z) {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        ]);
    }

    rotateY(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        ]);
    }

    multiplyMatrices(a, b) {
        const result = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] =
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }
        return result;
    }

    setSurferPosition(position, rotation) {
        this.surferPosition = position;
        this.surferRotation = rotation;
    }

    render(deltaTime) {
        const gl = this.gl;
        this.time += deltaTime;

        this.resize();

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.program);

        // Camera from params
        const p = this.params;
        const cameraPos = [p.cameraX, p.cameraY, p.cameraZ];
        const cameraTarget = [0, p.lookAtY, 0];
        const cameraUp = [0, 1, 0];

        const aspect = this.canvas.width / this.canvas.height;
        const projection = this.perspective(Math.PI / 4, aspect, 0.1, 200);
        const view = this.lookAt(cameraPos, cameraTarget, cameraUp);
        const model = this.identity();

        // Set uniforms
        gl.uniformMatrix4fv(this.uniforms.projection, false, projection);
        gl.uniformMatrix4fv(this.uniforms.view, false, view);
        gl.uniformMatrix4fv(this.uniforms.model, false, model);
        gl.uniform1f(this.uniforms.time, this.time);
        gl.uniform3fv(this.uniforms.cameraPos, cameraPos);
        gl.uniform3fv(this.uniforms.lightDir, this.normalize([0.5, 0.8, 0.3]));

        // Wave params
        gl.uniform1f(this.uniforms.waveHeight, p.waveHeight);
        gl.uniform1f(this.uniforms.waveWidth, p.waveWidth);
        gl.uniform1f(this.uniforms.lipCurl, p.lipCurl);
        gl.uniform1f(this.uniforms.peelSpeed, p.peelSpeed);
        gl.uniform1i(this.uniforms.debugMode, p.debugMode);

        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.attribs.position);
        gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, 0, 0);

        // Bind UV buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.enableVertexAttribArray(this.attribs.uv);
        gl.vertexAttribPointer(this.attribs.uv, 2, gl.FLOAT, false, 0, 0);

        // Draw wave
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexCount, this.indexType, 0);

        // Draw surfer
        this.renderSurfer(projection, view);
    }

    renderSurfer(projection, view) {
        const gl = this.gl;

        gl.useProgram(this.surferProgram);

        // Create model matrix for surfer (translate + rotate)
        const pos = this.surferPosition;
        const translateMatrix = this.translate(pos[0], pos[1], pos[2]);
        const rotateMatrix = this.rotateY(this.surferRotation);
        const model = this.multiplyMatrices(translateMatrix, rotateMatrix);

        // Set uniforms
        gl.uniformMatrix4fv(this.surferUniforms.projection, false, projection);
        gl.uniformMatrix4fv(this.surferUniforms.view, false, view);
        gl.uniformMatrix4fv(this.surferUniforms.model, false, model);

        // Bind surfer geometry
        gl.bindBuffer(gl.ARRAY_BUFFER, this.surferPositionBuffer);
        gl.enableVertexAttribArray(this.surferAttribs.position);
        gl.vertexAttribPointer(this.surferAttribs.position, 3, gl.FLOAT, false, 0, 0);

        // Draw surfer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.surferIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.surferIndexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Get wave height at a position (for surfer placement)
    // This approximates the shader calculation on CPU
    getWaveHeightAt(x, z) {
        const time = this.time;
        const p = this.params;

        // Incoming swells
        const swellSpeed = 3.0;
        const wavelength = 20.0;
        const phase1 = (z - time * swellSpeed) / wavelength * 2.0 * Math.PI;
        const shoalFactor = Math.max(0, Math.min(1, (z + 50) / 50)) * 0.5 + 0.5;
        let swellHeight = Math.sin(phase1) * 1.0 * shoalFactor;

        // Breaking wave
        const breakZ = 0.0;
        const distFromBreak = z - breakZ;
        const peelX = 35.0 - ((time * p.peelSpeed) % 70);
        const distFromPeel = x - peelX;
        const aheadOfPeel = Math.max(0, Math.min(1, (distFromPeel + 2) / 6));

        let breakingHeight = 0;
        if (distFromBreak > -p.waveWidth * 1.5 && distFromBreak < p.waveWidth * 2.0) {
            const profilePos = (distFromBreak + p.waveWidth) / (p.waveWidth * 2.0);
            const backSlope = Math.max(0, Math.min(1, profilePos / 0.35));
            const crest = Math.exp(-Math.pow((profilePos - 0.45) * 4.0, 2));
            const faceSteep = Math.max(0, Math.min(1, (0.7 - profilePos) / 0.25));
            const profile = backSlope * (crest + faceSteep * 0.3);
            const unbrokenHeight = p.waveHeight * profile;
            const brokenHeight = p.waveHeight * 0.25 * Math.max(0, Math.min(1, (0.8 - profilePos) / 0.6));
            breakingHeight = brokenHeight + (unbrokenHeight - brokenHeight) * aheadOfPeel;
        }

        return swellHeight * 0.8 + breakingHeight;
    }

    // Get detailed wave info at a position (for physics interaction)
    getWaveInfoAt(x, z) {
        const time = this.time;
        const p = this.params;

        // Breaking wave zone
        const breakZ = 0.0;
        const distFromBreak = z - breakZ;
        const peelX = 35.0 - ((time * p.peelSpeed) % 70);
        const distFromPeel = x - peelX;

        // Ahead/behind peel
        const aheadOfPeel = Math.max(0, Math.min(1, (distFromPeel + 2) / 6));
        const behindPeel = 1 - aheadOfPeel;

        // Profile position
        const profilePos = (distFromBreak + p.waveWidth) / (p.waveWidth * 2.0);

        // Determine wave zones
        let inFoam = 0;
        let onFace = 0;
        let slope = 0;
        let overTheBack = false;
        let inImpactZone = false;

        if (distFromBreak > -p.waveWidth * 1.5 && distFromBreak < p.waveWidth * 2.0) {
            // On/near the wave

            // Foam zone - behind the peel
            if (behindPeel > 0.3 && profilePos > 0.2 && profilePos < 0.9) {
                inFoam = behindPeel * 0.8;
            }

            // Whitewater zone - past the breaking section toward shore
            if (distFromBreak > p.waveWidth * 0.5 && behindPeel > 0.5) {
                inFoam = Math.max(inFoam, behindPeel);
            }

            // Face zone - ahead of peel, on the face
            if (aheadOfPeel > 0.3 && profilePos > 0.35 && profilePos < 0.7) {
                onFace = aheadOfPeel * (1 - Math.abs(profilePos - 0.5) * 3);
                slope = Math.max(0, 0.7 - profilePos) * 2;  // Steeper higher up
            }

            // Impact zone - right at the peel
            if (Math.abs(distFromPeel) < 3 && profilePos > 0.4 && profilePos < 0.65) {
                inImpactZone = true;
            }

            // Over the back
            if (profilePos < 0.2) {
                overTheBack = true;
            }
        }
        // Well past the wave toward shore
        else if (distFromBreak > p.waveWidth * 2.0) {
            inFoam = behindPeel * 0.4;
        }
        // Behind the wave (out to sea)
        else if (distFromBreak < -p.waveWidth * 1.5) {
            overTheBack = true;
        }

        return {
            inFoam,
            onFace,
            slope,
            overTheBack,
            inImpactZone,
            distFromPeel,
            profilePos,
            peelX,
            peelSpeed: p.peelSpeed,
            // Forces the wave exerts
            waveForceX: -p.peelSpeed * 0.3,
            waveForceZ: inFoam * 4,
        };
    }
}
