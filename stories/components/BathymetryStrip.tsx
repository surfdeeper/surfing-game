import React, { useRef, useEffect } from 'react';
import { depthToColor } from '../../src/render/colorScales';

interface Snapshot {
  time: number;
  matrix: number[][];
  label: string;
}

interface BathymetryStripProps {
  /** Array of depth snapshots to display as a film strip */
  snapshots: Snapshot[];
  /** Cell size in pixels */
  cellSize?: number;
  /** Test ID for visual regression testing */
  testId: string;
}

function DepthCanvas({ matrix, cellSize = 20 }: { matrix: number[][]; cellSize?: number }) {
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
        const depth = matrix[row][col];
        ctx.fillStyle = depthToColor(depth);
        ctx.fillRect(col * cellSize, row * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }, [matrix, cellSize, height, width]);

  return (
    <canvas
      ref={canvasRef}
      width={width * cellSize}
      height={height * cellSize}
      style={{ borderRadius: 4 }}
    />
  );
}

export function BathymetryStrip({ snapshots, cellSize = 20, testId }: BathymetryStripProps) {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        padding: '1em 0',
      }}
    >
      {snapshots.map((snapshot, idx) => (
        <div key={idx} style={{ textAlign: 'center' }}>
          <DepthCanvas matrix={snapshot.matrix} cellSize={cellSize} />
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{snapshot.label}</div>
        </div>
      ))}
    </div>
  );
}

export function BathymetryPlayer({
  snapshots,
  cellSize = 24,
}: {
  snapshots: Snapshot[];
  cellSize?: number;
}) {
  // Static display with depth legend for bathymetry
  const snapshot = snapshots[0];
  if (!snapshot) return null;

  return (
    <div
      style={{
        display: 'inline-block',
        background: '#2e3440',
        padding: 16,
        borderRadius: 8,
        margin: '1em 0',
      }}
    >
      <DepthCanvas matrix={snapshot.matrix} cellSize={cellSize} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 12,
          fontSize: 12,
          color: '#888',
        }}
      >
        <span style={{ color: '#88c0d0' }}>{snapshot.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <span>Shore</span>
          <div
            style={{
              width: 80,
              height: 12,
              background:
                'linear-gradient(to right, rgb(194,178,128), rgb(135,206,235), rgb(30,144,178), rgb(0,51,102))',
              borderRadius: 2,
            }}
          />
          <span>Deep</span>
        </div>
      </div>
    </div>
  );
}
