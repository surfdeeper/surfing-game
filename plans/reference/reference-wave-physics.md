# Physics of Breaking Waves - Technical Reference

This document explains the real physics of ocean waves to guide realistic wave visualization. The goal is to understand *why* waves look the way they do, so we can simulate them accurately rather than creating cartoonish approximations.

---

## 1. Orbital Motion: The Foundation

Waves don't actually move water forward - they transfer **energy** through water. Individual water particles move in **orbital paths**.

### Deep Water Orbits
- Particles near the surface trace **circular orbits**
- Orbit diameter ≈ wave height at the surface
- Orbital motion **decreases exponentially** with depth
- At depth = ½ wavelength (the "wave base"), motion is essentially zero
- Particles move **forward** at the crest, **backward** at the trough

```
Deep water particle motion:

        → → →           (crest - particles moving forward)
       ↗     ↘
      ↑   ○   ↓         (circular orbit)
       ↖     ↙
        ← ← ←           (trough - particles moving backward)
```

### Key insight for visualization
The water surface isn't just going up and down - it's also moving **horizontally**. At the crest, water moves in the direction of wave travel. This is why the face of a wave has that characteristic **drawn-up** look - water is being pulled up and forward.

---

## 2. Shoaling: What Happens in Shallow Water

When waves enter water shallower than ½ their wavelength, everything changes.

### The Transformation Process

1. **Wave base touches bottom** - friction begins affecting the wave
1. **Orbits flatten into ellipses** - vertical motion constrained, horizontal motion increases
1. **Wave slows down** - the bottom drags on the wave
1. **Wavelength decreases** - waves bunch up
1. **Wave height INCREASES** - energy conservation (same energy, smaller space)
1. **Wave steepens** - shorter wavelength + taller height = steeper face

```
Shoaling transformation:

Deep water:           Transitional:         Shallow:

    ~~~~~                ~~~                  /\
   ~     ~              /   \               /  \___
  ~       ~            /     \_            /
                                          /
  ○ ○ ○ ○ ○           ⬭ ⬭ ⬭ ⬭           ═══════
  (circles)           (ellipses)         (very flat ellipses)
```

### Critical ratios
- **Deep water**: depth > ½ wavelength
- **Transitional**: ½ wavelength > depth > 1/20 wavelength
- **Shallow water**: depth < 1/20 wavelength

---

## 3. Why Waves Break: The Physics

A wave breaks when **particle velocity exceeds wave velocity**.

### The Mechanism

As the wave shoals:
1. Horizontal orbital velocity increases (ellipses flatten)
1. Wave celerity (speed) decreases (friction with bottom)
1. Eventually: **particle speed > wave speed**
1. The crest literally outruns the wave - it falls forward

### Breaking Criteria

Waves break when ANY of these occur:
- **Steepness limit**: H/L > 1/7 (≈ 0.14) - wave too steep to sustain
- **Depth limit**: H > 0.78 × depth - wave too tall for the water
- **Crest angle**: < 120° - geometry becomes unstable

### The Breaker Index (γ)
```
γ = H_breaking / depth_breaking ≈ 0.78 to 1.2
```
Waves typically break when their height is about 78% of the water depth.

---

## 4. The Breaking Wave Anatomy

Understanding each part of a breaking wave:

```
                    SPRAY ·  · ·
                         \· ·/
                    LIP →  ▼ ←── throwing/pitching
                         ╱│
            BARREL/TUBE │ │   ←── air pocket (plunging waves)
                        │  ╲
        FACE →→→→→→→→→ │   ╲  ←── SHOULDER (unbroken section)
        (steep, clean) │    ~~~~~~~~~~~~~~~
                       │
    TROUGH →→→→→→→→→→ ╱
                     ╱
    FOAM/WHITEWATER ════════════════════  (broken section)
         (turbulent, aerated)
```

### The Face
- **Steep, smooth surface** where surfing happens
- Water is being **drawn up** the face by orbital motion
- Cleaner/glassier when offshore wind holds it up
- Color: translucent green/blue (light passes through)

### The Lip
- **Top edge** that throws forward
- Moves faster than the wave base (outrunning it)
- Thickness varies by wave type
- Creates spray as it detaches

### The Barrel/Tube
- Air pocket formed when lip throws over face
- Only in **plunging breakers**
- Cylindrical shape from lip curtain meeting face

### The Foam/Whitewater
- **Aerated, turbulent** water after breaking
- White because of air bubbles scattering light
- Moves shoreward but slower than unbroken wave
- Has a "surface roller" - tumbling mass of water/air

---

## 5. Types of Breaking Waves

Determined by the **Iribarren number** (ξ):
```
ξ = tan(beach_slope) / √(H₀/L₀)
```

### Spilling Breakers (ξ < 0.5)
- **Gentle beaches**, gradual depth change
- Crest crumbles, foam spills down face
- Breaking happens over 6-7 wavelengths
- Looks: soft, mushy, white foam cascading
- **For our game**: beginner waves

```
Spilling:
      ≈≈≈≈
     ≈    ≈
    ≈  ○○  ≈   (foam tumbles down)
   ≈  ○○○○  ≈
  ~~~~~~~~~~~~~~~~
```

