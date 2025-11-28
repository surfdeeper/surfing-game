# Shop System

Purpose: allow players to browse, purchase, and equip boards and wetsuits that affect gameplay and appearance.

## Goals
- Progression: give players meaningful choices as they earn currency/XP.
- Realism: board and wetsuit properties reflect real-world tradeoffs.
- Expression: cosmetic options let players personalize their surfer.

## Board Categories

### Shortboards
- High maneuverability, fast rail-to-rail
- Duck dive capable
- Lower stability, harder paddle catch
- Best for: steep waves, performance surfing

### Longboards
- High stability, easy wave catch
- Turtle roll required (no duck dive)
- Cross-stepping and nose riding enabled
- Best for: small waves, classic style

### Funboards / Mid-lengths
- Balanced stats
- Partial duck dive ability
- Good all-around option
- Best for: variety of conditions

### Fish / Retro
- Extra speed in small waves
- Loose feel, fun carves
- Moderate paddle power

## Board Stats
- Paddle speed: how fast you can get out back
- Wave catch: ease of catching waves (early entry)
- Stability: balance during pop-up and riding
- Maneuverability: turn radius, responsiveness
- Duck dive: depth/effectiveness (0 for longboards)

## Wetsuit Properties
- Warmth rating: matches water temperature zones
- Flexibility: affects paddle stamina drain
- Thickness: 2mm spring suit → 5/4mm winter
- Style: colors, patterns, brand logos

## Shop UI
- Grid view of available items
- Filter by category (boards, wetsuits, accessories)
- Sort by price, stats, or unlock level
- Preview: see item on surfer before purchase
- Compare: side-by-side stat comparison

## Currency & Unlock System
- Earn coins/points from sessions (wave count, tricks, ride time)
- Some items locked behind skill level or achievements
- Optional: daily deals, rotating inventory
- Ties into existing progression system (see 07-progression-and-rewards.md)

## Integration
- Player state stores equipped board and wetsuit
- Board stats feed into physics model (paddle speed, stability curves)
- Wetsuit affects stamina in cold water sessions
- Debug panel: unlock all items, grant currency

## Parody Brands

### Wetsuit Brands
- **Rip Seam** - "Guaranteed to tear"
- **O'Kneel** - "For the praying surfer"
- **Billalong** - "Takes forever to put on"
- **Slowbronze** - "Eventually you'll get there"
- **Hurl-ey** - "Wipeout tested"
- **Patagoner** - "For surfers who've moved on"

### Board Shapers
- **Sandbar Islands** - "We know where the rocks are"
- **Wet Wire** - "Shockingly good"
- **Very Lost** - "You won't find your line"
- **BS Industries** - "Trust us"
- **Drizzle Surfboards** - "For those 2ft days"
- **Shut Eye Shapes** - "Shaped while sleeping"

### Accessories
- **FFS Fins** - "For f***'s sake, just surf"
- **Pasts Fins** - "Live in the glory days"
- **Hex Wax** - "Cursed grip"
- **Slippy Bumps** - "You're going down"
- **Dagrind** - "Leashes that hold... mostly"

## Board Damage & Durability

### Damage Types
- **Dings**: minor cracks from rocks, reef, collisions
- **Creases**: stress fractures from heavy landings or wipeouts
- **Snaps**: catastrophic board break (rare, dramatic)
- **Delam**: fiberglass separation from waterlogging unrepaired dings

### Damage Sources
- Hitting the bottom (reef, sand, rocks)
- Collision with other surfers' boards
- Heavy wipeouts on big waves
- Nose-diving/pearling impacts
- Running over fins

### Damage Effects
- Dings: minor performance penalty, water seepage over time
- Creases: significant flex change, reduced durability
- Waterlogged: heavy, sluggish paddle, poor response
- Snapped: session over, board destroyed

### Repair System
- DIY repair kit (cheap, temporary fix)
- Ding repair shop (moderate cost, full restore)
- Time-based: repairs take in-game time or real time
- Quiver management: rotate boards while one is in repair

## Player Injury & Death

### Injury Sources
- **Board strikes**: hit by your board or others' boards
- **Fin cuts**: sliced by fins during wipeouts
- **Hold-downs**: extended time underwater
- **Reef/rock impacts**: shallow water wipeouts
- **Collision with other surfers**: crowded lineup chaos
- **Marine life**: shark bites, jellyfish stings (ties to hazards plan)

### Injury Severity
- **Minor**: cuts, bruises - cosmetic bandages, slight stamina penalty
- **Moderate**: sprains, gashes - reduced session time, limp animation
- **Severe**: broken bones, concussion - forced session end, recovery time
- **Fatal**: rare, dramatic events (shark attack, massive hold-down, head-on collision)

### Death Mechanics (Optional/Hardcore Mode)
- Permadeath mode: lose your surfer, start fresh
- Standard mode: hospital recovery, lose some currency/progress
- Death triggers: extended hold-down meter, critical injury threshold
- Dramatic cutscenes for fatal events

### Recovery System
- Rest between sessions to heal
- Hospital visits for severe injuries
- Insurance system (ties to shop - buy coverage)
- Helmet option reduces head injury risk

### Safety Equipment (Shop Items)
- **Helmets**: reduce head injury severity
- **Impact vests**: reduce rib/torso damage, help flotation
- **Reef booties**: protect feet from cuts
- **Soft-top boards**: reduced injury from board strikes (but different feel)

## Future Expansions
- Fins (affects turn feel and drive)
- Leashes (durability - can snap and lose board)
- Wax types (traction in different temps)
- Board bags, roof racks (cosmetic for travel scenes)
- Insurance plans (protect against board loss/hospital bills)

## Testing
- Unit tests for stat calculations and purchase logic
- UI tests for shop navigation and equip flow
- Integration tests for equipped item affecting gameplay
