# Sandbox Mode & Level Editor

Purpose: let players design custom surf breaks by editing bathymetry, placing obstacles, and configuring weather/swell parameters.

## Core Concept

A creative mode where players become break architects - sculpting the ocean floor, placing rocks and features, and dialing in conditions to create their dream wave or replicate real-world spots.

---

## Bathymetry Editor

### Depth Painting
- Brush tool to raise/lower ocean floor
- Adjustable brush size (fine detail to broad strokes)
- Depth visualization (color gradient: deep blue → shallow yellow)
- Contour lines toggle

### Preset Templates
- **Flat beach**: gentle slope, beach break style
- **Reef shelf**: sudden shallow, hollow waves
- **Point**: angled bathymetry for wrapping waves
- **River mouth**: sandbar with channel
- **Deep water**: big wave step-up

### Sandbar Sculpting
- Place sandbars that affect wave shape
- Sandbar position = peak location
- Multiple sandbars = multiple peaks
- Channel gaps for paddle-out routes

### Depth Tools
- **Raise**: create shallow zones (waves break)
- **Lower**: create channels and deep zones
- **Smooth**: blend harsh transitions
- **Flatten**: level an area
- **Copy/Paste**: duplicate features

---

## Rock & Obstacle Placement

### Rock Types (from plan 133)
- Exposed rocks (above waterline)
- Submerged rocks (trip hazards, kelp markers)
- Boulders / rock piles
- Reef slabs

### Man-Made Structures
- Jetties / groynes
- Piers (with pilings)
- Breakwaters
- Sea walls

### Placement Controls
- Drag and drop placement
- Rotation and scaling
- Depth adjustment (how submerged)
- Snap to grid (optional)
- Copy/paste groups

### Rock Properties
- Size
- Shape preset (round, jagged, flat)
- Material (dark volcanic, light sandstone)
- Kelp attachment (visual)

---

## Shoreline Editor

### Beach Type
- Sand beach (soft landing)
- Cobblestone (board risk)
- Rocky shore (dangerous)
- Cliff/bluff (no beach access)

### Shore Features
- Beach width
- Slope angle
- Dunes / vegetation line
- Access paths
- Parking lot placement (spawn point)

### Tidal Zone
- High tide line
- Low tide exposure
- Tide pool areas

---

## Swell & Weather Configuration

### Swell Parameters
- **Direction**: 0-360° (where swell comes from)
- **Period**: 8-22 seconds (wave spacing)
- **Height**: 1-25+ ft (wave size)
- **Consistency**: how regular the sets are

### Multi-Swell
- Add secondary swells
- Different directions create wedges/crosses
- Swell mixing for complex patterns

### Wind Settings
- **Direction**: offshore, onshore, cross-shore
- **Strength**: calm to howling
- **Gusts**: variability toggle

### Tide Settings
- **Current tide**: low, mid, high
- **Tide movement**: rising, falling, slack
- **Tide range**: minimal to extreme

### Time of Day
- Dawn, morning, midday, afternoon, sunset, night
- Affects lighting and glare
- Dawn patrol vs glassy afternoon sessions

### Weather Presets
- **Glassy morning**: no wind, clean lines
- **Afternoon onshore**: choppy, textured
- **Storm surf**: big, messy, dramatic
- **Santa Ana / offshore**: groomed, hollow
- **Foggy**: limited visibility, moody

---

## Wave Behavior Preview

### Real-Time Simulation
- See waves respond to bathymetry changes
- Watch break points shift with edits
- Preview different swell directions

### Analysis Tools
- **Break map**: overlay showing where waves break
- **Energy map**: wave power visualization
- **Channel finder**: highlights paddle routes
- **Danger zones**: red overlay on shallow rocks

### Test Surf
- Drop into your creation instantly
- Quick iterate: edit → test → edit
- Save replay of test sessions

---

## Saving & Sharing

### Save Slots
- Name your break
- Description and tags
- Thumbnail screenshot
- Difficulty rating (auto-calculated)

### Share Features
- Share code (import/export string)
- Upload to community gallery
- Rate and comment on others' breaks
- Featured breaks rotation

### Categories
- **Replicas**: real-world spot recreations
- **Fantasy**: impossible dream waves
- **Challenge**: difficult or weird setups
- **Training**: specific skill practice setups

---

## Challenge Creator

### Custom Objectives
- "Catch 5 waves in 10 minutes"
- "Land 3 cutbacks in one wave"
- "Survive the hold-down"
- "Don't hit any rocks"

### Leaderboards
- Per-break high scores
- Community challenges
- Weekly featured break competitions

### Conditions Presets
- Save specific condition combos
- "Big Wednesday" mode
- "Terrible Tuesday" (onshore mush)

---

## Advanced Tools

### Wave Tuning
- Break intensity (mushy → critical)
- Peel rate (fast → slow)
- Section length
- Barrel probability
- Closeout frequency

### Current Editor
- Place rip currents manually
- Set current strength and direction
- Longshore drift patterns

### Environmental Details
- Kelp beds
- Fish/marine life density
- Bird activity
- Boat traffic (obstacle)

---

## Templates & Presets

### Famous Break Templates
- **Malibu-style**: long point, peeling rights
- **Pipeline-style**: shallow reef, heavy barrels
- **Trestles-style**: cobblestone point, high performance
- **Beach break**: multiple shifting peaks
- **Wedge-style**: jetty reflection, steep peaks
- **Big wave**: deep water step, outer reef

### Condition Presets
- Perfect day (6ft, 15 sec, offshore)
- Beginner friendly (2ft, gentle)
- Pro challenge (12ft, critical)
- Storm chaos (variable, gnarly)

---

## UI/UX

### Editor Layout
```
┌─────────────────────────────────────────┐
│ [Tools] [Swell] [Weather] [Test] [Save] │
├─────────────┬───────────────────────────┤
│             │                           │
│  Tool       │     Main Canvas           │
│  Palette    │     (Top-down view)       │
│             │                           │
│  - Depth    │     [Zoom] [Pan] [Rotate] │
│  - Rocks    │                           │
│  - Shore    │                           │
│             │                           │
├─────────────┼───────────────────────────┤
│ Properties  │  Preview (Side view)      │
│ Panel       │  [Play] [Pause] [Speed]   │
└─────────────┴───────────────────────────┘
```

### View Modes
- Top-down (editing)
- Side profile (wave shape preview)
- 3D orbit (full visualization)
- Player view (first person preview)

---

## Integration

- Created breaks can be added to travel destinations (plan 12)
- Share with friends for multiplayer sessions
- Earn XP for popular community breaks
- Shaper consults work on custom breaks (plan 10)
- All physics systems apply (rocks, currents, damage)

---

## Testing

- Editor tools are intuitive and responsive
- Physics simulation matches edits accurately
- Share codes work reliably
- Large community gallery performs well
- Extreme configurations don't break the game
