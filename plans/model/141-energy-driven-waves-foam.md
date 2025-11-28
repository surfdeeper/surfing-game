# Plan 141: Energy-Driven Waves and Foam

Status: proposal
Owner: agents
Depends on: 140-energy-field-model.md

## Vision

Make the energy field the **source of truth** for wave behavior and foam generation. Currently the energy field is a visualization layer that mirrors the discrete wave system. This plan integrates them so energy actually drives gameplay.

## Current State

- Discrete waves spawn at horizon, travel to shore on fixed paths
- Foam deposits where `waveHeight > 0.78 * depth` (breaker index)
- Energy field mirrors waves but doesn't affect anything
- Energy drains where foam deposits (visual feedback only)

## Proposed Changes

### Phase 1: Energy Affects Wave Amplitude

Waves read their amplitude from the energy field instead of their spawn-time amplitude:

```javascript
// Current: wave.amplitude is fixed at spawn
const waveHeight = amplitudeToHeight(wave.amplitude);

// Proposed: wave amplitude comes from energy field at wave position
const energyAtWave = getHeightAt(energyField, normalizedX, waveProgress);
const dynamicAmplitude = Math.min(wave.amplitude, energyAtWave);
const waveHeight = amplitudeToHeight(dynamicAmplitude);
```

**Effect**: When energy drains (after breaking), the wave visually shrinks. Waves "reform" smaller after passing over sandbars.

### Phase 2: Energy Controls Breaking

Breaking threshold incorporates energy level:

```javascript
// Current: pure physics-based breaking
const shouldBreak = waveHeight > 0.78 * depth;

// Proposed: needs both shallow water AND sufficient energy
const energyAtPoint = getHeightAt(energyField, normalizedX, progress);
const hasEnergy = energyAtPoint > 0.1;
const shouldBreak = hasEnergy && waveHeight > 0.78 * depth;
```

**Effect**: A wave that already broke and drained energy won't break again at the same spot. Energy must rebuild (from lateral diffusion or a following wave) before breaking resumes.

### Phase 3: Foam Intensity from Energy

Foam opacity/intensity scales with energy drained:

```javascript
// Current: foam has fixed initial opacity
const foam = createFoam(gameTime, x, y, waveId);
foam.opacity = 1.0;

// Proposed: foam intensity matches energy released
const energyReleased = drainEnergyAt(field, x, y, amount);
const foam = createFoam(gameTime, x, y, waveId);
foam.opacity = Math.min(1.0, energyReleased * 2);
```

**Effect**: Set waves produce brighter, more intense foam. Background waves produce lighter foam. Areas where energy was already drained produce less foam.

### Phase 4: Wave Visual Thickness from Energy

Wave gradient band thickness scales with local energy:

```javascript
// Current: thickness based on spawn amplitude
const waveSpacing = minThickness + (maxThickness - minThickness) * wave.amplitude;

// Proposed: thickness based on energy at each X slice
const energyAtSlice = getHeightAt(energyField, normalizedX, progress);
const dynamicThickness = minThickness + (maxThickness - minThickness) * energyAtSlice;
```

**Effect**: Waves visually thin out after breaking over sandbars. The "shoulder" of a wave (away from the peak) can be thicker where energy hasn't drained.

## Implementation Steps

| Step | Task | Complexity |
|------|------|------------|
| 1 | Add `getHeightAt` sampling in wave rendering | Low |
| 2 | Scale wave visual thickness by energy | Low |
| 3 | Gate breaking on minimum energy threshold | Low |
| 4 | Return energy drained amount from `drainEnergyAt` | Low |
| 5 | Scale foam initial opacity by energy released | Low |
| 6 | Test: wave shrinks after passing sandbar | Medium |
| 7 | Test: foam intensity varies with wave type | Medium |
| 8 | Tune energy drain rate vs visual feedback | Medium |

## Benefits

1. **Visual coherence**: Energy field and wave visuals match perfectly
2. **Realistic reformation**: Waves shrink after breaking, can break again if energy rebuilds
3. **Set wave distinction**: Set waves produce noticeably more foam
4. **Emergent gameplay**: Player can see where energy is concentrated (where to catch waves)

## Open Questions

- Should completely drained waves disappear, or persist as minimal ripples?
- How fast should energy rebuild via lateral diffusion after breaking?
- Should foam generation completely stop below an energy threshold, or just reduce?

## Success Criteria

1. Wave visually thins after breaking over sandbar
2. Set waves produce brighter/thicker foam than background waves
3. A wave that broke at the outer sandbar has less energy at the inner point
4. Energy field and wave rendering stay visually synchronized