### Plunging Breakers (ξ ≈ 0.5 - 3.3)
- **Steeper beaches** or sudden depth change (reef/sandbar)
- Crest throws out, curls over, crashes
- Most energy released at once - violent
- Creates barrel/tube
- **For our game**: this is what we want!

```
Plunging:
         ·  ·
          ↘
      ╭────╮
     ╱      ╲    (lip throws over)
    │   ○    │   (air trapped = barrel)
    │        ╱
    ╰───────╱
   ~~~~~~~~~~~
```

### Collapsing Breakers (ξ ≈ 3.3 - 5.0)
- Wave front collapses, minimal air
- Foam slides up beach
- Transition between plunging and surging

### Surging Breakers (ξ > 5.0)
- Very steep beaches
- Wave slides up without really breaking
- Most energy reflected back

---

## 6. The Peel: How the Break Travels

The wave doesn't break all at once - the break **peels** along the wave.

### Peel Angle
- Angle between the breaking crest line and the peel direction
- Determines wave speed for surfing
- Affected by bottom contour (reef/sandbar shape)

```
Top-down view:

    UNBROKEN         BREAKING        BROKEN
    SHOULDER           PEAK         WHITEWATER
        ↓               ↓              ↓
   ~~~~~~~~~~~~╲        │         ═══════════
                ╲       │        ═══════════
    (clean face) ╲      │       ═══════════
                  ╲     ↓      ═══════════
                   ╲   PEEL   ═══════════
                    → DIRECTION →
```

### What Creates the Peel
- **Bottom contour** - depth changes at an angle
- Point breaks: rocky point creates consistent peel
- Reef breaks: reef shape determines peel
- Beach breaks: sandbars create peaks that peel both ways

---

## 7. Visual Characteristics to Simulate

### Water Drawing Up the Face
- Orbital motion pulls water up and forward
- Face should look like water is **climbing** upward
- Creates subtle vertical streaks/texture
- Most visible on clean, glassy waves

### The Lip Throw
- Lip detaches from wave body
- Falls in an arc (parabolic trajectory + wind)
- Creates spray sheet and droplets
- Thickness: thin = hollow wave, thick = softer wave

### Foam Texture
- Fresh foam: bright white, large bubbles
- Older foam: cream/grey, smaller bubbles dissipating
- Foam **follows** water motion (swirls, eddies)
- Trails in streaks on wave face

### Color Gradients
- **Deep water**: dark blue/navy
- **Wave back**: medium blue
- **Wave face**: teal/green (thinner, light passes through)
- **Lip/crest**: lightest (thinnest water + backlit)
- **Foam**: white to cream
- **Barrel interior**: dark (shadow) with bright rim

### Surface Texture
- **Open ocean**: larger swells, subtle chop
- **Wave face**: smooth or with slight bumps
- **After break**: chaotic, turbulent foam

---

## 8. Key Formulas for Simulation

### Wave Celerity (speed)
```
Deep water:  c = √(gL/2π) ≈ 1.56 × √L
Shallow:     c = √(gh)
```

### Orbital Velocity
```
Surface horizontal: u = πH/T × cosh(k(z+d))/sinh(kd)
At crest: u_max = πH/T (approximately)
```

### Breaking Condition
```
Particle velocity > Wave celerity
u_max > c
```

### Wave Height vs Depth
```
H_breaking ≈ 0.78 × depth
```

---

## 9. Implications for Our Shader

### What We Need to Fix

1. **The face needs to show water drawing upward**
   - Texture/color should indicate upward flow
   - Vertical streaking on clean sections

1. **The lip needs proper throw mechanics**
   - Detaches and falls in arc
   - Not just a bump at the top

1. **Asymmetric wave profile**
   - Gentle back slope (out to sea)
   - Steep front face (toward shore)
   - Concave face near lip (water sucked up)

1. **Proper foam behavior**
   - Dense at the impact zone
   - Dissipates as it spreads
   - Follows wave motion patterns

1. **The peel should look like continuous breaking**
   - Not just geometry change
   - Active transition zone with spray
   - Foam generation at the peel point

---

## Sources

- [Coastal Dynamics - Wave Breaking](https://geo.libretexts.org/Bookshelves/Oceanography/Coastal_Dynamics_(Bosboom_and_Stive)/05:_Coastal_hydrodynamics/5.02:_Wave_transformation/5.2.5:_Wave_breaking)
- [Wave Energy and Depth Changes](https://manoa.hawaii.edu/exploringourfluidearth/physical/waves/wave-energy-and-wave-changes-depth)
- [Breaking Wave - Wikipedia](https://en.wikipedia.org/wiki/Breaking_wave)
- [The Making of Surf - Geosciences LibreTexts](https://geo.libretexts.org/Bookshelves/Oceanography/Our_World_Ocean:_Understanding_the_Most_Important_Ecosystem_on_Earth_Essentials_Edition_(Chamberlin_Shaw_and_Rich)/03:_Voyage_III_Ocean_Physics/13:_Ocean_Waves/13.14:_The_Making_of_Surf)
- [Earth Science Stack Exchange - Wave Breaking Shape](https://earthscience.stackexchange.com/questions/421/what-causes-waves-to-form-the-characteristic-breaking-shape-as-they-approach-t)
