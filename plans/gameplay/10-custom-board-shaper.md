# Custom Board Shaper

Purpose: visit local shapers who ask questions about your surfing to design a personalized board.

## The Shaper Experience

### Consultation Flow
1. Enter the shaper's workshop (each shaper has unique vibe/specialty)
2. Shaper asks questions about your surfing
3. Based on answers, shaper recommends dimensions and features
4. Preview the board design
5. Customize cosmetics (colors, graphics, logo placement)
6. Order the board (cost + build time)
7. Pick up when ready

### Shaper Questions

**About Your Surfing**
- "What's your home break?" → affects rocker, volume
- "Beach break or reef?" → affects bottom contours
- "Mushy waves or punchy?" → affects outline and foil
- "How often do you surf?" → affects durability vs performance
- "What do you want to improve?" → affects design focus

**About Your Style**
- "Speed and flow, or tight in the pocket?" → affects length, tail
- "Big carves or quick snaps?" → affects rail profile
- "Ever want to get barreled?" → affects rocker, thickness
- "Nose riding or performance?" → longboard-specific

**About You**
- "Height and weight?" → affects volume calculation
- "How long have you been surfing?" → skill-appropriate design
- "Any injuries to work around?" → paddle-friendly options

### Shaper Recommendations

Based on answers, shaper explains their recommendations:

```
"For Linda Mar's mushy beach break and your level,
I'd recommend a 6'2" with a bit of extra volume
in the chest for easy paddling. Single to double
concave will give you speed in the flat sections.
What do you think?"
```

Player can:
- Accept recommendation
- Ask for adjustments ("a little shorter?")
- Request something completely different
- Compare to other shapers' opinions

---

## Board Design Parameters

### Dimensions
- Length (5'4" - 10'0")
- Width (18" - 24")
- Thickness (2" - 3.5")
- Volume (calculated from above + outline)

### Shape Elements
- **Nose**: pointed, round, wide
- **Tail**: squash, swallow, pin, round, diamond
- **Rails**: boxy, medium, knifey
- **Rocker**: flat, moderate, aggressive
- **Concave**: flat, single, double, vee, channel

### Construction
- **PU/Poly**: classic feel, easier to repair, heavier
- **EPS/Epoxy**: lighter, more float, harder to ding
- **Soft-top**: safe, durable, beginner-friendly
- **Carbon stringers**: performance, expensive

### Fin Setup
- Single fin (classic glide)
- Twin fin (loose, fast)
- Thruster (versatile control)
- Quad (speed, hold)
- 2+1 (longboard setup)

---

## Shaper Characters

### Dusty @ Dusty's Garage (Budget)
- Old school, no-frills
- Specializes in: logs, mid-lengths
- Vibe: cluttered garage, coffee stains, stories
- Motto: "It's just foam and glass, don't overthink it"
- Price: $

### Miko @ Precision Shapes (Performance)
- Data-driven, uses computer modeling
- Specializes in: shortboards, step-ups
- Vibe: clean workshop, CAD screens, measurements
- Motto: "Every millimeter matters"
- Price: $$$

### Jules @ Soul Craft (Artisan)
- Hand-shapes everything, wood and resin art
- Specializes in: retro fish, eggs, asymmetrics
- Vibe: sawdust, hand tools, reggae playing
- Motto: "The board finds you"
- Price: $$

### Kona @ Island Glass (All-Around)
- Family business, does everything
- Specializes in: customs for local breaks
- Vibe: photos of team riders, trophies, aloha spirit
- Motto: "We shape for where you surf"
- Price: $$

---

## Board Build Time

- Rush order: 1 day (2x cost)
- Standard: 3-5 days
- Custom art: +2 days
- Shaper backlog varies (popular shapers = longer wait)

While waiting:
- Track build progress (shaping → glassing → sanding → fins)
- Get text updates from shaper
- Continue surfing on other boards

---

## Integration

- Ties to shop system (09) for purchasing
- Board stats calculated from design parameters
- Shaper relationship: repeat customers get perks
- Unlockable shapers in different regions

---

## Testing

- Unit tests for stat calculations from dimensions
- UI flow tests for consultation
- Balance tests: custom boards shouldn't be strictly better than stock
