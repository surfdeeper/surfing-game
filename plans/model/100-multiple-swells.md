# Plan 100: Multiple Swells and Wave Interference

**Depends on**: Plan 90 (Wave Sets and Lulls)

## Overview

Real surf conditions often have 2-3 different swells arriving simultaneously from different storms. This plan adds multiple swell trains that combine through wave interference.

## Real-World Physics

### Multiple Swell Sources

- **Primary swell**: Dominant energy (e.g., 14 sec period from distant storm)
- **Secondary swell**: Less dominant (e.g., 9 sec period from regional storm)
- **Wind swell**: Local chop (e.g., 6 sec period)

### Wave Interference

When multiple swells combine:

1. **Constructive interference**: Crests align = larger waves
1. **Destructive interference**: Crest meets trough = cancellation

This is the physics behind why sets and lulls occur naturally.

## Proposed Implementation

### Multiple Swell Trains

```javascript
const swells = [
    {
        period: 14,        // seconds between waves
        spacing: 120,      // visual spacing (pixels)
        speed: 60,         // pixels/second
        amplitude: 1.0,    // relative strength
    },
    {
        period: 9,
        spacing: 70,
        speed: 45,
        amplitude: 0.5,
    },
];
```

### Combined Amplitude

```javascript
function combinedAmplitude(y, time) {
    let total = 0;
    for (const swell of swells) {
        const phase = (y + swell.offset) / swell.spacing;
        const wave = Math.sin(phase * 2 * Math.PI);
        total += wave * swell.amplitude;
    }
    return total;
}
```

### Visual Effect

- Combined amplitude drives gradient contrast
- Natural set/lull pattern emerges from interference
- More organic than artificial state machine

## Implementation Steps

1. Refactor single swell to array of swells
1. Each swell has independent period, speed, offset
1. Sum wave contributions at each y position
1. Map combined amplitude to gradient intensity

## Acceptance Criteria

- [ ] At least 2 independent swell trains
- [ ] Visible interference patterns (natural sets/lulls)
- [ ] Configurable swell parameters

## Research Sources

- [Coastal Wiki: Wave Group](https://www.coastalwiki.org/wiki/Wave_group)
- [UW Pressbooks: Wave Dispersion and Group Velocity](https://uw.pressbooks.pub/ocean285/chapter/wave-dispersion-and-group-velocity/)
