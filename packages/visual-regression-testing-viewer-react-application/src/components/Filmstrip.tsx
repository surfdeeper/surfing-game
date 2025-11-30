import React, { useRef, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

/**
 * Generic filmstrip component for displaying a series of canvas snapshots.
 * Delegates rendering to a provided function, enabling production code reuse.
 *
 * @example
 * // Using with a matrix-based renderer
 * <Filmstrip
 *   snapshots={PROGRESSION.snapshots}
 *   renderSnapshot={(snap, ctx, width, height) => renderMatrix(ctx, snap.matrix, energyToColor)}
 *   getLabel={(snap) => snap.label}
 *   canvasSize={{ width: 120, height: 120 }}
 *   testId="energy-strip"
 * />
 */

export interface FilmstripSnapshot {
  label: string;
}

export interface FilmstripProps<T extends FilmstripSnapshot> {
  /** Array of snapshots to render */
  snapshots: T[];
  /** Function to render a snapshot to a canvas context */
  renderSnapshot: (
    snapshot: T,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => void;
  /** Function to get the label for a snapshot (defaults to snapshot.label) */
  getLabel?: (snapshot: T) => string;
  /** Canvas dimensions for each frame */
  canvasSize?: { width: number; height: number };
  /** Test ID for visual regression testing */
  testId: string;
  /** Gap between frames in pixels */
  gap?: number;
}

interface SnapshotFrameProps<T extends FilmstripSnapshot> {
  snapshot: T;
  render: (snapshot: T, ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  label: string;
  size: { width: number; height: number };
  labelColor: string;
}

function SnapshotFrame<T extends FilmstripSnapshot>({
  snapshot,
  render,
  label,
  size,
  labelColor,
}: SnapshotFrameProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear before rendering
    ctx.clearRect(0, 0, size.width, size.height);

    // Delegate rendering to the provided function
    render(snapshot, ctx, size.width, size.height);
  }, [snapshot, render, size.width, size.height]);

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} width={size.width} height={size.height} style={{ borderRadius: 4 }} />
      <div style={{ fontSize: 11, color: labelColor, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function Filmstrip<T extends FilmstripSnapshot>({
  snapshots,
  renderSnapshot,
  getLabel = (snap) => snap.label,
  canvasSize = { width: 120, height: 120 },
  testId,
  gap = 8,
}: FilmstripProps<T>) {
  const { colors } = useTheme();

  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        gap,
        overflowX: 'auto',
        padding: '1em 0',
      }}
    >
      {snapshots.map((snapshot, idx) => (
        <SnapshotFrame
          key={idx}
          snapshot={snapshot}
          render={renderSnapshot}
          label={getLabel(snapshot)}
          size={canvasSize}
          labelColor={colors.textMuted}
        />
      ))}
    </div>
  );
}

/**
 * Utility to render a 2D matrix to a canvas using a color function.
 * Use this with Filmstrip for matrix-based visualizations.
 *
 * @example
 * renderSnapshot={(snap, ctx, w, h) =>
 *   renderMatrixToCanvas(ctx, snap.matrix, energyToColor, w, h)
 * }
 */
export function renderMatrixToCanvas(
  ctx: CanvasRenderingContext2D,
  matrix: number[][],
  colorFn: (value: number) => string,
  canvasWidth: number,
  canvasHeight: number
): void {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return;

  const cellWidth = canvasWidth / cols;
  const cellHeight = canvasHeight / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const value = matrix[row][col];
      ctx.fillStyle = colorFn(value);
      ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth - 1, cellHeight - 1);
    }
  }
}
