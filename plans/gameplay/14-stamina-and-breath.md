# Stamina & Breath System

Purpose: manage energy and oxygen as core survival mechanics that create tension and strategic depth.

---

## Stamina Meter

### What Drains Stamina
- **Paddling**: continuous drain while paddling
- **Sprint paddling**: 3x drain for burst speed
- **Duck diving**: moderate burst drain
- **Turtle rolling**: moderate burst drain
- **Pop-up**: small burst drain
- **Riding**: minimal drain (wave does the work)
- **Wipeouts**: significant drain from turbulence
- **Fighting currents**: heavy drain (rip currents, drift)
- **Cold water**: passive drain in cold temps (wetsuit mitigates)

### What Restores Stamina
- **Sitting on board**: slow passive recovery
- **Floating/treading**: very slow recovery
- **Catching breath between sets**: moderate recovery
- **Riding waves**: slight recovery (adrenaline)
- **Getting to shore**: full recovery over time

### Stamina States
- **Full (100%)**: peak performance
- **Good (70-99%)**: normal performance
- **Tired (40-69%)**: reduced paddle speed, slower pop-up
- **Exhausted (15-39%)**: significantly impaired, can't sprint
- **Critical (<15%)**: can barely paddle, high drown risk

### Visual Indicators
- Stamina bar (green → yellow → red)
- Character breathing animation intensifies
- Paddle stroke slows visibly
- Screen edge vignette when critical

---

## Oxygen / Breath Hold

### Breath Meter
- Separate from stamina
- Only active when underwater
- Depletes during hold-downs and duck dives

### What Affects Breath
- **Base capacity**: determined by training (plan 11)
- **Pre-breath**: taking a breath before going under
- **Exertion**: activity underwater drains faster
- **Panic**: low stamina = faster oxygen drain
- **Water temp**: cold water = shorter holds
- **Wipeout violence**: turbulent wipeouts drain faster

### Breath States
- **Comfortable (100-60%)**: no stress
- **Holding (60-30%)**: starting to feel it
- **Burning (30-10%)**: desperate, screen effects
- **Blackout (<10%)**: vision fading, seconds from drowning

### Visual/Audio Indicators
- Breath meter (blue bar, depletes down)
- Heartbeat audio intensifies
- Muffled underwater sounds
- Screen darkens at edges
- Bubbles escaping (visual breath loss)
- Vision tunnels near blackout

---

## Hold-Down Mechanics

### What Causes Hold-Downs
- Wipeouts on breaking waves
- Getting caught inside by sets
- Lip landing on you
- Turbulence pulling you under
- Leash snagging on reef

### Hold-Down Phases

**1. Impact**
- Initial breath (if prepared) or gasp
- Disorientation
- Tumbling animation

**2. Turbulence**
- Rag-dolled underwater
- Can't control movement
- Duration based on wave size/power

**3. Float-Up**
- Turbulence subsides
- Swim toward light/surface
- Obstacles may block (reef, next wave)

**4. Surface**
- Gasp for air
- Quick breath recovery
- Check for next wave incoming

### Multi-Wave Hold-Downs
- Worst case scenario
- Surface just in time for next wave to hit
- Each subsequent hold-down starts with less breath
- Survival becomes critical

### Hold-Down Duration
- Small wave (2-4ft): 3-8 seconds
- Medium wave (5-8ft): 8-15 seconds
- Large wave (10-15ft): 15-30 seconds
- XXL (20ft+): 30-60+ seconds

---

## Drowning Mechanics

### Near-Drowning
- Oxygen hits 0%
- Vision blacks out
- Lose consciousness
- If surface reached: severe penalty, session may end
- Requires rescue or lucky float-up

### Death Conditions
- Extended blackout with no rescue
- Multiple consecutive hold-downs
- Caught in impact zone during massive set
- Held under by debris/reef snag

### Rescue Systems
- Other surfers may help (NPC or multiplayer)
- Jet ski rescue (if available, plan 12)
- Lifeguards at guarded beaches
- Float to shore if unconscious (RNG survival)

### Death Consequences
- Standard mode: hospital, lost progress, medical bills
- Hardcore mode: permadeath
- Reputation impact: "pushed too hard"

---

## Strategic Depth

### Pre-Session Decisions
- Check wave size vs your breath capacity
- Big waves require more training
- Know your limits

### In-Session Management
- Don't paddle out exhausted
- Rest during lulls
- Take a breath before duck dives
- Position to avoid impact zone
- Know when to go in

### Risk Assessment
- Bigger waves = longer hold-downs
- Shallow reef = harder impacts
- Sets on the horizon = stay alert
- Fatigue compounds danger

---

## Breath Training Benefits (Plan 11 Integration)

### Trainable Stats
- **Base breath hold**: 30 sec → 90+ sec with training
- **Recovery speed**: how fast you catch breath
- **Panic threshold**: stay calm longer
- **Efficiency**: less oxygen used per second

### Training Methods
- Pool breath holds
- Underwater laps
- Freediving practice
- Meditation (panic control)
- Cardio (recovery speed)

---

## Environmental Factors

### Water Temperature
- Warm (tropical): no breath penalty
- Cool (temperate): slight penalty without wetsuit
- Cold (northern): significant penalty, hypothermia risk
- Wetsuit quality mitigates cold effects

### Wave Power
- Mushy waves: short, gentle hold-downs
- Punchy waves: moderate turbulence
- Heavy waves: violent, extended hold-downs
- Slabs: most dangerous, worst hold-downs

### Currents
- Rip currents extend hold-downs (pull you out)
- Fighting currents drains stamina fast
- Smart players use currents, don't fight them

---

## UI Design

### HUD Elements
```
┌─────────────────────────────────┐
│  [Stamina Bar ████████░░]      │
│  [Breath Bar  ████████████]    │ (only shows underwater)
│                                 │
│              🏄                 │
│                                 │
│  [Wave Incoming Warning]        │
└─────────────────────────────────┘
```

### Underwater View
- Blue tint overlay
- Bubbles particle effect
- Muffled audio
- Breath bar prominently displayed
- Direction to surface indicator
- "Wave Above" warning if another wave is passing

---

## Balance Considerations

### Beginner Friendly
- Smaller waves = manageable hold-downs
- Forgiving breath meter on easy mode
- Clear warnings before danger
- Quick recovery on shore

### Skill Expression
- Pros can push limits safely
- Training pays off in survival
- Reading conditions prevents emergencies
- Knowing when to NOT go out

### Not Frustrating
- Deaths should feel earned (you pushed too hard)
- Warnings are clear
- Recovery is possible with smart play
- Hardcore mode is opt-in

---

## Testing

- Stamina drain rates feel realistic
- Breath meter creates tension without frustration
- Hold-down duration matches wave size
- Training improvements are noticeable
- Death is rare but impactful
- Multi-wave hold-downs are terrifying but survivable with skill
