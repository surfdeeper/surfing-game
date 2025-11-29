# AI Expert Rework and Tuning Plan

## Problem
- We added multiple AI modes (beginner/intermediate/expert) but only expert behavior is viable; extra modes add confusion without value.
- Current AI “swims in and out of the foam,” takes very short rides, and often gets stuck in whitewater instead of lining up at the peak.
- Wave timing feels off: the AI doesn’t paddle to the peak and wait; it re-enters foam too quickly and bails early.
- Debug/tuning signals are thin, making iteration slow.

## Current Heuristics (Expert)
- State machine: `SEEKING` → `RIDING`, cooldown after ride.
- Target zone: progress band 0.55–0.90; patrols peak X (from bathymetry) at band midpoint when no foam.
- Foam targeting: scores segments by intensity *opacity* proximity to peak X; ignores rows outside band or with opacity < 0.3.
- Catch: if foam intensity at player > threshold (0.12) and cooldown expired, start ride; 1% wipeout chance.
- Ride setup: direction set away from peak (left if left of peak, right otherwise); resets timers/distance and increments stats.
- Ride control: always paddles sideways (per `rideDirection`) plus `up` (toward horizon) to follow peeling diagonal.
- Ride end: finish if foam < 0.05 after 1s, or on screen-edge hit, or near-horizon; applies 1.5s cooldown and logs score (distance + time bonus).
- Patrolling thresholds: tighter X/Y deadzones when chasing foam; wider when idle.

## Goals
- Single, strong expert AI with clean UI (AI on/off only).
- Reliable lineup at the peak; waits for waves instead of oscillating or drifting in/out of foam.
- Longer, better-timed rides: catch peel early, stay with it, avoid being stuck in foam.
- Better signals for tuning and debugging.

## Plan
1) Collapse modes
   - Remove beginner/intermediate configs and cycling; keep one expert profile as the default.
   - Simplify UI control to just enable/disable AI (no mode toggle).
   - Update tests to reflect single-mode behavior and defaults.

1) Lineup behavior
   - Define a target lineup point near peak X within the expert band; paddle out from shore to that point on spawn.
   - Add station-keeping: small deadzone and gentle damping so AI holds position instead of oscillating.
   - Keep a short cooldown after rides to prevent immediate re-entry into foam while returning to lineup.

1) Wave/foam selection
   - Keep peak-centered scoring but gate by minimum foam length/opacity to ignore weak/short segments.
   - Prefer earlier, higher-intensity foam near the peak; bias toward peel that is still growing.
   - Add a minimum time between catch attempts to prevent rapid in/out thrashing.

1) Ride heuristic
   - Choose a consistent ride direction (or foam-informed) and stick to the peel; continue while foam ahead exists.
   - Relax end condition: don’t bail immediately when intensity dips briefly; allow short grace while foam persists ahead.
   - Avoid getting stuck in foam: if speed drops while intensity is high, bias up/diagonal to escape turbulence.

1) Telemetry & debug hooks
   - Log ride length, distance, and end reason; count wipeouts and cooldown entries.
   - Expose current target, foam score, and ride direction for quick tuning (dev-only).
   - Keep existing key-indicator overlay; optionally display target point/foam lock for debugging.

## Risks / Open Questions
- Foam scoring may need additional spatial/temporal smoothing to avoid jitter between segments.
- Riding “ahead of foam” needs careful sampling so AI doesn’t outrun the peel in high-speed scenarios.
- Cooldown values and deadzones may differ by wave set intensity; might need adaptive tuning later.
