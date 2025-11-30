# Plan 234: Story Legends for Heatmap Visualization

## Problem

Stories display heatmaps (bathymetry, energy fields) but lack consistent legends showing the value scale. Currently:

1. **BathymetryStrip** has a hardcoded inline legend ("Shallow" ↔ "Deep" with CSS gradient)
2. **ProgressionPlayer** and **Filmstrip** have no legends
3. **No numeric scale** - users can't see actual min/max/median values
4. **No ticks** - hard to map colors to specific values

Without legends, readers must guess what colors mean and can't compare values across snapshots.

## Proposed Solution: Reusable `<Legend>` Component

A standalone legend component that renders:
- Linear gradient bar matching the color scale
- Configurable tick marks with numeric labels
- Min, max, and optional median/quartile ticks
- Horizontal or vertical orientation
- Theme-aware styling

### Visual Design

```
Horizontal (default):
┌────────────────────────────────────────────┐
│  ████████████████████████████████████████  │
│  0.0      0.25      0.5      0.75     1.0  │
└────────────────────────────────────────────┘

Vertical:
┌─────┐
│ 1.0 │ ██
│     │ ██
│ 0.5 │ ██
│     │ ██
│ 0.0 │ ██
└─────┘

With custom labels:
┌────────────────────────────────────────────┐
│  ████████████████████████████████████████  │
│  Shallow        Median           Deep      │
│  (0m)           (5m)            (10m)      │
└────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Core Legend Component

#### 1.1 Create `Legend.tsx`

**File**: `stories/components/Legend.tsx`

```tsx
import { useTheme } from '../ThemeContext';

export interface LegendTick {
  value: number;      // 0-1 normalized position
  label: string;      // Display text (e.g., "0.5" or "Shallow")
}

export interface LegendProps {
  /** Color function mapping 0-1 to CSS color string */
  colorFn: (value: number) => string;

  /** Tick marks to display */
  ticks?: LegendTick[];

  /** Orientation */
  orientation?: 'horizontal' | 'vertical';

  /** Gradient bar dimensions */
  barWidth?: number;
  barHeight?: number;

  /** Optional title above the legend */
  title?: string;

  /** Test ID for visual regression */
  testId?: string;
}

const DEFAULT_TICKS: LegendTick[] = [
  { value: 0, label: '0' },
  { value: 0.5, label: '0.5' },
  { value: 1, label: '1' },
];

