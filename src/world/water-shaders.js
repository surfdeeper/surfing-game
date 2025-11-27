// Water shaders for ocean rendering
// Plan 20: depth-based coloring, Fresnel reflection, basic lighting
// Plan 30: swell displacement
// Plan 40: shoaling - wave grows in shallow water
// Plan 50: wave breaking - wave breaks when H > 0.78 * depth

export const waterVertexShader = `
attribute vec3 aPosition;

uniform mat4 uProjection;
uniform mat4 uView;
uniform float uTime;

// Swell parameters
uniform float uSwellAmplitude;
uniform float uSwellWavelength;
uniform float uSwellPeriod;
uniform bool uSwellEnabled;

// Depth parameters for shoaling
uniform float uBeachSlope;
uniform float uReefStart;
uniform float uReefEnd;
uniform float uReefDepth;
uniform bool uReefEnabled;

// Breaking parameters
uniform float uBreakingIndex;  // Typically 0.78

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vDepth;
varying float vLocalAmplitude;
varying float vBreakingFactor;  // 0 = unbroken, 1 = breaking, 2 = broken

// Calculate depth at position
float getDepth(vec3 pos) {
    float depth = max(0.0, -pos.z * uBeachSlope + 1.0);

    if (uReefEnabled && pos.z > uReefStart && pos.z < uReefEnd) {
        float reefCenter = (uReefStart + uReefEnd) / 2.0;
        float reefWidth = uReefEnd - uReefStart;
        float distFromCenter = abs(pos.z - reefCenter);
        float reefFactor = 1.0 - (distFromCenter / (reefWidth / 2.0));
        depth = min(depth, uReefDepth + (1.0 - reefFactor) * 2.0);
    }

    return depth;
}

// Shoaling factor
float getShoalingFactor(float depth, float wavelength) {
    float deepThreshold = wavelength * 0.5;
    if (depth > deepThreshold) return 1.0;
    float shoalFactor = pow(wavelength / (4.0 * max(depth, 0.5)), 0.25);
    return min(shoalFactor, 3.0);
}

// Wave speed at depth
float getWaveSpeed(float depth, float wavelength) {
    float k = 6.28318 / wavelength;
    float deepSpeed = sqrt(9.8 * wavelength / 6.28318);
    float shallowSpeed = sqrt(9.8 * depth);
    float ratio = depth / (wavelength * 0.5);
    if (ratio > 1.0) return deepSpeed;
    if (ratio < 0.05) return shallowSpeed;
    return sqrt(9.8 / k * tanh(k * depth));
}

// Check breaking condition: wave height > 0.78 * depth
float getBreakingState(float waveHeight, float depth, float x, float peelPosition) {
    // Wave height is 2 * amplitude
    float H = waveHeight * 2.0;

    // Breaking criterion
    float breakingThreshold = uBreakingIndex * depth;

    if (H > breakingThreshold && depth > 0.1) {
        // The wave is breaking here
        // Calculate peel position (where breaking starts)
        // For simplicity, assume peel travels along X axis
        float distFromPeel = abs(x - peelPosition);

        if (distFromPeel < 5.0) {
            return 1.0;  // Actively breaking
        } else if (x > peelPosition) {
            return 2.0;  // Already broken (behind the peel)
        }
    }

    return 0.0;  // Not breaking
}

void main() {
    vec3 pos = aPosition;
    float depth = getDepth(pos);
    vDepth = depth;

    if (uSwellEnabled && depth > 0.1) {
        // Base wave parameters
        float k = 6.28318 / uSwellWavelength;
        float omega = 6.28318 / uSwellPeriod;

        // Apply shoaling
        float shoalFactor = getShoalingFactor(depth, uSwellWavelength);
        float localAmplitude = uSwellAmplitude * shoalFactor;
        vLocalAmplitude = localAmplitude;

        // Wave speed and local wavelength
        float speedRatio = getWaveSpeed(depth, uSwellWavelength) / getWaveSpeed(50.0, uSwellWavelength);
        float localK = k / speedRatio;

        // Base phase
        float phase = localK * pos.z - omega * uTime;
        float sinPhase = sin(phase);
        float cosPhase = cos(phase);

        // Check breaking condition
        float H = localAmplitude * 2.0;
        float breakingThreshold = uBreakingIndex * depth;

        // Peel position moves along X axis with time
        float peelSpeed = 4.0;  // m/s
        float peelPosition = -20.0 + mod(uTime * peelSpeed, 60.0);  // Peel travels from -20 to +40

        // Determine breaking state
        float breakState = 0.0;
        if (H > breakingThreshold && sinPhase > 0.3) {
            // Near the crest and exceeding breaking threshold
            float distFromPeel = pos.x - peelPosition;
            if (distFromPeel > -5.0 && distFromPeel < 5.0) {
                breakState = 1.0;  // Actively breaking
            } else if (distFromPeel < -5.0) {
                breakState = 2.0;  // Broken (foam)
            }
        }
        vBreakingFactor = breakState;

        // Calculate wave height with breaking effects
        float height;
        float slope;

        if (breakState < 0.5) {
            // Unbroken wave
            height = localAmplitude * sinPhase;
            slope = localAmplitude * localK * cosPhase;
        } else if (breakState < 1.5) {
            // Actively breaking - lip throwing forward
            // Exaggerate the crest, create pitching lip effect
            float lipProgress = fract(uTime * 0.5);  // Cycle through lip throw

            // Vertical displacement - crest rises higher
            float crownHeight = localAmplitude * 1.3;
            height = crownHeight * sinPhase;

            // Horizontal displacement for the lip (toward shore/+Z)
            if (sinPhase > 0.7) {
                // At the crest, push forward
                float lipThrow = (sinPhase - 0.7) / 0.3;  // 0 to 1 at lip
                pos.z += lipThrow * 1.5;  // Push toward shore
                height *= (1.0 + lipThrow * 0.3);  // Rise slightly more
            }

            // Steeper face
            slope = localAmplitude * localK * cosPhase * 1.5;
        } else {
            // Broken - collapsed whitewater
            // Lower height, chaotic surface
            float foamNoise = sin(pos.x * 2.0 + uTime * 3.0) * 0.3
                           + sin(pos.z * 3.0 + uTime * 2.0) * 0.2;
            height = localAmplitude * 0.3 * (sinPhase * 0.5 + 0.5) + foamNoise;
            slope = localAmplitude * localK * cosPhase * 0.3;
        }

        // Apply height displacement
        pos.y += height;

        // Calculate normal
        vNormal = normalize(vec3(0.0, 1.0, -slope));
    } else {
        vNormal = vec3(0.0, 1.0, 0.0);
        vLocalAmplitude = 0.0;
        vBreakingFactor = 0.0;
    }

    vWorldPos = pos;
    gl_Position = uProjection * uView * vec4(pos, 1.0);
}
`;

