# Plan: Scoring System

## Goal
Score rides based on skill - time in pocket, maneuvers, style.

## Steps

### 1. Base Score: Time in Pocket
- Core metric: seconds spent in optimal zone
- Multiplier for being deep in pocket vs edge

```typescript
function updatePocketScore(dt: number, surfer: Surfer, pocket: Pocket) {
    const distance = Math.abs(surfer.x - pocket.x);
    const inPocket = distance < pocket.width;

    if (inPocket) {
        const depth = 1 - (distance / pocket.width); // 0-1, center = 1
        score += dt * BASE_POINTS * (1 + depth);
    }
}
```

### 2. Multiplier System
- Combo multiplier increases while in pocket
- Resets if you leave pocket
- Caps at some max (5x?)

```typescript
let multiplier = 1.0;
const MULTIPLIER_GROWTH = 0.1; // per second in pocket
const MAX_MULTIPLIER = 5.0;

function updateMultiplier(dt: number, inPocket: boolean) {
    if (inPocket) {
        multiplier = Math.min(MAX_MULTIPLIER, multiplier + MULTIPLIER_GROWTH * dt);
    } else {
        multiplier = 1.0; // reset
    }
}
```

### 3. Maneuver Bonuses (Future)
- Cutback: +100 pts
- Floater: +150 pts
- Barrel (if applicable): +500 pts
- Clean exit: +50 pts

### 4. Risk/Reward
- Closer to lip = higher multiplier but wipeout risk
- Steeper wave sections = more points but harder
- Some spots have "critical sections" worth bonus

### 5. Ride Summary
End of ride shows:
- Total score
- Time in pocket
- Max multiplier achieved
- Maneuvers landed
- Grade: A/B/C/D/F based on thresholds

### 6. High Scores
- Per-spot leaderboard
- Personal best tracking
- Session best vs all-time

```typescript
interface RideResult {
    spot: string;
    score: number;
    duration: number;
    pocketTime: number;
    maxMultiplier: number;
    maneuvers: string[];
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}
```

## Success Criteria
- Score reflects skill, not just time
- Multiplier creates tension/excitement
- Clear feedback on what earns points
- High scores motivate replay

## Files to Create
- `src/game/scoring.ts`
- `src/game/multiplier.ts`
- `src/ui/ride-summary.ts`
- `src/ui/leaderboard.ts`