export function Legend({
  colorFn,
  ticks = DEFAULT_TICKS,
  orientation = 'horizontal',
  barWidth = 200,
  barHeight = 16,
  title,
  testId,
}: LegendProps) {
  const { colors } = useTheme();

  // Generate gradient stops
  const gradientStops = Array.from({ length: 11 }, (_, i) => {
    const value = i / 10;
    return `${colorFn(value)} ${value * 100}%`;
  }).join(', ');

  const isHorizontal = orientation === 'horizontal';
  const gradientDirection = isHorizontal ? 'to right' : 'to top';

  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isHorizontal ? 'stretch' : 'flex-start',
        gap: 4,
        fontFamily: 'monospace',
        fontSize: 11,
        color: colors.text,
      }}
    >
      {title && (
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{title}</div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: isHorizontal ? 'column' : 'row',
          alignItems: 'stretch',
          gap: 4,
        }}
      >
        {/* Gradient bar */}
        <div
          style={{
            width: isHorizontal ? barWidth : barHeight,
            height: isHorizontal ? barHeight : barWidth,
            background: `linear-gradient(${gradientDirection}, ${gradientStops})`,
            borderRadius: 2,
            border: `1px solid ${colors.text}33`,
          }}
        />

        {/* Tick marks */}
        <div
          style={{
            display: 'flex',
            flexDirection: isHorizontal ? 'row' : 'column-reverse',
            justifyContent: 'space-between',
            width: isHorizontal ? barWidth : 'auto',
            height: isHorizontal ? 'auto' : barWidth,
            paddingLeft: isHorizontal ? 0 : 4,
          }}
        >
          {ticks.map((tick) => (
            <span
              key={tick.value}
              style={{
                position: 'relative',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 1.2 Create Preset Legends

**File**: `stories/components/legends.ts`

```typescript
import { depthToViridis, energyToColor } from '../../src/render/colorScales';
import type { LegendTick } from './Legend';

// Preset tick configurations
export const DEPTH_TICKS: LegendTick[] = [
  { value: 0, label: 'Shallow (0m)' },
  { value: 0.5, label: '5m' },
  { value: 1, label: 'Deep (10m)' },
];

export const ENERGY_TICKS: LegendTick[] = [
  { value: 0, label: 'Low' },
  { value: 0.5, label: 'Medium' },
  { value: 1, label: 'High' },
];

export const NUMERIC_TICKS: LegendTick[] = [
  { value: 0, label: '0' },
  { value: 0.25, label: '0.25' },
  { value: 0.5, label: '0.5' },
  { value: 0.75, label: '0.75' },
  { value: 1, label: '1' },
];

// Preset color functions
export const LEGEND_PRESETS = {
  depth: {
    colorFn: depthToViridis,
    ticks: DEPTH_TICKS,
    title: 'Depth',
  },
  energy: {
    colorFn: energyToColor,
    ticks: ENERGY_TICKS,
    title: 'Energy',
  },
  numeric: {
    colorFn: energyToColor,
    ticks: NUMERIC_TICKS,
    title: 'Value',
  },
} as const;
```

#### 1.3 Create Convenience Wrapper

**File**: `stories/components/Legend.tsx` (add to existing)

```tsx
import { LEGEND_PRESETS } from './legends';

export type LegendPreset = keyof typeof LEGEND_PRESETS;

export interface PresetLegendProps {
  preset: LegendPreset;
  orientation?: 'horizontal' | 'vertical';
  barWidth?: number;
  barHeight?: number;
  testId?: string;
}

export function PresetLegend({ preset, ...props }: PresetLegendProps) {
  const config = LEGEND_PRESETS[preset];
  return <Legend {...config} {...props} />;
}
```

### Phase 2: Dynamic Legend from Data

#### 2.1 Add Data-Driven Ticks

```tsx
export interface DataLegendProps extends Omit<LegendProps, 'ticks'> {
  /** Raw data values to compute min/max/median */
  data: number[] | number[][];

  /** Number of tick marks (default: 3 for min/median/max) */
  tickCount?: number;

  /** Format function for tick labels */
  formatValue?: (value: number) => string;
}

export function DataLegend({
  data,
  tickCount = 3,
  formatValue = (v) => v.toFixed(2),
  colorFn,
  ...props
}: DataLegendProps) {
  // Flatten 2D arrays
  const flat = Array.isArray(data[0])
    ? (data as number[][]).flat()
    : (data as number[]);

  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const range = max - min || 1;

  // Generate ticks
  const ticks: LegendTick[] = Array.from({ length: tickCount }, (_, i) => {
    const normalized = i / (tickCount - 1);
    const actualValue = min + normalized * range;
    return {
      value: normalized,
      label: formatValue(actualValue),
    };
  });

  // Wrap colorFn to handle actual data range
  const normalizedColorFn = (normalized: number) => {
    return colorFn(normalized);
  };

  return <Legend colorFn={normalizedColorFn} ticks={ticks} {...props} />;
}
```

### Phase 3: Integration with Existing Components

#### 3.1 Update Filmstrip

**File**: `stories/components/Filmstrip.tsx`

```tsx
import { Legend, LegendProps } from './Legend';

interface FilmstripProps {
  // ... existing props ...

  /** Optional legend configuration */
  legend?: LegendProps | false;
}

export function Filmstrip({
  snapshots,
  renderSnapshot,
  legend,
  ...props
}: FilmstripProps) {
  return (
    <div>
      {legend && <Legend {...legend} />}
      <div style={{ display: 'flex', gap: props.gap ?? 8 }}>
        {/* existing snapshot rendering */}
      </div>
    </div>
  );
}
```

#### 3.2 Update ProgressionPlayer

**File**: `stories/components/ProgressionPlayer.tsx`

```tsx
import { Legend, LegendProps } from './Legend';

interface ProgressionPlayerProps {
  // ... existing props ...

  /** Optional legend configuration */
  legend?: LegendProps | false;

  /** Legend position */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
}
```

#### 3.3 Update BathymetryStrip

Replace the hardcoded inline legend with the new component:

**File**: `stories/components/BathymetryStrip.tsx`

```tsx
// Before (remove):
<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
  <span>Shallow</span>
  <div style={{ width: 80, height: 12, background: 'linear-gradient(...)' }} />
  <span>Deep</span>
</div>

// After:
import { PresetLegend } from './Legend';

<PresetLegend preset="depth" barWidth={120} />
```

### Phase 4: MDX Usage Examples

#### 4.1 Basic Usage in Stories

```mdx
import { Legend, PresetLegend, DataLegend } from '../components/Legend';
import { depthToViridis, energyToColor } from '../../src/render/colorScales';

## Bathymetry Visualization

<PresetLegend preset="depth" />

<Filmstrip
  snapshots={bathymetrySnapshots}
  renderSnapshot={renderBathymetry}
/>

## Energy Field

<Legend
  colorFn={energyToColor}
  ticks={[
    { value: 0, label: '0 J/m²' },
    { value: 0.5, label: '50 J/m²' },
    { value: 1, label: '100 J/m²' },
  ]}
  title="Wave Energy"
/>

## Data-Driven Legend

<DataLegend
  data={matrixData}
  colorFn={energyToColor}
  formatValue={(v) => `${v.toFixed(1)}m`}
  tickCount={5}
/>
```

### Phase 5: Visual Regression Tests

#### 5.1 Legend Story for Testing

**File**: `stories/00-components/legend.mdx`

```mdx
# Legend Component

## Presets

<section id="depth-legend">
### Depth Legend
<PresetLegend preset="depth" testId="legend-depth" />
</section>

<section id="energy-legend">
### Energy Legend
<PresetLegend preset="energy" testId="legend-energy" />
</section>

<section id="numeric-legend">
### Numeric Legend
<PresetLegend preset="numeric" testId="legend-numeric" />
</section>

## Orientations

<section id="horizontal">
### Horizontal (default)
<Legend colorFn={energyToColor} orientation="horizontal" testId="legend-horiz" />
</section>

<section id="vertical">
### Vertical
<Legend colorFn={energyToColor} orientation="vertical" barWidth={150} testId="legend-vert" />
</section>

## Custom Ticks

<section id="custom-ticks">
### 5-Tick Scale
<Legend
  colorFn={depthToViridis}
  ticks={[
    { value: 0, label: '0m' },
    { value: 0.25, label: '2.5m' },
    { value: 0.5, label: '5m' },
    { value: 0.75, label: '7.5m' },
    { value: 1, label: '10m' },
  ]}
  testId="legend-5tick"
/>
</section>
```

#### 5.2 Visual Test

**File**: `tests/legend.visual.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Legend Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/00-components/legend');
  });

  test('depth preset renders correctly', async ({ page }) => {
    const legend = page.getByTestId('legend-depth');
    await expect(legend).toHaveScreenshot('legend-depth.png');
  });

  test('vertical orientation renders correctly', async ({ page }) => {
    const legend = page.getByTestId('legend-vert');
    await expect(legend).toHaveScreenshot('legend-vertical.png');
  });
});
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `stories/components/Legend.tsx` | Create | Core legend component |
| `stories/components/legends.ts` | Create | Preset configurations |
| `stories/components/Filmstrip.tsx` | Modify | Add optional legend prop |
| `stories/components/ProgressionPlayer.tsx` | Modify | Add optional legend prop |
| `stories/components/BathymetryStrip.tsx` | Modify | Replace inline legend |
| `stories/00-components/legend.mdx` | Create | Component documentation |
| `tests/legend.visual.spec.ts` | Create | Visual regression tests |

## Success Criteria

1. `<Legend>` component renders gradient bar with ticks
2. `<PresetLegend>` provides depth/energy/numeric presets
3. `<DataLegend>` computes ticks from actual data values
4. Horizontal and vertical orientations work
5. Theme-aware (light/dark mode)
6. Existing BathymetryStrip uses new Legend component
7. Visual regression tests pass
8. MDX stories can easily add legends to any visualization

## Future Enhancements

- **Interactive legends**: Hover to highlight values in visualization
- **Range selection**: Click-drag to filter data range
- **Logarithmic scales**: For data with large value ranges
- **Discrete legends**: For categorical data (wave types, etc.)
- **Animated legends**: Show value distribution changing over time
