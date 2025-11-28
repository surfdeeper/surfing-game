# NPC Surfers (AI Crowd)

Purpose: populate the lineup with AI-controlled surfers that create a realistic crowd experience, enforce etiquette dynamics, and add challenge before true multiplayer.

## Overview

NPC surfers fill the lineup with life - paddling around, catching waves, getting in your way, and sometimes helping create that authentic crowded-lineup tension (or mellow uncrowded vibe).

---

## NPC Types

### The Kook
- **Skill**: Beginner
- **Behavior**: Unpredictable, paddles for every wave, bails frequently
- **Danger**: High - doesn't know the rules, might drop in on you
- **Board**: Foam top, massive longboard
- **Appearance**: Wetsuit backwards, zinc everywhere
- **Quotes**: "Is this wave mine?" "Sorry! Sorry!"

### The Local
- **Skill**: Intermediate to Advanced
- **Behavior**: Territorial, knows the peak, calls you off waves
- **Danger**: Medium - will snake you if you're not established
- **Board**: Well-worn shortboard, stickers
- **Appearance**: Tan, no wetsuit even when cold
- **Quotes**: "I got this one" "You're in my spot"

### The Ripper
- **Skill**: Advanced/Pro
- **Behavior**: Catches best waves, impressive maneuvers
- **Danger**: Low - knows the rules, gives waves
- **Board**: High-performance shortboard
- **Appearance**: Sponsored gear, perfect form
- **Quotes**: "All yours" *does air anyway*

### The Longboarder
- **Skill**: Varies
- **Behavior**: Catches waves early, rides long, cross-steps
- **Danger**: Medium - wave hog potential
- **Board**: Classic log, single fin
- **Appearance**: Retro vibes, soul arch
- **Quotes**: "Beautiful day" *nose rides past you*

### The SUP Bro
- **Skill**: Intermediate
- **Behavior**: Catches EVERYTHING from way outside
- **Danger**: High - paddles into waves you're on
- **Board**: Giant SUP, paddle as weapon
- **Appearance**: Life vest, hydration pack
- **Quotes**: "Coming through!" *blocks the horizon*

### The Bodyboarder
- **Skill**: Varies
- **Behavior**: Goes for closeouts and slabs
- **Danger**: Low - usually in different zone
- **Board**: Bodyboard, fins
- **Appearance**: Speedo energy
- **Quotes**: *gets barreled in 2ft*

### The Grom
- **Skill**: Beginner to Intermediate
- **Behavior**: Enthusiastic, learns fast, in a pack
- **Danger**: Low - usually respectful
- **Board**: Hand-me-down, too big
- **Appearance**: Small, loud, having fun
- **Quotes**: "Did you see that?!" "That was sick!"

### The Old Timer
- **Skill**: Advanced (but selective)
- **Behavior**: Waits for good ones, efficient, gives advice
- **Danger**: Low - seen it all
- **Board**: Classic shape, immaculate
- **Appearance**: Gray hair, sun damage, knowing smile
- **Quotes**: "Back in my day..." "Nice one, kid"

### The SUP Grandpa
- **Skill**: Beginner (on SUP)
- **Behavior**: Wobbles around, paddles aimlessly, blocks the lineup
- **Danger**: Very High - can't control the giant board, paddle flailing
- **Board**: Massive SUP, practically a boat
- **Appearance**: Sun hat, life vest, zinc on nose, knee brace
- **Quotes**: "Beautiful morning!" *paddle nearly decapitates you*

### The Boogie Grom
- **Skill**: Beginner (but fearless)
- **Behavior**: Charges straight at shorebreak, no fear, unlimited energy
- **Danger**: Low - stays in shallow water mostly
- **Board**: Colorful boogie board, oversized fins on feet
- **Appearance**: Tiny, rash guard, snorkel mask on forehead for some reason
- **Quotes**: *unintelligible screaming* "MOM WATCH!" "AGAIN!"

### The Skim Kid
- **Skill**: Intermediate (at skimboarding)
- **Behavior**: Sprints at the shoreline, throws board, slides into wash
- **Danger**: Low - different zone, but will run into you on beach
- **Board**: Wooden or fiberglass skimboard
- **Appearance**: No wetsuit, board shorts, sandy everything
- **Quotes**: *sprinting noises* "YEET" *eats sand*

### The Surf Dog
- **Skill**: Surprisingly competent
- **Behavior**: Rides nose of owner's longboard, or solo on foam top
- **Danger**: None - everyone cheers
- **Board**: Soft top, sometimes custom dog board
- **Appearance**: Dog. Usually golden retriever or corgi. Life vest optional.
- **Quotes**: *happy barking* *tail wagging intensifies*
- **Special**: +mood boost for all surfers in lineup when present

### The Beach Walker (Non-Surfer)
- **Skill**: N/A
- **Behavior**: Wades in shallows, picks up shells, stands in the way
- **Danger**: Low - but will stand EXACTLY where you're trying to exit
- **Board**: None
- **Appearance**: Jeans rolled up, holding shoes, tourist vibes
- **Quotes**: "Oh! Is that dangerous?" *photographs you wiping out*

