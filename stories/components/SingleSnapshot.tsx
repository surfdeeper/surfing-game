import React, { useRef, useEffect } from 'react';
import { depthToViridis, energyToColor } from '@src/render/colorScales';
import { useTheme } from '../ThemeContext';

type ColorScale = 'depth' | 'energy';

interface Snapshot {
  time: number;
  matrix: number[][];
  label: string;
}

interface Progression {
  id: string;
  description: string;
  snapshots: Snapshot[];
  metadata: {
    label: string;
    [key: string]: unknown;
  };
}

interface SingleSnapshotProps {
  /** Progression object containing snapshots */
  progression: Progression;
  /** Which color scale to use */
  colorScale?: ColorScale;
  /** Cell size in pixels */
  cellSize?: number;
  /** Test ID for visual regression */
  testId?: string;
}

const COLOR_SCALE_FNS: Record<ColorScale, (v: number) => string> = {
  depth: depthToViridis, // Use same inverted Viridis scale as game's bathymetryRenderer
  energy: energyToColor,
};

function MatrixCanvas({
  matrix,
  cellSize = 24,
  colorFn,
}: {
  matrix: number[][];
  cellSize?: number;
  colorFn: (v: number) => string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const height = matrix.length;
  const width = matrix[0]?.length ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const value = matrix[row][col];
        ctx.fillStyle = colorFn(value);
        ctx.fillRect(col * cellSize, row * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }, [matrix, cellSize, height, width, colorFn]);

  return (
    <canvas
      ref={canvasRef}
      width={width * cellSize}
      height={height * cellSize}
      style={{ borderRadius: 4 }}
    />
  );
}

/**
 * Renders a single snapshot from a progression.
 * Used in individual story pages for granular visualization.
 */
export function SingleSnapshot({
  progression,
  colorScale = 'energy',
  cellSize = 24,
  testId,
}: SingleSnapshotProps) {
  const { colors } = useTheme();
  const snapshot = progression.snapshots[0];
  if (!snapshot) return null;

  const colorFn = COLOR_SCALE_FNS[colorScale];

  return (
    <div
      data-testid={testId ?? `snapshot-${progression.id}`}
      style={{
        display: 'inline-block',
        background: colors.bgSection,
        padding: 16,
        borderRadius: 8,
        margin: '1em 0',
        border: `1px solid ${colors.border}`,
      }}
    >
      <MatrixCanvas matrix={snapshot.matrix} cellSize={cellSize} colorFn={colorFn} />
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: colors.accent,
        }}
      >
        {progression.metadata.label}
      </div>
    </div>
  );
}
