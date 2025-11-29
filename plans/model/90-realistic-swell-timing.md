# Plan 90: Wave Sets and Lulls

## Current State

The current implementation has uniform swells:
- Fixed spacing: 80 pixels between each swell
- Fixed speed: 50 pixels/second
- Continuous, never-ending identical waves

This creates a "metronome" effect - waves arrive at a constant ~7 second interval with no variation.

## Real-World Physics: Sets and Lulls

Waves don't arrive uniformly. They come in **sets** (groups) separated by **lulls** (calm periods):

- **Sets typically contain 3-16 waves** (commonly 5-10)
- First wave in a set is usually small
- Largest wave is often in the middle of the set
- Waves get progressively smaller toward the end
- **Lull duration**: A few minutes to 30+ minutes between sets

## Proposed Implementation

### Concept: Amplitude Envelope

Instead of constant-amplitude waves, modulate the wave intensity over time:

```
Time →
Amplitude:
    ▁▂▄█▆▃▁          ▁▃▅█▇▄▂▁              ▁▂▅█▆▃▁
    [  SET  ]  LULL  [  SET  ]    LULL     [  SET  ]
```

### Configuration

```javascript
const setConfig = {
    wavesPerSet: [4, 8],        // min, max waves per set
    lullDuration: [20, 60],     // min, max seconds between sets
    peakPosition: 0.4,          // biggest wave at 40% through set
    minAmplitude: 0.2,          // during lulls, waves don't fully disappear
};
```

### State Machine

```
LULL → SET_BUILDING → SET_PEAK → SET_FADING → LULL
```

- **LULL**: Low amplitude, waiting for next set
- **SET_BUILDING**: Amplitude ramping up (first few waves)
- **SET_PEAK**: Maximum amplitude (biggest waves)
- **SET_FADING**: Amplitude decreasing (trailing waves)

### Visual Effect

The gradient contrast changes based on amplitude:
- **High amplitude (set peak)**: Strong dark/light contrast
- **Low amplitude (lull)**: Subtle, almost flat gradient

## Implementation Steps

1. Add amplitude state variable to world config
1. Create set/lull state machine with timing
1. Calculate current amplitude based on state
1. Apply amplitude to gradient rendering (contrast)
1. Add debug UI showing set/lull status

## Acceptance Criteria

- [ ] Visible "sets" of 4-8 waves with larger waves in the middle
- [ ] Clear "lulls" of 20-60 seconds with reduced wave intensity
- [ ] Gradient contrast varies with wave amplitude
- [ ] Natural feeling rhythm (not perfectly predictable)

## Future Work (Plan 100)

- Multiple swell trains with different periods
- Wave interference (constructive/destructive)
- Primary + secondary swell combination

## Research Sources

- [Surfline: Long Period vs Short Period Swell](https://www.surfline.com/surf-news/long-period-vs-short-period-swell/1883)
- [Surfer Today: Why Do Waves Come in Sets?](https://www.surfertoday.com/surfing/why-do-waves-come-in-sets)
- [Surfer Today: How Ocean Swells Propagate, Disperse, and Group](https://www.surfertoday.com/surfing/how-ocean-swells-propagate-disperse-and-group)
