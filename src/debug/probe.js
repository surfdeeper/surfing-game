// Moveable probe point for inspecting values at any position

export class Probe {
    constructor(gl) {
        this.gl = gl;
        this.position = [0, 0, 0];
        this.vertices = [];
        this.colors = [];

        this.createProbeData();
        this.createBuffers();
    }

    setPosition(x, y, z) {
        this.position = [x, y, z];
        this.updateBuffers();
    }

    createProbeData() {
        // Create a small cross at the probe position
        const size = 0.5;
        const [x, y, z] = this.position;

        this.vertices = [
            // Horizontal line (X)
            x - size, y, z,
            x + size, y, z,
            // Vertical line (Y)
            x, y - size, z,
            x, y + size, z,
            // Depth line (Z)
            x, y, z - size,
            x, y, z + size,
        ];

        // Yellow/orange color for visibility
        this.colors = [
            1, 0.8, 0,
            1, 0.8, 0,
            1, 0.8, 0,
            1, 0.8, 0,
            1, 0.8, 0,
            1, 0.8, 0,
        ];
    }

    updateBuffers() {
        this.createProbeData();
        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.DYNAMIC_DRAW);
    }

    createBuffers() {
        const gl = this.gl;

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);

        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.DYNAMIC_DRAW);

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

        gl.lineWidth(3.0); // May not work on all platforms
        gl.drawArrays(gl.LINES, 0, this.vertexCount);
    }

    getPosition() {
        return [...this.position];
    }
}
