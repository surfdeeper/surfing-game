# Progression Matrix Grid: The Visual Testing Hack Your Game Team Will Steal

This is the write-up we couldn’t find on the internet: how to turn a wall of screenshots into a *progression matrix grid* that exposes temporal bugs, parameter landmines, and AI oddities in one glance. It’s the love child of film strips, Storybook stories, and visual regression—born for game loops and simulation-heavy UI.

## The One-Sentence Pitch
A progression matrix grid is a 2D gallery where columns are *time slices* and rows are *scenario knobs*. Each cell is a captured frame from your story/scene. The whole grid is screenshot-tested in Playwright so you catch “it broke at t=2.0s only when damping=0.2” before a player does.

## Why It Slaps
- Temporal bugs pop instantly—no scrubbing videos.
- Scenario interactions stay visible—one axis per knob.
- AI co-pilot friendly—LLMs can diff labeled pixels deterministically.

## Show, Don’t Tell (ASCII + Hex)
Imagine an energy field marching shoreward. Columns = time, rows = damping. Cells rendered as 4x6 matrices; values shown as hex-ish intensities (00–FF) to mimic the gradient we actually screenshot.

```
            t=0.0s        t=1.0s        t=2.0s
-----------------------------------------------------
damping 0.0  00 00 00 00  20 20 20 20  40 40 40 40
             00 00 00 00  20 20 20 20  40 40 40 40
             00 00 00 00  20 20 20 20  40 40 40 40
             00 00 00 00  20 20 20 20  40 40 40 40

damping 0.1  00 00 00 00  1A 1A 18 16  28 24 20 18
             00 00 00 00  18 16 14 12  22 1E 1A 12
             00 00 00 00  14 12 10 0E  1A 16 12 0C
             00 00 00 00  10 0E 0C 0A  12 0E 0A 08

damping 0.2  00 00 00 00  12 10 0E 0C  18 14 10 0C
             00 00 00 00  10 0C 0A 08  14 10 0C 08
             00 00 00 00  0C 0A 08 06  10 0C 08 06
             00 00 00 00  08 06 04 04  0A 08 06 04
```

That ASCII block is the mental model for the visual baseline: each number maps to a pixel intensity; in the actual story we render it as colored tiles and snapshot the container.
