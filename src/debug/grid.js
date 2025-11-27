// Grid rendering for XZ plane at Y=0

export class Grid {
    constructor(gl, size = 100, divisions = 20) {
        this.gl = gl;
        this.size = size;
        this.divisions = divisions;
        this.vertices = [];
        this.colors = [];

        this.createGridData();
        this.createBuffers();
    }

    createGridData() {
        const half = this.size / 2;
        const step = this.size / this.divisions;

        // Grid lines along X (parallel to X axis)
        for (let i = 0; i <= this.divisions; i++) {
            const z = -half + i * step;
            const isMain = i === this.divisions / 2; // Center line
            const isTen = (i % (this.divisions / 10)) === 0; // Every 10 units

            // Line from -X to +X
            this.vertices.push(-half, 0, z);
            this.vertices.push(half, 0, z);

            // Color: brighter for main axes, dimmer for regular lines
            const color = isMain ? [0.2, 0.2, 0.8] : isTen ? [0.4, 0.4, 0.4] : [0.25, 0.25, 0.25];
            this.colors.push(...color, ...color);
        }

        // Grid lines along Z (parallel to Z axis)
        for (let i = 0; i <= this.divisions; i++) {
            const x = -half + i * step;
            const isMain = i === this.divisions / 2;
            const isTen = (i % (this.divisions / 10)) === 0;

            this.vertices.push(x, 0, -half);
            this.vertices.push(x, 0, half);

            const color = isMain ? [0.8, 0.2, 0.2] : isTen ? [0.4, 0.4, 0.4] : [0.25, 0.25, 0.25];
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
