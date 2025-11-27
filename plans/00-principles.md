# Foundational Principles

Before writing any code, we need to understand what we're simulating.

---

## The Core Insight: Waves Are Energy, Not Water

**Water doesn't travel with the wave.** Energy does.

When you watch a wave roll toward shore, you're not seeing water move horizontally - you're seeing energy pulse through water. The water particles themselves move in circular/elliptical orbits, returning close to their starting position after each wave passes.

This is why:
- A floating buoy bobs up and down but doesn't travel to shore with each wave
- The "wave" you see is a shape moving through the medium, not the medium itself
- The same water participates in wave after wave

---

## Orbital Motion: The Foundation of Everything

In deep water, each water particle traces a **circular orbit** as a wave passes:
- At the crest: particle moves FORWARD (in wave direction)
- Descending: particle moves DOWN
- At the trough: particle moves BACKWARD
- Ascending: particle moves UP

```
Wave traveling →

    CREST (particle moving →)
      ↗ ○ ↘
     ↑     ↓
      ↖ ○ ↙
    TROUGH (particle moving ←)
```

The orbit diameter equals the wave height at the surface, and **decreases exponentially with depth**. At depth = ½ wavelength, there's essentially no motion.

---

## What Changes in Shallow Water (Shoaling)

When the water depth is less than ½ the wavelength, the bottom interferes:

1. **Orbits flatten into ellipses** - vertical motion constrained by the bottom
2. **Horizontal motion increases** - energy has to go somewhere
3. **Wave slows down** - bottom friction drags on it
4. **Wavelength decreases** - waves bunch up
5. **Wave height increases** - same energy in smaller space

This is **shoaling** - the wave is "feeling the bottom."

---

## Why Waves Break

A wave breaks when the **orbital velocity exceeds the wave velocity**.

As the wave shoals:
- Particle velocity (in the orbit) increases
- Wave speed decreases
- Eventually: particle speed > wave speed
- The crest outruns the rest of the wave
- It falls forward - the wave breaks

**Breaking criteria:**
- Wave height > ~0.78 × water depth
- OR wave steepness (H/L) > ~1/7

---

## The Breaking Wave Anatomy

A breaking wave is ONE CONTINUOUS PHENOMENON, not separate parts:

1. **The approaching swell** - energy traveling through deep water
2. **The shoaling zone** - swell feeling bottom, standing up
3. **The breaking point** - where H > 0.78d, wave becomes unstable
4. **The lip** - top of wave pitching forward (orbital velocity > wave velocity)
5. **The face** - steep front where water is drawn up
6. **The barrel/tube** - air pocket when lip throws over (plunging breakers)
7. **The foam/whitewater** - turbulent aerated water after breaking

**These are all the same wave** at different stages of its life.

---

## The Peel

The wave doesn't break all at once. The break **peels** along the wave because:
- Bottom contour isn't uniform
- One section reaches breaking depth before adjacent sections
- The break propagates laterally

This creates:
- **The peak** - where breaking starts
- **The shoulder** - unbroken section ahead of the peel
- **The pocket** - sweet spot just ahead of the curl (steepest, most power)

---

## Implications for Simulation

### What We MUST Get Right
1. Wave is a traveling energy pulse, not a moving wall
2. The same wave shoals, stands up, and breaks - continuous phenomenon
3. Breaking happens where physics dictates (depth vs height)
4. The lip throws forward because particles outrun the wave

### What We Can Simplify
1. Don't need to simulate every particle - can use math to describe the surface
2. Can use a fixed "reef" position for where breaking happens
3. Can stylize foam/spray as visual effects on top of core physics

### What We Got Wrong Before
1. Treating swell as separate from breaking wave
2. Making wave a static wall that "peels" visually
3. No actual wave propagation toward shore
4. Lip curl as a height bump, not horizontal throw
5. Building effects before getting fundamentals right

---

## The Build Sequence

We should build in this order, validating each step:

1. **Debugger** - See what we're doing
2. **Still water** - Flat surface, basic rendering
3. **Single swell** - One traveling bump, watch it move
4. **Orbital motion** - Particles moving correctly in the swell
5. **Shoaling** - Wave stands up as depth decreases
6. **Breaking** - When physics says break, it breaks
7. **The peel** - Break propagates along the wave
8. **Foam/effects** - Visual polish on working physics
9. **Surfer** - Finally add gameplay

Each step must work before moving to the next.
