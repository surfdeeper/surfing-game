export const surferFragmentShader = `
    precision highp float;

    varying vec3 vPosition;

    void main() {
        // Simple surfer colors
        // Body is darker, board is lighter
        vec3 bodyColor = vec3(0.2, 0.2, 0.25);
        vec3 boardColor = vec3(0.9, 0.9, 0.85);
        vec3 suitColor = vec3(0.1, 0.1, 0.12);

        vec3 color = bodyColor;

        // Board (bottom part)
        if (vPosition.y < 0.3) {
            color = boardColor;
        }
        // Wetsuit
        else if (vPosition.y < 1.2) {
            color = suitColor;
        }
        // Head/skin
        else {
            color = vec3(0.85, 0.7, 0.55);
        }

        gl_FragColor = vec4(color, 1.0);
    }
`;
