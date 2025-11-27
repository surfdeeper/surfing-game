// Simple debug shaders for grid, axes, and probe rendering

export const debugVertexShader = `
attribute vec3 aPosition;
attribute vec3 aColor;

uniform mat4 uProjection;
uniform mat4 uView;

varying vec3 vColor;

void main() {
    vColor = aColor;
    gl_Position = uProjection * uView * vec4(aPosition, 1.0);
    gl_PointSize = 8.0;
}
`;

export const debugFragmentShader = `
precision mediump float;

varying vec3 vColor;

void main() {
    gl_FragColor = vec4(vColor, 1.0);
}
`;
