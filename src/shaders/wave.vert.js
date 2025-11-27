export const waveVertexShader = `
    precision highp float;

    attribute vec3 aPosition;
    attribute vec2 aUV;

    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;
    uniform float uTime;

    uniform float uWaveHeight;
    uniform float uWaveWidth;
    uniform float uLipCurl;
    uniform float uPeelSpeed;

    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec2 vUV;
    varying float vFoam;
    varying float vWaveFace;
    varying float vDepth;

    #define PI 3.14159265359

    /*
     * NEW APPROACH:
     * 1. Swell lines roll in from horizon (visible, moving toward camera)
     * 2. One swell stands up at the break zone
     * 3. The PEEL POINT is where breaking is currently happening
     * 4. Only AT the peel point does the lip throw
     * 5. Behind the peel = broken/foam, ahead = clean face
     */

    // Incoming swells - multiple rolling lines approaching shore
    float incomingSwells(vec2 pos, float time) {
        float height = 0.0;

        // Main swell direction: toward shore (+Z)
        float swellSpeed = 3.0;
        float wavelength = 20.0;

        // Several swell lines
        float phase1 = (pos.y - time * swellSpeed) / wavelength * 2.0 * PI;
        float phase2 = (pos.y - time * swellSpeed * 0.9 + 7.0) / (wavelength * 1.2) * 2.0 * PI;

        // Swells get taller as they approach shore (shoaling)
        float shoalFactor = smoothstep(-50.0, 0.0, pos.y) * 0.5 + 0.5;

        height += sin(phase1) * 1.0 * shoalFactor;
        height += sin(phase2) * 0.5 * shoalFactor;

        return height;
    }

    // The main breaking wave - stationary break zone, peel travels along it
    float breakingWave(vec2 pos, float time, out float isFace, out float isFoam, out vec3 displacement) {
        isFace = 0.0;
        isFoam = 0.0;
        displacement = vec3(0.0);

        // The break zone - where the wave breaks (fixed Z position, like a reef)
        float breakZ = 0.0;
        float distFromBreak = pos.y - breakZ;

        // PEEL POSITION - this is where the wave is CURRENTLY breaking
        // Travels from right to left along the wave
        float peelX = 35.0 - mod(time * uPeelSpeed, 70.0);

        // How far are we from the peel point?
        float distFromPeel = pos.x - peelX;

        // Zones relative to peel:
        // distFromPeel > 0  = AHEAD of peel (wave hasn't broken here yet - clean open face)
        // distFromPeel ~ 0  = AT the peel (actively breaking - lip throwing)
        // distFromPeel < 0  = BEHIND peel (already broken - foam/whitewater)

        float aheadOfPeel = smoothstep(-2.0, 4.0, distFromPeel);    // 1 = unbroken
        float atPeel = exp(-distFromPeel * distFromPeel / 8.0);     // Peak at peel point
        float behindPeel = smoothstep(2.0, -4.0, distFromPeel);     // 1 = broken

        float height = 0.0;

        // Only build the wave shape near the break zone
        if (distFromBreak > -uWaveWidth * 1.5 && distFromBreak < uWaveWidth * 2.0) {

            // Wave profile (cross-section perpendicular to beach)
            // This is the shape you'd see from the side
            float profilePos = (distFromBreak + uWaveWidth) / (uWaveWidth * 2.0); // 0 to 1

            // Back of wave (ocean side) - gentle rise
            float backSlope = smoothstep(0.0, 0.35, profilePos);

            // Peak/crest
            float crest = exp(-pow((profilePos - 0.45) * 4.0, 2.0));

            // Face (shore side) - steep drop
            float faceSteep = smoothstep(0.7, 0.45, profilePos);

            // Combine for wave profile
            float profile = backSlope * (crest + faceSteep * 0.3);

            // === UNBROKEN SECTION (ahead of peel) ===
            // Full height, clean face, no lip throw yet
            float unbrokenHeight = uWaveHeight * profile;

            // === AT THE PEEL (actively breaking) ===
            // This is where the lip throws!
            if (atPeel > 0.1 && profilePos > 0.35 && profilePos < 0.6) {
                // The lip pitches forward
                float lipPhase = (profilePos - 0.35) / 0.25;
                float throwAmount = sin(lipPhase * PI) * uLipCurl * atPeel;

                // Horizontal throw toward shore
                displacement.z = throwAmount * 3.0;

                // Lip rises then falls as it throws
                unbrokenHeight += throwAmount * 1.5;
            }

            // === BROKEN SECTION (behind peel) ===
            // Collapsed, foamy, lower
            float brokenHeight = uWaveHeight * 0.25 * smoothstep(0.8, 0.2, profilePos);

            // Blend based on peel position
            height = mix(brokenHeight, unbrokenHeight, aheadOfPeel);

            // Face mask - only on unbroken section
            if (profilePos > 0.4 && profilePos < 0.65) {
                isFace = aheadOfPeel * faceSteep;
            }

            // Foam - behind the peel and in the impact zone
            isFoam = behindPeel * smoothstep(-0.2, 0.5, profilePos) * smoothstep(1.0, 0.6, profilePos);

            // Extra foam spray at the peel point
            isFoam = max(isFoam, atPeel * 0.7 * smoothstep(0.3, 0.5, profilePos));
        }
        // Behind the break zone (toward shore) - whitewater wash
        else if (distFromBreak >= uWaveWidth * 2.0) {
            float washDecay = smoothstep(uWaveWidth * 5.0, uWaveWidth * 2.0, distFromBreak);
            height = behindPeel * uWaveHeight * 0.15 * washDecay;
            isFoam = behindPeel * washDecay * 0.5;
        }

        return height;
    }

    void main() {
        vec3 pos = aPosition;

        // Layer 1: Incoming swells (visible lines rolling toward shore)
        float swells = incomingSwells(pos.xz, uTime);

        // Layer 2: The breaking wave
        float isFace, isFoam;
        vec3 waveDisplacement;
        float breakingHeight = breakingWave(pos.xz, uTime, isFace, isFoam, waveDisplacement);

        // Combine: swells everywhere, breaking wave adds on top
        pos.y = swells * 0.8 + breakingHeight;

        // Apply lip throw displacement
        pos.z += waveDisplacement.z;

        // Reduce swell influence where wave is breaking (cleaner look)
        if (breakingHeight > 0.5) {
            pos.y = breakingHeight + swells * 0.2;
        }

        // Calculate normal
        float eps = 0.25;
        float d1, d2;
        vec3 disp;

        float hL = incomingSwells(vec2(aPosition.x - eps, aPosition.z), uTime) * 0.8
                 + breakingWave(vec2(aPosition.x - eps, aPosition.z), uTime, d1, d2, disp);
        float hR = incomingSwells(vec2(aPosition.x + eps, aPosition.z), uTime) * 0.8
                 + breakingWave(vec2(aPosition.x + eps, aPosition.z), uTime, d1, d2, disp);
        float hF = incomingSwells(vec2(aPosition.x, aPosition.z + eps), uTime) * 0.8
                 + breakingWave(vec2(aPosition.x, aPosition.z + eps), uTime, d1, d2, disp);
        float hB = incomingSwells(vec2(aPosition.x, aPosition.z - eps), uTime) * 0.8
                 + breakingWave(vec2(aPosition.x, aPosition.z - eps), uTime, d1, d2, disp);

        vec3 normal = normalize(vec3(hL - hR, eps * 2.0, hF - hB));

        vWorldPos = (uModel * vec4(pos, 1.0)).xyz;
        vNormal = normalize(mat3(uModel) * normal);
        vUV = aUV;
        vFoam = isFoam;
        vWaveFace = isFace;
        vDepth = pos.y;

        gl_Position = uProjection * uView * uModel * vec4(pos, 1.0);
    }
`;
