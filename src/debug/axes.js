// 3D axes visualization at origin
// X = Red (along wave), Y = Green (up), Z = Blue (toward shore)

export class Axes {
    constructor(gl, length = 10) {
        this.gl = gl;
        this.length = length;
        this.vertices = [];
        this.colors = [];

        this.createAxesData();
        this.createBuffers();
    }

    createAxesData() {
        const len = this.length;

        // X axis (red) - along the wave
        this.vertices.push(0, 0, 0);
        this.vertices.push(len, 0, 0);
        this.colors.push(1, 0.2, 0.2);
        this.colors.push(1, 0.2, 0.2);

        // Negative X (dimmer red)
        this.vertices.push(0, 0, 0);
        this.vertices.push(-len, 0, 0);
        this.colors.push(0.4, 0.1, 0.1);
        this.colors.push(0.4, 0.1, 0.1);

        // Y axis (green) - up
        this.vertices.push(0, 0, 0);
        this.vertices.push(0, len, 0);
        this.colors.push(0.2, 1, 0.2);
        this.colors.push(0.2, 1, 0.2);

        // Negative Y (dimmer green)
        this.vertices.push(0, 0, 0);
        this.vertices.push(0, -len, 0);
        this.colors.push(0.1, 0.4, 0.1);
        this.colors.push(0.1, 0.4, 0.1);

        // Z axis (blue) - toward shore
        this.vertices.push(0, 0, 0);
        this.vertices.push(0, 0, len);
        this.colors.push(0.2, 0.2, 1);
        this.colors.push(0.2, 0.2, 1);

        // Negative Z (dimmer blue) - toward horizon
        this.vertices.push(0, 0, 0);
        this.vertices.push(0, 0, -len);
        this.colors.push(0.1, 0.1, 0.4);
        this.colors.push(0.1, 0.1, 0.4);

        // Arrow heads for positive axes
        this.addArrowHead(len, 0, 0, [1, 0, 0], [1, 0.2, 0.2]); // X
        this.addArrowHead(0, len, 0, [0, 1, 0], [0.2, 1, 0.2]); // Y
        this.addArrowHead(0, 0, len, [0, 0, 1], [0.2, 0.2, 1]); // Z
    }

    addArrowHead(x, y, z, dir, color) {
        const size = 0.5;
        // Simple arrow using lines (cone approximation)
        // For X arrow
        if (dir[0] !== 0) {
            this.vertices.push(x, y, z);
            this.vertices.push(x - size, y + size * 0.3, z);
            this.colors.push(...color, ...color);

            this.vertices.push(x, y, z);
            this.vertices.push(x - size, y - size * 0.3, z);
            this.colors.push(...color, ...color);

            this.vertices.push(x, y, z);
            this.vertices.push(x - size, y, z + size * 0.3);
            this.colors.push(...color, ...color);

            this.vertices.push(x, y, z);
            this.vertices.push(x - size, y, z - size * 0.3);
            this.colors.push(...color, ...color);
        }
        // For Y arrow
        if (dir[1] !== 0) {
            this.vertices.push(x, y, z);
            this.vertices.push(x + size * 0.3, y - size, z);
            this.colors.push(...color, ...color);

            this.vertices.push(x, y, z);
            this.vertices.push(x - size * 0.3, y - size, z);
            this.colors.push(...color, ...color);

            this.vertices.push(x, y, z);
            this.vertices.push(x, y - size, z + size * 0.3);
            this.colors.push(...color, ...color);

            this.vertices.push(x, y, z);
            this.vertices.push(x, y - size, z - size * 0.3);
            this.colors.push(...color, ...color);
        }
        // For Z arrow
        if (dir[2] !== 0) {
            this.vertices.push(x, y, z);
            this.vertices.push(x + size * 0.3, y, z - size);
            this.colors.push(...color, ...color);

            this.vertices.push(x, y, z);
            this.vertices.push(x - size * 0.3, y, z - size);
            this.colors.push(...color, ...color);

            this.vertices.push(x, y, z);
            this.vertices.push(x, y + size * 0.3, z - size);
            this.colors.push(...color, ...color);

            this.vertices.push(x, y, z);
            this.vertices.push(x, y - size * 0.3, z - size);
            this.colors.push(...color, ...color);
        }
    }

    createBuffers() {
        const gl = this.gl;

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);

        this.vertexCount = this.vertices.length / 3;
    }

    render(program) {
        const gl = this.gl;

        const posLoc = gl.getAttribLocation(program, 'aPosition');
        const colorLoc = gl.getAttribLocation(program, 'aColor');

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLoc);

        gl.drawArrays(gl.LINES, 0, this.vertexCount);
    }
}
