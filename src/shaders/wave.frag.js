export const waveFragmentShader = `
    precision highp float;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUV;
    varying float vFoam;
    varying float vWaveFace;
    varying float vDepth;

    uniform vec3 uCameraPos;
    uniform vec3 uLightDir;
    uniform float uTime;
    uniform int uDebugMode;

    // Noise functions for foam texture
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);

        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    vec3 renderNormal() {
        vec3 color = vNormal;

        // Debug mode 1: Show normals as RGB
        if (uDebugMode == 1) {
            return vNormal * 0.5 + 0.5;
        }
        // Debug mode 2: Show foam mask
        if (uDebugMode == 2) {
            return vec3(vFoam);
        }
        // Debug mode 3: Show wave face mask
        if (uDebugMode == 3) {
            return vec3(vWaveFace);
        }
        // Debug mode 4: Show depth/height
        if (uDebugMode == 4) {
            float h = vDepth / 8.0;
            return vec3(h, h * 0.5, 1.0 - h);
        }

        return vec3(0.0); // Shouldn't reach here
    }

    void main() {
        // Handle debug modes first
        if (uDebugMode > 0) {
            gl_FragColor = vec4(renderNormal(), 1.0);
            return;
        }

        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(uCameraPos - vWorldPos);
        vec3 lightDir = normalize(uLightDir);

        // Water colors - rich ocean palette
        vec3 deepColor = vec3(0.0, 0.08, 0.2);
        vec3 midColor = vec3(0.0, 0.2, 0.35);
        vec3 shallowColor = vec3(0.0, 0.45, 0.5);
        vec3 faceColor = vec3(0.1, 0.55, 0.55);
        vec3 foamColor = vec3(0.95, 0.98, 1.0);
        vec3 sprayColor = vec3(1.0, 1.0, 1.0);

        // Base water color based on depth/position
        float depthFactor = smoothstep(-20.0, 10.0, vWorldPos.z);
        vec3 waterColor = mix(deepColor, midColor, depthFactor);
        waterColor = mix(waterColor, shallowColor, smoothstep(0.0, 15.0, vWorldPos.z));

        // Wave face is brighter, more translucent green-blue
        waterColor = mix(waterColor, faceColor, vWaveFace * 0.8);

        // Fresnel effect - more reflection at glancing angles
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);

        // Diffuse lighting
        float diffuse = max(dot(normal, lightDir), 0.0);
        float wrap = max(dot(normal, lightDir) * 0.5 + 0.5, 0.0);

        // Specular highlights
        vec3 halfDir = normalize(lightDir + viewDir);
        float specular = pow(max(dot(normal, halfDir), 0.0), 128.0);
        float specular2 = pow(max(dot(normal, halfDir), 0.0), 32.0);

        // Build up the color
        vec3 color = waterColor * (0.3 + 0.5 * wrap);

        // Sky reflection
        vec3 skyColor = vec3(0.6, 0.75, 0.9);
        color = mix(color, skyColor, fresnel * 0.5);

        // Specular
        color += vec3(1.0) * specular * 0.7;
        color += vec3(0.8, 0.9, 1.0) * specular2 * 0.2;

        // Subsurface scattering on the wave face
        float sss = max(dot(viewDir, -lightDir), 0.0);
        sss = pow(sss, 3.0) * vWaveFace;
        color += vec3(0.0, 0.4, 0.35) * sss * 0.5;

        // Foam rendering with texture
        if (vFoam > 0.01) {
            vec2 foamUV = vWorldPos.xz * 0.5;
            float foamNoise = fbm(foamUV + uTime * 0.3);
            float foamNoise2 = fbm(foamUV * 2.0 - uTime * 0.2);

            float foamPattern = foamNoise * 0.6 + foamNoise2 * 0.4;
            foamPattern = smoothstep(0.3, 0.7, foamPattern);

            float foamIntensity = vFoam * (0.5 + foamPattern * 0.5);

            vec3 foamShaded = mix(vec3(0.7, 0.8, 0.85), foamColor, diffuse * 0.5 + 0.5);
            color = mix(color, foamShaded, foamIntensity);

            float bubbles = noise(foamUV * 8.0 + uTime);
            bubbles = smoothstep(0.6, 0.8, bubbles) * vFoam;
            color = mix(color, sprayColor, bubbles * 0.4);
        }

        // Spray at the lip
        if (vWaveFace > 0.5 && vDepth > 4.0) {
            float spray = noise(vWorldPos.xz * 3.0 + uTime * 2.0);
            spray = smoothstep(0.7, 0.9, spray) * (vDepth - 4.0) * 0.3;
            color = mix(color, sprayColor, spray);
        }

        // Caustic patterns
        float caustic = fbm(vWorldPos.xz * 0.3 + uTime * 0.1);
        caustic = smoothstep(0.4, 0.6, caustic);
        color += vec3(0.05, 0.1, 0.1) * caustic * (1.0 - vFoam) * smoothstep(5.0, 15.0, vWorldPos.z);

        color = pow(color, vec3(0.95));

        gl_FragColor = vec4(color, 1.0);
    }
`;
