// Simple surfer rendering as a colored box/marker

export class SurferRenderer {
    constructor(gl) {
        this.gl = gl;
        this.position = [0, 0, 0];
        this.rotation = 0;
        this.isWipedOut = false;

        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;

        // Simple box vertices (surfer representation)
        // About 1m long, 0.3m wide, 0.2m tall
        const length = 1.5;
        const width = 0.4;
        const height = 0.3;

        this.vertices = new Float32Array([
            // Bottom face
            -length/2, 0, -width/2,
            length/2, 0, -width/2,
            length/2, 0, width/2,
            -length/2, 0, width/2,
            // Top face
            -length/2, height, -width/2,
            length/2, height, -width/2,
            length/2, height, width/2,
            -length/2, height, width/2,
        ]);

        // Indices for triangles (box)
        this.indices = new Uint16Array([
            // Bottom
            0, 1, 2, 0, 2, 3,
            // Top
            4, 6, 5, 4, 7, 6,
            // Front
            0, 5, 1, 0, 4, 5,
            // Back
            2, 7, 3, 2, 6, 7,
            // Left
            0, 7, 4, 0, 3, 7,
            // Right
            1, 6, 2, 1, 5, 6,
        ]);

        // Colors (different for front/back to show direction)
        // Surfer is yellow, front is brighter
        this.colors = new Float32Array([
            // Bottom vertices (darker yellow)
            0.8, 0.7, 0.2,
            1.0, 0.9, 0.3,  // Nose (front) brighter
            0.8, 0.7, 0.2,
            0.8, 0.7, 0.2,
            // Top vertices
            0.9, 0.8, 0.3,
            1.0, 1.0, 0.4,  // Nose top
            0.9, 0.8, 0.3,
            0.9, 0.8, 0.3,
        ]);

        // Create buffers
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.STATIC_DRAW);

        this.indexCount = this.indices.length;
    }

    setPosition(x, y, z) {
        this.position = [x, y, z];
    }

    setRotation(r) {
        this.rotation = r;
    }

    setWipedOut(w) {
        this.isWipedOut = w;
    }

    render(program, projectionMatrix, viewMatrix) {
        const gl = this.gl;

        // We need to transform the vertices by position and rotation
        // For simplicity, create transformed vertices each frame
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        const transformed = new Float32Array(this.vertices.length);
        for (let i = 0; i < this.vertices.length; i += 3) {
            const x = this.vertices[i];
            const y = this.vertices[i + 1];
            const z = this.vertices[i + 2];

            // Apply rotation around Y axis, then translation
            transformed[i] = x * cos - z * sin + this.position[0];
            transformed[i + 1] = y + this.position[1] + (this.isWipedOut ? 0.5 : 0);
            transformed[i + 2] = x * sin + z * cos + this.position[2];
        }

        // Update vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, transformed, gl.DYNAMIC_DRAW);

        // Update colors if wiped out (make red)
        if (this.isWipedOut) {
            const wipedColors = new Float32Array(this.colors.length);
            for (let i = 0; i < wipedColors.length; i += 3) {
                wipedColors[i] = 1.0;     // R
                wipedColors[i + 1] = 0.3; // G
                wipedColors[i + 2] = 0.3; // B
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, wipedColors, gl.DYNAMIC_DRAW);
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.DYNAMIC_DRAW);
        }

        // Bind position attribute
        const posLoc = gl.getAttribLocation(program, 'aPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        // Bind color attribute
        const colorLoc = gl.getAttribLocation(program, 'aColor');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLoc);

        // Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }
}
