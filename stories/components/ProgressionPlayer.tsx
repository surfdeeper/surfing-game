import React, { useState, useEffect, useRef } from 'react';
import { energyToColor } from '../../src/render/colorScales';

interface Snapshot {
  time: number;
  matrix: number[][];
  label: string;
}

interface ProgressionPlayerProps {
  snapshots: Snapshot[];
  cellSize?: number;
  frameDelay?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

function MatrixCanvas({ matrix, cellSize = 24 }: { matrix: number[][]; cellSize?: number }) {
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
        const energy = matrix[row][col];
        ctx.fillStyle = energyToColor(energy);
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

export function ProgressionPlayer({
  snapshots,
  cellSize = 24,
  frameDelay = 500,
  autoPlay = true,
  loop = true,
}: ProgressionPlayerProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setFrameIndex((i) => {
        const next = i + 1;
        if (next >= snapshots.length) {
          if (loop) return 0;
          setPlaying(false);
          return i;
        }
        return next;
      });
    }, frameDelay / speed);

    return () => clearInterval(interval);
  }, [playing, speed, frameDelay, loop, snapshots.length]);

  const snapshot = snapshots[frameIndex];
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
      <MatrixCanvas matrix={snapshot.matrix} cellSize={cellSize} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 12,
          fontSize: 14,
        }}
      >
        <button
          onClick={() => setPlaying(!playing)}
          style={{
            background: '#4c566a',
            border: 'none',
            color: '#eee',
            padding: '6px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          {playing ? '⏸' : '▶️'}
        </button>
        <span style={{ color: '#88c0d0', minWidth: 80 }}>{snapshot.label}</span>
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          style={{
            background: '#4c566a',
            border: 'none',
            color: '#eee',
            padding: '4px 8px',
            borderRadius: 4,
          }}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
        </select>
        <input
          type="range"
          min={0}
          max={snapshots.length - 1}
          value={frameIndex}
          onChange={(e) => {
            setFrameIndex(Number(e.target.value));
            setPlaying(false);
          }}
          style={{ flex: 1, cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}

export function ProgressionStrip({
  snapshots,
  cellSize = 16,
  testId,
}: {
  snapshots: Snapshot[];
  cellSize?: number;
  testId: string;
}) {
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
          <MatrixCanvas matrix={snapshot.matrix} cellSize={cellSize} />
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{snapshot.label}</div>
        </div>
      ))}
    </div>
  );
}
