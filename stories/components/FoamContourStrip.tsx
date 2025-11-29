import React, { useRef, useEffect } from 'react';
import { extractLineSegments, boxBlur } from '../../src/render/marchingSquares';

interface FoamContourStripProps {
  /** Array of foam grid snapshots to display as a film strip */
  snapshots: {
    label: string;
    grid: Float32Array;
    width: number;
    height: number;
  }[];
  /** Canvas size for each frame */
  canvasSize?: number;
  /** Test ID for visual regression testing */
  testId: string;
  /** Contour thresholds to render */
  thresholds?: { value: number; color: string; lineWidth: number }[];
  /** Number of blur passes */
  blurPasses?: number;
  /** Background color */
  backgroundColor?: string;
}

const DEFAULT_THRESHOLDS = [
  { value: 0.15, color: 'rgba(255, 255, 255, 0.4)', lineWidth: 1 },
  { value: 0.3, color: 'rgba(255, 255, 255, 0.7)', lineWidth: 2 },
  { value: 0.5, color: 'rgba(255, 255, 255, 1.0)', lineWidth: 3 },
];

function FoamContourCanvas({
  grid,
  gridWidth,
  gridHeight,
  canvasSize = 120,
  thresholds = DEFAULT_THRESHOLDS,
  blurPasses = 1,
  backgroundColor = '#1a4a6e',
}: {
  grid: Float32Array;
  gridWidth: number;
  gridHeight: number;
  canvasSize?: number;
  thresholds?: { value: number; color: string; lineWidth: number }[];
  blurPasses?: number;
  backgroundColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply blur if needed
    const blurred = blurPasses > 0 ? boxBlur(grid, gridWidth, gridHeight, blurPasses) : grid;

    // Sort thresholds low to high so outer contours draw first
    const sortedThresholds = [...thresholds].sort((a, b) => a.value - b.value);

    // Draw contours for each threshold
    for (const { value, color, lineWidth } of sortedThresholds) {
      const segments = extractLineSegments(blurred, gridWidth, gridHeight, value);

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (const seg of segments) {
        const x1 = seg.x1 * canvas.width;
        const y1 = seg.y1 * canvas.height;
        const x2 = seg.x2 * canvas.width;
        const y2 = seg.y2 * canvas.height;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
  }, [grid, gridWidth, gridHeight, canvasSize, thresholds, blurPasses, backgroundColor]);

  return (
    <canvas ref={canvasRef} width={canvasSize} height={canvasSize} style={{ borderRadius: 4 }} />
  );
}

export function FoamContourStrip({
  snapshots,
  canvasSize = 120,
  testId,
  thresholds = DEFAULT_THRESHOLDS,
  blurPasses = 1,
  backgroundColor = '#1a4a6e',
}: FoamContourStripProps) {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '1em 0',
      }}
    >
      {snapshots.map((snapshot, idx) => (
        <div key={idx} style={{ textAlign: 'center' }}>
          <FoamContourCanvas
            grid={snapshot.grid}
            gridWidth={snapshot.width}
            gridHeight={snapshot.height}
            canvasSize={canvasSize}
            thresholds={thresholds}
            blurPasses={blurPasses}
            backgroundColor={backgroundColor}
          />
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{snapshot.label}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Generate test foam grid data for various scenarios
 */