### The Swimmer
- **Skill**: N/A (at surfing)
- **Behavior**: Doing laps parallel to shore, completely unaware
- **Danger**: Medium - collision hazard, especially inside
- **Board**: None, maybe goggles
- **Appearance**: Swim cap, determined face, oblivious
- **Quotes**: *doesn't hear you* *keeps swimming*

---

## Crowd Density Settings

### Empty (0-2 NPCs)
- Dawn patrol vibes
- Every wave is yours
- Peaceful, meditative
- Lower XP multiplier (easy mode)

### Mellow (3-5 NPCs)
- Plenty of waves to go around
- Occasional sharing
- Friendly lineup
- Standard XP

### Crowded (6-10 NPCs)
- Competition for waves
- Need to position well
- Etiquette matters
- Higher XP (earned your waves)

### Packed (10-20 NPCs)
- Chaos mode
- Lots of paddling, few waves
- Drop-ins common
- Frustration/challenge mode
- Highest XP (survival)

### Party Wave
- Special event mode
- Everyone goes! Chaos!
- Collision mayhem
- Comedy mode

---

## NPC Behaviors

### Paddling AI
- Paddle out through channels (smart)
- Paddle out through impact zone (kooks)
- Sit at the peak
- Drift with current
- Jockey for position

### Wave Selection AI
- Assess wave quality
- Calculate if they can make it
- Consider priority (who's deeper)
- Skill affects decision quality

### Wave Riding AI
- Catch wave (success rate varies by skill)
- Choose direction
- Execute maneuvers (skill-based)
- Wipeout probability
- Kick out or ride to shore

### Interaction Behaviors
- **Give wave**: Paddle over shoulder, let you have it
- **Take wave**: Go anyway, you paddle over
- **Drop in**: Snake you, take your wave
- **Collision course**: Both paddling for same wave
- **Rescue**: Help if you're drowning (some NPCs)
- **Aggro**: Yell at you for violations

---

## Priority & Etiquette System

### Right of Way Rules
- Surfer closest to peak has priority
- First to feet has priority
- Don't drop in
- Don't snake
- Paddle wide, not through the lineup

### Etiquette Violations
- **By NPCs**: They drop in on you, snake you
- **By Player**: You drop in, snake, paddle through lineup
- **Consequences**:
  - Locals get aggressive
  - Reputation drops
  - NPCs stop giving waves
  - Possible confrontation

### Reputation System
- Good rep: NPCs give waves, friendly
- Bad rep: NPCs hostile, snake you back
- Per-break reputation (locals remember)
- Actions affect rep (give waves = +, snake = -)

---

## Collision System

### Board Collisions
- NPC board hits you → injury (plan 09)
- You hit NPC → their injury, your reputation hit
- Board-to-board → both boards damaged

### Body Collisions
- Bumping while paddling → minor
- High-speed collision riding → both wipeout
- Underwater collision → dangerous

### Avoidance AI
- NPCs try to avoid you (skill-based success)
- Kooks don't see you coming
- Pros steer around cleanly

---

## Visual Variety

### Randomized Appearance
- Body type / size
- Skin tone
- Wetsuit style and color
- Board type and graphics
- Accessories (hat, zinc, etc.)

### Animation States
- Sitting on board
- Paddling (various speeds)
- Duck diving / turtle rolling
- Popping up
- Riding (stance variations)
- Wiping out
- Swimming (lost board)

### Personality Tells
- How they sit (relaxed vs. tense)
- Paddle aggression
- Wave celebration style
- Wipeout reaction

---

## Spawning & Persistence

### Session Population
- NPCs spawn at session start based on:
  - Time of day (dawn = empty, noon = packed)
  - Day of week (weekend = crowded)
  - Wave quality (good waves = more surfers)
  - Break popularity setting

### Dynamic Arrival/Departure
- NPCs paddle in over session
- NPCs leave (tired, got waves, give up)
- Population ebbs and flows naturally

### Named NPCs
- Some NPCs are recurring characters
- Build relationships over time
- Unlock backstories
- Become rivals or friends

---

## Audio

### Crowd Sounds
- Hoots and hollers
- "Yeah!"
- Whistles
- Distant conversations
- Splashing and paddling

### NPC Callouts
- "Going left!"
- "Coming down!"
- "Outside!"
- "Get out of the way!"
- "Nice one!"

---

## Integration

- Uses player physics for NPC movement
- Ties to stamina/breath for NPC survival
- Affected by wave model, currents
- Collision triggers damage system (plan 09)
- Etiquette affects reputation (new system)
- Can be disabled for solo zen mode
- Foundation for true multiplayer (plan 120)

---

## Difficulty Impact

### Easy Mode
- NPCs give you more waves
- Fewer drop-ins
- More forgiving collisions

### Hard Mode
- Aggressive NPCs
- Tight competition
- Every wave is earned

### Realistic Mode
- Authentic crowd dynamics
- Etiquette matters a lot
- Locals are territorial

---

## Testing

- NPCs navigate waves naturally
- Collision detection works fairly
- Drop-in logic matches surf etiquette
- Reputation system feels meaningful
- Crowd density affects difficulty appropriately
- Performance holds with 20 NPCs
