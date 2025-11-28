# Plan 133: Rocks and Obstacles

## Status: Planning

## Purpose

Add rocks and other fixed obstacles that interact with wave physics, create visual effects, and provide strategic gameplay elements.

## Dependencies
- ✅ Bathymetry model (Plan 124)
- ✅ Foam/whitewater system
- Wave breaking logic

---

## Rock Types

### Exposed Rocks (Above Waterline)
- Always visible regardless of tide
- Waves wrap around and break on them
- Create spray/splash animations on impact
- Dangerous: board damage and injury risk

### Submerged Rocks (Below Waterline)
- Visible as dark shadows or kelp markers
- Cause waves to jack up and break unexpectedly
- Trip hazard at low tide
- Can be strategic: create bowls and wedges

### Boulders / Rock Piles
- Clusters that create complex refraction
- Multiple break points and channels
- Shelter zones on inside

### Jetties / Breakwaters
- Man-made rock structures
- Create predictable wave wedges
- Popular takeoff zones near the rocks

---

## Wave Physics Interactions

### Wave Refraction
- Waves bend around rocks toward shallower water
- Creates converging wave energy (wedges)
- Angle of approach changes based on rock position

### Wave Breaking Triggers
- Rocks create local shallow zones
- Waves break earlier when hitting rock
- Sudden depth change = sudden break (more hollow)

### Energy Shadowing
- Rocks block wave energy on their inside/lee side
- Creates calm zones behind rocks
- Strategic rest areas for paddling out
- Reduced wave height in shadow zone

```
Wave direction →→→

    ░░░░░░░░░░░░░░░░░░░░  (full energy)
    ░░░░░░▓▓▓░░░░░░░░░░░  (rock)
    ░░░░░░   ░░░░░░░░░░░  (shadow zone - calm)
    ░░░░░░░░░░░░░░░░░░░░  (energy wraps back)
```

### Wave Wrapping
- Waves curve around rock edges
- Creates "bowl" sections where energy converges
- Advanced: double-up waves from converging angles

---

## Visual Effects

### Spray/Splash on Impact
- White spray particles when wave hits rock
- Height and intensity based on wave size
- Mist/foam lingers briefly

### Wash Over
- Water flowing over submerged rocks
- Visible turbulence and foam trails
- Kelp streaming effect

### Rock Foam Accumulation
- Persistent foam collects around rock bases
- Swirling patterns in eddies
- Tide-dependent visibility

### Wet Rock Sheen
- Rocks glisten when waves recede
- Tide line visible on exposed rocks

---

## Gameplay Mechanics

### Hazard Zones
- Collision detection with rocks
- Board damage: dings, cracks, snaps
- Player injury: cuts, impact damage
- Higher risk = potential for better waves

### Strategic Elements
- Use rock shadows to paddle out easier
- Position near rocks for wedging waves
- Channel between rocks = rip current assist
- Local knowledge: learn rock positions at each break

### Tide Interaction
- Low tide: more rocks exposed, more hazards
- High tide: rocks submerged, different breaks
- Mid tide sweet spot at some breaks

### Risk/Reward
- Rocks create the best wave shapes
- But getting too close = wipeout danger
- Skilled players thread the needle

---

## Data Model

```js
rock = {
    id: 'rock-1',
    x: 0.35,              // normalized position (0-1)
    y: 450,               // screen y position
    width: 30,            // collision width
    height: 20,           // collision height
    baseDepth: 1.5,       // depth at base (meters)
    peakDepth: -0.5,      // negative = above waterline
    shape: 'boulder',     // boulder, slab, jetty

    // Visual
    sprite: 'rock-dark',
    wetLine: 0.3,         // tide-dependent wet sheen line

    // Physics effects
    shadowAngle: 45,      // degrees - direction of energy shadow
    shadowLength: 0.1,    // how far shadow extends (normalized)
    refractionStrength: 0.8,  // how much waves bend
}
```

### Wave Shadow Calculation

```js
function getEnergyShadow(x, y, rocks, waveDirection) {
    let shadowFactor = 1.0; // full energy

    for (const rock of rocks) {
        if (isInShadowZone(x, y, rock, waveDirection)) {
            // Reduce energy based on distance from rock
            const dist = distanceFromRock(x, y, rock);
            const falloff = Math.min(1, dist / rock.shadowLength);
            shadowFactor *= falloff;
        }
    }

    return shadowFactor; // 0 = full shadow, 1 = full energy
}

function adjustWaveHeight(wave, x, rocks) {
    const shadow = getEnergyShadow(x, wave.y, rocks, wave.direction);
    return wave.amplitude * shadow;
}
```

---

## Spray Particle System

```js
function spawnRockSpray(rock, wave) {
    const impactForce = wave.amplitude * wave.speed;
    const particleCount = Math.floor(impactForce * 10);

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: rock.x + randomSpread(),
            y: rock.y,
            vx: randomRange(-2, 2),
            vy: randomRange(-5, -15),  // upward spray
            life: randomRange(0.3, 0.8),
            size: randomRange(2, 6),
            opacity: 1.0,
        });
    }
}
```

---

## Integration Points

- `bathymetryModel.js` - rocks modify local depth
- `waveModel.js` - refraction, breaking triggers, energy shadow
- `foamModel.js` - spray particles, rock foam accumulation
- `collisionModel.js` - player/board vs rock collision
- `damageSystem.js` - ties to shop plan (09) for board damage
- `injurySystem.js` - ties to shop plan for player injury

---

## Break Types Created by Rocks

### Point Break
- Wave wraps around a headland or rock point
- Long, peeling waves
- Predictable takeoff zone

### Reef Break (Rock Reef)
- Submerged rock shelf
- Hollow, powerful waves
- Shallow and dangerous

### Wedge
- Rock or jetty creates converging wave energy
- Steep, powerful peaks
- Short but intense rides

---

## Testing

### Unit Tests
- Shadow zone calculations
- Refraction angle math
- Collision detection boundaries

### Visual Tests
- Spray animation triggers and looks natural
- Shadow zones visible in debug mode
- Waves visibly bend around rocks
- Foam accumulates correctly

### Gameplay Tests
- Collision damage triggers appropriately
- Shadow zones provide meaningful shelter
- Risk/reward feels balanced

---

## Future Expansions
- Kelp beds (visual + slight drag)
- Tide pools (cosmetic detail)
- Sea caves (advanced, hollow waves)
- Pier pilings (similar physics to jetties)
- Shipwrecks (rare, dramatic obstacles)