export const waterFragmentShader = `
precision mediump float;

uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform float uTime;

// Depth parameters
uniform float uBeachSlope;
uniform float uReefStart;
uniform float uReefEnd;
uniform float uReefDepth;
uniform bool uReefEnabled;

// Debug mode
uniform int uDebugMode;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vDepth;
varying float vLocalAmplitude;
varying float vBreakingFactor;

void main() {
    float depth = vDepth;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 normal = normalize(vNormal);

    // === Water Color based on depth ===
    vec3 shallowColor = vec3(0.1, 0.6, 0.6);
    vec3 deepColor = vec3(0.02, 0.08, 0.15);
    float depthFactor = smoothstep(0.0, 15.0, depth);
    vec3 waterColor = mix(shallowColor, deepColor, depthFactor);

    // === Fresnel reflection ===
    float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 4.0);
    fresnel = clamp(fresnel, 0.0, 0.8);

    vec3 skyColor = mix(
        vec3(0.6, 0.7, 0.9),
        vec3(0.3, 0.5, 0.9),
        max(0.0, viewDir.y)
    );

    vec3 color = mix(waterColor, skyColor, fresnel);

    // === Sun specular ===
    vec3 sunDir = normalize(uSunDir);
    vec3 halfVec = normalize(sunDir + viewDir);
    float specular = pow(max(0.0, dot(normal, halfVec)), 128.0);
    color += vec3(1.0, 0.95, 0.8) * specular * 0.5;

    // === Basic diffuse ===
    float diffuse = max(0.0, dot(normal, sunDir)) * 0.3;
    color += waterColor * diffuse;

    // === Breaking effects ===
    if (vBreakingFactor > 0.5 && vBreakingFactor < 1.5) {
        // Actively breaking - white foam at the lip
        float foamIntensity = vBreakingFactor;
        vec3 foamColor = vec3(0.95, 0.98, 1.0);

        // More foam at higher parts of the wave
        float heightFactor = smoothstep(0.0, 3.0, vWorldPos.y);
        color = mix(color, foamColor, heightFactor * 0.8);

        // Add spray effect - bright highlights
        float spray = pow(max(0.0, vWorldPos.y / 3.0), 2.0);
        color += vec3(1.0) * spray * 0.3;
    } else if (vBreakingFactor > 1.5) {
        // Broken whitewater
        vec3 foamColor = vec3(0.9, 0.95, 0.98);

        // Foam pattern
        float foamNoise = sin(vWorldPos.x * 5.0 + uTime * 2.0)
                       * sin(vWorldPos.z * 7.0 + uTime * 1.5) * 0.5 + 0.5;

        // More foam where it's higher (freshly broken)
        float foamIntensity = 0.6 + vWorldPos.y * 0.2;
        foamIntensity *= foamNoise;

        color = mix(color, foamColor, clamp(foamIntensity, 0.0, 0.85));
    }

    // === Wave face highlighting ===
    float steepness = 1.0 - abs(normal.y);
    if (steepness > 0.3 && vWorldPos.y > 0.0 && vBreakingFactor < 0.5) {
        vec3 faceColor = mix(shallowColor, vec3(0.2, 0.8, 0.8), 0.3);
        color = mix(color, faceColor, steepness * 0.5);
    }

    // === Debug modes ===
    if (uDebugMode == 1) {
        float d = depth / 20.0;
        color = vec3(d, d, d);
    } else if (uDebugMode == 2) {
        if (depth < 3.0) {
            color = vec3(1.0, 0.0, 0.0);
        } else if (depth < 6.0) {
            color = vec3(1.0, 1.0, 0.0);
        } else if (depth < 10.0) {
            color = vec3(0.0, 1.0, 0.0);
        } else {
            color = vec3(0.0, 0.0, 1.0);
        }
    } else if (uDebugMode == 3) {
        float ampFactor = vLocalAmplitude / 1.5;
        color = vec3(ampFactor * 0.5, 1.0 - ampFactor * 0.3, 0.5);
    } else if (uDebugMode == 4) {
        // Breaking state visualization
        if (vBreakingFactor < 0.5) {
            color = vec3(0.0, 0.5, 1.0);  // Blue = unbroken
        } else if (vBreakingFactor < 1.5) {
            color = vec3(1.0, 0.5, 0.0);  // Orange = breaking
        } else {
            color = vec3(1.0, 1.0, 1.0);  // White = broken
        }
    }

    gl_FragColor = vec4(color, 1.0);
}
`;
