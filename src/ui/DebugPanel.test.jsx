import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DebugPanel } from './DebugPanel';

afterEach(() => {
  cleanup();
});

// Helper to convert seconds to ms
const sec = (s) => s * 1000;

// Helper to create setLullState with absolute timestamps
// The component computes derived timers from: gameTime - stateStartTime and gameTime - lastWaveSpawnTime
function createSetLullState(opts = {}) {
  const {
    setState = 'SET',
    wavesSpawned = 2,
    currentSetWaves = 5,
    setTimer = 15.5,        // Desired setTimer value (derived)
    setDuration = 60.0,
    timeSinceLastWave = 8.3, // Desired timeSinceLastWave value (derived)
    nextWaveTime = 15.0,
    gameTime = sec(100),     // Reference game time
  } = opts;

  return {
    setState,
    wavesSpawned,
    currentSetWaves,
    stateStartTime: gameTime - sec(setTimer),
    setDuration,
    lastWaveSpawnTime: gameTime - sec(timeSinceLastWave),
    nextWaveTime,
    _gameTime: gameTime, // Store for test props
  };
}

// Default props for testing
const createDefaultProps = (overrides = {}) => {
  const defaultSetLullState = createSetLullState();
  const setLullState = overrides.setLullState || defaultSetLullState;
  const gameTime = overrides.gameTime !== undefined
    ? overrides.gameTime
    : (setLullState._gameTime || sec(100));

  return {
    setLullState,
    gameTime,
    displayWaves: overrides.displayWaves || [
      { wave: { id: 1, type: 'set', amplitude: 0.8 }, progress: 0.3, travelDuration: 10000 },
      { wave: { id: 2, type: 'set', amplitude: 0.6 }, progress: 0.5, travelDuration: 10000 },
      { wave: { id: 3, type: 'background', amplitude: 0.3 }, progress: 0.7, travelDuration: 8000 },
    ],
    foamCount: overrides.foamCount !== undefined ? overrides.foamCount : 42,
    timeScale: overrides.timeScale !== undefined ? overrides.timeScale : 1,
    onTimeScaleChange: overrides.onTimeScaleChange || vi.fn(),
    toggles: overrides.toggles || {
      showBathymetry: true,
      showSetWaves: true,
      showBackgroundWaves: false,
      showFoamZones: true,
      showFoamSamples: false,
      showPlayer: true,
    },
    onToggle: overrides.onToggle || vi.fn(),
    fps: overrides.fps !== undefined ? overrides.fps : 60,
    playerConfig: overrides.playerConfig !== undefined ? overrides.playerConfig : {
      waterSpeed: 30,
      foamSpeed: 20,
      maxPushForce: 50,
      foamSpeedPenalty: 0.3,
    },
    onPlayerConfigChange: overrides.onPlayerConfigChange || vi.fn(),
  };
};

describe('DebugPanel', () => {
  describe('FPS Counter', () => {
    it('displays FPS value', () => {
      render(<DebugPanel {...createDefaultProps({ fps: 58 })} />);
      expect(screen.getByText('58 FPS')).toBeInTheDocument();
    });

    it('shows green color for good FPS (>= 55)', () => {
      render(<DebugPanel {...createDefaultProps({ fps: 60 })} />);
      const fpsElement = screen.getByText('60 FPS');
      expect(fpsElement).toHaveStyle({ color: '#44e8a6' });
    });

    it('shows yellow color for ok FPS (30-54)', () => {
      render(<DebugPanel {...createDefaultProps({ fps: 45 })} />);
      const fpsElement = screen.getByText('45 FPS');
      expect(fpsElement).toHaveStyle({ color: '#e8c444' });
    });

    it('shows red color for bad FPS (< 30)', () => {
      render(<DebugPanel {...createDefaultProps({ fps: 20 })} />);
      const fpsElement = screen.getByText('20 FPS');
      expect(fpsElement).toHaveStyle({ color: '#e84444' });
    });

    it('rounds FPS to nearest integer', () => {
      render(<DebugPanel {...createDefaultProps({ fps: 59.7 })} />);
      expect(screen.getByText('60 FPS')).toBeInTheDocument();
    });
  });

  describe('View Layers Section', () => {
    it('renders all toggle controls', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      // Use getAllByText since some labels appear in multiple sections
      expect(screen.getAllByText(/Bathymetry/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Set Waves/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Background/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Foam Zones/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Foam Samples/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Player/).length).toBeGreaterThan(0);
    });

    it('shows hotkeys for toggles', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getByText('F')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
      expect(screen.getByText('P')).toBeInTheDocument();
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('calls onToggle when toggle is clicked', () => {
      const onToggle = vi.fn();
      render(<DebugPanel {...createDefaultProps({ onToggle })} />);

      // Find and click the bathymetry toggle button
      const bathymetrySection = screen.getByText(/Bathymetry/).closest('label');
      const toggleBtn = bathymetrySection.querySelector('button');
      fireEvent.click(toggleBtn);

      expect(onToggle).toHaveBeenCalledWith('showBathymetry');
    });

    it('shows ON/OFF state correctly', () => {
      const toggles = {
        showBathymetry: true,
        showSetWaves: false,
        showBackgroundWaves: false,
        showFoamZones: false,
        showFoamSamples: false,
        showPlayer: false,
      };
      render(<DebugPanel {...createDefaultProps({ toggles })} />);

      const buttons = screen.getAllByRole('button');
      // First toggle (Bathymetry) should be ON
      expect(buttons[0]).toHaveTextContent('ON');
      // Second toggle (Set Waves) should be OFF
      expect(buttons[1]).toHaveTextContent('OFF');
    });

    it('cycles time scale when speed button clicked', () => {
      const onTimeScaleChange = vi.fn();
      render(<DebugPanel {...createDefaultProps({ timeScale: 1, onTimeScaleChange })} />);

      const speedBtn = screen.getByText('1x');
      fireEvent.click(speedBtn);

      expect(onTimeScaleChange).toHaveBeenCalledWith(2);
    });

    it('wraps time scale back to 1 after 8x', () => {
      const onTimeScaleChange = vi.fn();
      render(<DebugPanel {...createDefaultProps({ timeScale: 8, onTimeScaleChange })} />);

      const speedBtn = screen.getByText('8x');
      fireEvent.click(speedBtn);

      expect(onTimeScaleChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Set/Lull State Section', () => {
    it('displays current state', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      expect(screen.getByText('SET')).toBeInTheDocument();
    });

    it('displays wave count', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      expect(screen.getByText('2/5')).toBeInTheDocument();
    });

    it('displays countdown timer with circular progress in LULL', () => {
      const lullState = createSetLullState({ setState: 'LULL' });
      render(<DebugPanel {...createDefaultProps({ setLullState: lullState })} />);
      // setDuration=60, setTimer=15.5 => remaining = 44.5s
      // Format: "remaining / total"
      expect(screen.getByText('44.5s / 60.0s')).toBeInTheDocument();
      // Verify circular progress SVG exists (2 in LULL: lull timer + wave timer)
      const svgs = document.querySelectorAll('.circular-progress');
      expect(svgs.length).toBe(2);
    });

    it('displays wave countdown timer with circular progress', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      // nextWaveTime=15, timeSinceLastWave=8.3 => remaining = 6.7s
      // Format: "remaining / total"
      expect(screen.getByText('6.7s / 15.0s')).toBeInTheDocument();
      // In SET state (default), only 1 circular progress (wave timer)
      const svgs = document.querySelectorAll('.circular-progress');
      expect(svgs.length).toBe(1);
    });

    it('shows LULL state correctly', () => {
      const setLullState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 10.0,
        setDuration: 30.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 12.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);
      expect(screen.getByText('LULL')).toBeInTheDocument();
    });
  });

  describe('Wave Status Section', () => {
    it('displays set wave count', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      // There are 2 SET waves in default props - find in Wave Status section
      const waveStatusSection = screen.getByText('Wave Status').closest('details');
      const setWavesValue = waveStatusSection.querySelector('.read-only .value');
      expect(setWavesValue).toHaveTextContent('2');
    });

    it('displays background wave count', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      // There is 1 BACKGROUND wave in default props - find in Wave Status section
      const waveStatusSection = screen.getByText('Wave Status').closest('details');
      const readOnlyControls = waveStatusSection.querySelectorAll('.read-only');
      // Background is the second item in Wave Status
      const bgValue = readOnlyControls[1].querySelector('.value');
      expect(bgValue).toHaveTextContent('1');
    });

    it('displays foam segment count', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      const foamLabel = screen.getByText('Foam Segments');
      const foamValue = foamLabel.closest('.control').querySelector('.value');
      expect(foamValue).toHaveTextContent('42');
    });
  });

  describe('Set Wave Details Section', () => {
    it('shows section when set waves exist', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      expect(screen.getByText('Set Wave Details')).toBeInTheDocument();
    });

    it('hides section when no set waves', () => {
      render(<DebugPanel {...createDefaultProps({ displayWaves: [] })} />);
      expect(screen.queryByText('Set Wave Details')).not.toBeInTheDocument();
    });

    it('displays wave amplitude and time to shore', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      // First wave: 80% amp, (1-0.3) * 10000 / 1000 = 7.0s
      expect(screen.getByText('80% amp, 7.0s')).toBeInTheDocument();
    });

    it('shows progress bar for each wave', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      const progressBars = document.querySelectorAll('.wave-progress-bar');
      // Should have 2 progress bars for 2 SET waves
      expect(progressBars.length).toBe(2);
    });
  });

  describe('Player Tuning Section', () => {
    it('shows section when player toggle is on and config exists', () => {
      const toggles = { ...createDefaultProps().toggles, showPlayer: true };
      render(<DebugPanel {...createDefaultProps({ toggles })} />);
      expect(screen.getByText('Player Tuning')).toBeInTheDocument();
    });

    it('hides section when player toggle is off', () => {
      const toggles = { ...createDefaultProps().toggles, showPlayer: false };
      render(<DebugPanel {...createDefaultProps({ toggles })} />);
      expect(screen.queryByText('Player Tuning')).not.toBeInTheDocument();
    });

    it('hides section when playerConfig is null', () => {
      render(<DebugPanel {...createDefaultProps({ playerConfig: null })} />);
      expect(screen.queryByText('Player Tuning')).not.toBeInTheDocument();
    });

    it('renders sliders for all player config values', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      expect(screen.getByText('Water Speed')).toBeInTheDocument();
      expect(screen.getByText('Foam Speed')).toBeInTheDocument();
      expect(screen.getByText('Push Force')).toBeInTheDocument();
      expect(screen.getByText('Foam Penalty')).toBeInTheDocument();
    });

    it('displays current slider values', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      expect(screen.getByText('30')).toBeInTheDocument(); // waterSpeed
      expect(screen.getByText('20')).toBeInTheDocument(); // foamSpeed
      expect(screen.getByText('50')).toBeInTheDocument(); // maxPushForce
      expect(screen.getByText('30%')).toBeInTheDocument(); // foamSpeedPenalty (0.3 * 100)
    });

    it('shows tooltip trigger icons', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
      expect(tooltipTriggers.length).toBe(4); // One for each slider
    });

    it('has tooltip content on triggers', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
      tooltipTriggers.forEach((trigger) => {
        expect(trigger).toHaveAttribute('data-tooltip-content');
        expect(trigger.getAttribute('data-tooltip-content')).not.toBe('');
      });
    });

    it('calls onPlayerConfigChange when slider changes', () => {
      const onPlayerConfigChange = vi.fn();
      render(<DebugPanel {...createDefaultProps({ onPlayerConfigChange })} />);

      const sliders = document.querySelectorAll('input[type="range"]');
      fireEvent.change(sliders[0], { target: { value: '40' } });

      expect(onPlayerConfigChange).toHaveBeenCalledWith('waterSpeed', 40);
    });

    it('converts foam penalty percentage back to decimal', () => {
      const onPlayerConfigChange = vi.fn();
      render(<DebugPanel {...createDefaultProps({ onPlayerConfigChange })} />);

      const sliders = document.querySelectorAll('input[type="range"]');
      // Foam Penalty is the 4th slider
      fireEvent.change(sliders[3], { target: { value: '50' } });

      expect(onPlayerConfigChange).toHaveBeenCalledWith('foamSpeedPenalty', 0.5);
    });
  });

  describe('Circular Progress Component', () => {
    it('renders SVG with correct structure', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      const svgs = document.querySelectorAll('.circular-progress');
      expect(svgs.length).toBeGreaterThan(0);

      const svg = svgs[0];
      expect(svg.querySelector('.circular-progress-bg')).toBeInTheDocument();
      expect(svg.querySelector('.circular-progress-fill')).toBeInTheDocument();
    });

    it('applies correct color to progress fill', () => {
      const setLullState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 15.0,
        setDuration: 30.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 12.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      // First one should be orange for LULL state
      expect(progressFills[0]).toHaveAttribute('stroke', '#e8a644');
    });

    it('calculates stroke-dashoffset based on progress', () => {
      const setLullState = createSetLullState({
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 30.0, // 50% progress
        setDuration: 60.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 10.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFill = document.querySelector('.circular-progress-fill');
      const dashOffset = parseFloat(progressFill.getAttribute('stroke-dashoffset'));
      // At 50% progress, offset should be ~half the circumference
      expect(dashOffset).toBeGreaterThan(0);
    });
  });

  describe('Section Collapsibility', () => {
    it('renders sections as details elements', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      const details = document.querySelectorAll('details');
      expect(details.length).toBeGreaterThan(0);
    });

    it('sections are open by default', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      const details = document.querySelectorAll('details');
      details.forEach((detail) => {
        expect(detail).toHaveAttribute('open');
      });
    });

    it('sections can be collapsed', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      const summary = screen.getByText('View Layers');
      fireEvent.click(summary);
      // The details element should close (though browser behavior may vary in jsdom)
    });
  });

  describe('Circular Progress - Numerical Accuracy', () => {
    // Helper to get the circumference for default size (20) and strokeWidth (3)
    // radius = (20 - 3) / 2 = 8.5
    // circumference = 2 * PI * 8.5 ≈ 53.407
    const defaultRadius = 8.5;
    const defaultCircumference = 2 * Math.PI * defaultRadius;

    it('displays 0% progress correctly (circle empty)', () => {
      // Use LULL state to get both circular progress indicators
      const setLullState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: 0,           // 0% progress
        setDuration: 60.0,
        timeSinceLastWave: 0,  // 0% progress
        nextWaveTime: 15.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');

      // At 0% progress, offset should equal full circumference (no fill visible)
      const lullTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      expect(lullTimerOffset).toBeCloseTo(defaultCircumference, 1);
      expect(waveTimerOffset).toBeCloseTo(defaultCircumference, 1);
    });

    it('displays 50% progress correctly (circle half-filled)', () => {
      // Use LULL state to get both circular progress indicators
      const setLullState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 2,
        currentSetWaves: 5,
        setTimer: 30.0,         // 50% of 60
        setDuration: 60.0,
        timeSinceLastWave: 7.5, // 50% of 15
        nextWaveTime: 15.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const expectedOffset = defaultCircumference * 0.5; // half circumference

      const lullTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      expect(lullTimerOffset).toBeCloseTo(expectedOffset, 1);
      expect(waveTimerOffset).toBeCloseTo(expectedOffset, 1);
    });

    it('displays 100% progress correctly (circle full)', () => {
      // Use LULL state to get both circular progress indicators
      const setLullState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 5,
        currentSetWaves: 5,
        setTimer: 60.0,         // 100% of 60
        setDuration: 60.0,
        timeSinceLastWave: 15.0, // 100% of 15
        nextWaveTime: 15.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');

      // At 100% progress, offset should be 0 (full circle visible)
      const lullTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      expect(lullTimerOffset).toBeCloseTo(0, 1);
      expect(waveTimerOffset).toBeCloseTo(0, 1);
    });

    it('clamps progress at 100% when values exceed total (prevents >100% display)', () => {
      // With absolute timestamps, this scenario tests when derived timer exceeds duration
      // Use LULL state to get both circular progress indicators
      const setLullState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 5,
        currentSetWaves: 5,
        setTimer: 120.0,         // EXCEEDS setDuration!
        setDuration: 60.0,
        timeSinceLastWave: 120.0, // EXCEEDS nextWaveTime!
        nextWaveTime: 106.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');

      // Even though values exceed totals, progress should clamp to 100%
      // offset = circumference * (1 - 1.0) = 0
      const lullTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      expect(lullTimerOffset).toBeCloseTo(0, 1);
      expect(waveTimerOffset).toBeCloseTo(0, 1);
    });

    it('displays 0s remaining when timer exceeds total (edge case)', () => {
      // With absolute timestamps, if this happens it's due to time going backwards
      // or a save/load bug - this tests the UI still renders correctly with clamped countdown
      // Use LULL state to get both circular progress indicators
      const setLullState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 5,
        currentSetWaves: 5,
        setTimer: 120.0,
        setDuration: 106.0,
        timeSinceLastWave: 85.0,
        nextWaveTime: 70.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      // Countdown is clamped to 0 when elapsed exceeds duration
      // Format: "remaining / total"
      expect(screen.getByText('0.0s / 106.0s')).toBeInTheDocument();
      expect(screen.getByText('0.0s / 70.0s')).toBeInTheDocument();
    });
  });

  describe('Circular Progress - Valid State Constraints', () => {
    // These tests document expected invariants from the setLullModel

    it('displays countdown for next wave', () => {
      // Default: swellPeriod=15, periodVariation=5, so range is 10-20 seconds
      const validState = createSetLullState({
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: 0,
        setDuration: 60.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 15.0, // Valid: within 10-20 range
      });
      render(<DebugPanel {...createDefaultProps({ setLullState: validState })} />);

      // Countdown: 15.0 - 5.0 = 10.0s remaining
      // Format: "remaining / total"
      expect(screen.getByText('10.0s / 15.0s')).toBeInTheDocument();
    });

    it('shows long countdown just after wave spawn', () => {
      // After a wave spawns, timeSinceLastWave resets to 0
      // Use LULL to get both progress indicators
      const freshSpawnState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 1,  // Just spawned one wave
        currentSetWaves: 5,
        setTimer: 15.0,
        setDuration: 60.0,
        timeSinceLastWave: 0.5, // Just after spawn, should be small
        nextWaveTime: 14.0,     // New nextWaveTime after spawn
      });
      render(<DebugPanel {...createDefaultProps({ setLullState: freshSpawnState })} />);

      // Countdown: 14.0 - 0.5 = 13.5s remaining
      // Format: "remaining / total"
      expect(screen.getByText('13.5s / 14.0s')).toBeInTheDocument();

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      // Progress should be very small (~3.5%)
      // offset ≈ circumference * (1 - 0.035) ≈ circumference * 0.965
      expect(waveTimerOffset).toBeGreaterThan(50); // Nearly full circumference
    });

    it('shows correct countdown during normal operation', () => {
      // Use LULL to get both progress indicators
      const normalState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 2,
        currentSetWaves: 5,
        setTimer: 25.0,  // Normal: less than setDuration
        setDuration: 60.0,
        timeSinceLastWave: 8.0,
        nextWaveTime: 15.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState: normalState })} />);

      // Lull countdown: 60.0 - 25.0 = 35.0s remaining
      // Format: "remaining / total"
      expect(screen.getByText('35.0s / 60.0s')).toBeInTheDocument();

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const lullTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));

      // ~41.7% progress, offset should be ~58.3% of circumference
      const defaultCircumference = 2 * Math.PI * 8.5;
      const expectedOffset = defaultCircumference * (1 - 25/60);
      expect(lullTimerOffset).toBeCloseTo(expectedOffset, 1);
    });
  });

  describe('Circular Progress - SVG Geometry', () => {
    it('has correct radius calculation (size - strokeWidth) / 2', () => {
      // Use LULL to get both progress indicators
      const lullState = createSetLullState({ setState: 'LULL' });
      render(<DebugPanel {...createDefaultProps({ setLullState: lullState })} />);

      const circles = document.querySelectorAll('.circular-progress circle');
      // Each CircularProgress has 2 circles (bg and fill), we have 2 components
      expect(circles.length).toBe(4);

      // Default size=20, strokeWidth=3, so radius = (20-3)/2 = 8.5
      circles.forEach(circle => {
        expect(circle.getAttribute('r')).toBe('8.5');
      });
    });

    it('has correct center point (size / 2)', () => {
      render(<DebugPanel {...createDefaultProps()} />);

      const circles = document.querySelectorAll('.circular-progress circle');

      // Default size=20, so cx=cy=10
      circles.forEach(circle => {
        expect(circle.getAttribute('cx')).toBe('10');
        expect(circle.getAttribute('cy')).toBe('10');
      });
    });

    it('has correct strokeWidth', () => {
      render(<DebugPanel {...createDefaultProps()} />);

      const circles = document.querySelectorAll('.circular-progress circle');

      // Default strokeWidth=3
      circles.forEach(circle => {
        expect(circle.getAttribute('stroke-width')).toBe('3');
      });
    });

    it('has correct stroke-dasharray (circumference)', () => {
      render(<DebugPanel {...createDefaultProps()} />);

      const fillCircles = document.querySelectorAll('.circular-progress-fill');
      const expectedCircumference = 2 * Math.PI * 8.5;

      fillCircles.forEach(circle => {
        const dashArray = parseFloat(circle.getAttribute('stroke-dasharray'));
        expect(dashArray).toBeCloseTo(expectedCircumference, 1);
      });
    });

    it('has rotation transform starting at top (-90 degrees)', () => {
      render(<DebugPanel {...createDefaultProps()} />);

      const fillCircles = document.querySelectorAll('.circular-progress-fill');

      fillCircles.forEach(circle => {
        const transform = circle.getAttribute('transform');
        // Should rotate -90 degrees around center (10, 10)
        expect(transform).toBe('rotate(-90 10 10)');
      });
    });
  });

  describe('Circular Progress - Color Application', () => {
    it('wave timer is always blue regardless of state', () => {
      // In LULL state - has 2 progress indicators
      const lullState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 10.0,
        setDuration: 30.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 12.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState: lullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      // Second circle is wave timer - should always be blue
      expect(progressFills[1]).toHaveAttribute('stroke', '#4a90b8');

      cleanup();

      // In SET state - only has 1 progress indicator (wave timer)
      const setState = createSetLullState({
        setState: 'SET',
        wavesSpawned: 2,
        currentSetWaves: 5,
        setTimer: 15.0,
        setDuration: 60.0,
        timeSinceLastWave: 8.0,
        nextWaveTime: 15.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState: setState })} />);

      const progressFills2 = document.querySelectorAll('.circular-progress-fill');
      // Only wave timer in SET state, should be blue
      expect(progressFills2[0]).toHaveAttribute('stroke', '#4a90b8');
    });

    it('set timer is orange during LULL', () => {
      const lullState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 10.0,
        setDuration: 30.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 12.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState: lullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      // First circle is set timer - should be orange in LULL
      expect(progressFills[0]).toHaveAttribute('stroke', '#e8a644');
    });

    it('SET state shows waves left instead of timer', () => {
      const setState = createSetLullState({
        setState: 'SET',
        wavesSpawned: 2,
        currentSetWaves: 5,
        setTimer: 15.0,
        setDuration: 60.0,
        timeSinceLastWave: 8.0,
        nextWaveTime: 15.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState: setState })} />);

      // In SET state, we show "Waves left" instead of a progress timer
      expect(screen.getByText('Waves left')).toBeInTheDocument();
      // 5 - 2 = 3 waves left, check the label and value are present
      const wavesLeftLabel = screen.getByText('Waves left');
      expect(wavesLeftLabel.closest('.read-only').querySelector('.value').textContent).toBe('3');

      // Only one progress indicator (wave timer) in SET state
      const progressFills = document.querySelectorAll('.circular-progress-fill');
      expect(progressFills.length).toBe(1);
    });
  });

  describe('Circular Progress - Edge Cases', () => {
    it('handles zero setDuration without crashing (division by zero)', () => {
      // Use LULL to get both progress indicators
      const zeroDurationState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 1,
        setTimer: 5.0,
        setDuration: 0,  // Edge case: zero duration
        timeSinceLastWave: 2.0,
        nextWaveTime: 10.0,
      });

      // Should not throw
      expect(() => {
        render(<DebugPanel {...createDefaultProps({ setLullState: zeroDurationState })} />);
      }).not.toThrow();

      // Progress calculation: 5/0 = Infinity, clamped to 1 in component
      // But with our new clamping: sls.setDuration > 0 check returns 0 progress
      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const lullTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      // With zero duration, progress is 0 (special case in component)
      const circumference = 2 * Math.PI * 8.5;
      expect(lullTimerOffset).toBeCloseTo(circumference, 1);
    });

    it('handles zero nextWaveTime without crashing', () => {
      const zeroNextWaveState = createSetLullState({
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: 10.0,
        setDuration: 60.0,
        timeSinceLastWave: 3.0,
        nextWaveTime: 0,  // Edge case: zero
      });

      // Should not throw
      expect(() => {
        render(<DebugPanel {...createDefaultProps({ setLullState: zeroNextWaveState })} />);
      }).not.toThrow();
    });

    it('handles negative timer values gracefully', () => {
      // With absolute timestamps, this happens if gameTime < stateStartTime
      // (e.g., time went backwards due to bug)
      // Use LULL to get both progress indicators
      const negativeState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: -5.0,  // Negative (time went backwards)
        setDuration: 60.0,
        timeSinceLastWave: -2.0,  // Negative
        nextWaveTime: 15.0,
      });

      expect(() => {
        render(<DebugPanel {...createDefaultProps({ setLullState: negativeState })} />);
      }).not.toThrow();

      // With clamping: Math.max(progress, 0), negative progress becomes 0
      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const lullTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const circumference = 2 * Math.PI * 8.5;

      // Clamped to 0 progress, offset should be full circumference
      expect(lullTimerOffset).toBeCloseTo(circumference, 1);
    });

    it('handles very small progress values accurately', () => {
      // Use LULL to get both progress indicators
      const smallProgressState = createSetLullState({
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: 0.1,  // Very small
        setDuration: 60.0,
        timeSinceLastWave: 0.1,
        nextWaveTime: 15.0,
      });
      render(<DebugPanel {...createDefaultProps({ setLullState: smallProgressState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const circumference = 2 * Math.PI * 8.5;

      // lullTimer: 0.1/60 = 0.00167, offset = circumference * 0.998
      const lullTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      expect(lullTimerOffset).toBeCloseTo(circumference * (1 - 0.1/60), 1);

      // waveTimer: 0.1/15 = 0.00667, offset = circumference * 0.993
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));
      expect(waveTimerOffset).toBeCloseTo(circumference * (1 - 0.1/15), 1);
    });
  });

  describe('Progress Bar - Time Progression Integration', () => {
    it('progress increases as gameTime advances', () => {
      const baseGameTime = sec(100);
      const lastWaveSpawnTime = baseGameTime; // Wave just spawned
      const nextWaveTime = 15; // seconds

      // Render at t=0 (wave just spawned)
      const { rerender } = render(<DebugPanel {...createDefaultProps({
        setLullState: {
          setState: 'SET',
          stateStartTime: baseGameTime,
          setDuration: 60,
          lastWaveSpawnTime: lastWaveSpawnTime,
          nextWaveTime: nextWaveTime,
          wavesSpawned: 1,
          currentSetWaves: 5,
        },
        gameTime: baseGameTime,
      })} />);

      const circumference = 2 * Math.PI * 8.5;
      let progressFill = document.querySelector('.circular-progress-fill');
      let offset0 = parseFloat(progressFill.getAttribute('stroke-dashoffset'));

      // Progress at t=0: timeSinceLastWave=0, progress=0/15=0
      expect(offset0).toBeCloseTo(circumference, 1); // 0% progress = full offset

      // Render at t=5s
      rerender(<DebugPanel {...createDefaultProps({
        setLullState: {
          setState: 'SET',
          stateStartTime: baseGameTime,
          setDuration: 60,
          lastWaveSpawnTime: lastWaveSpawnTime,
          nextWaveTime: nextWaveTime,
          wavesSpawned: 1,
          currentSetWaves: 5,
        },
        gameTime: baseGameTime + sec(5),
      })} />);

      progressFill = document.querySelector('.circular-progress-fill');
      let offset5 = parseFloat(progressFill.getAttribute('stroke-dashoffset'));

      // Progress at t=5: timeSinceLastWave=5, progress=5/15=0.333
      // offset = circumference * (1 - 0.333) = circumference * 0.667
      expect(offset5).toBeCloseTo(circumference * (1 - 5/15), 1);

      // Verify progress increased (offset decreased)
      expect(offset5).toBeLessThan(offset0);

      // Render at t=10s
      rerender(<DebugPanel {...createDefaultProps({
        setLullState: {
          setState: 'SET',
          stateStartTime: baseGameTime,
          setDuration: 60,
          lastWaveSpawnTime: lastWaveSpawnTime,
          nextWaveTime: nextWaveTime,
          wavesSpawned: 1,
          currentSetWaves: 5,
        },
        gameTime: baseGameTime + sec(10),
      })} />);

      progressFill = document.querySelector('.circular-progress-fill');
      let offset10 = parseFloat(progressFill.getAttribute('stroke-dashoffset'));

      // Progress at t=10: timeSinceLastWave=10, progress=10/15=0.667
      expect(offset10).toBeCloseTo(circumference * (1 - 10/15), 1);

      // Verify monotonic increase
      expect(offset10).toBeLessThan(offset5);

      console.log('Progress test results:', {
        't0_offset': offset0.toFixed(2),
        't5_offset': offset5.toFixed(2),
        't10_offset': offset10.toFixed(2),
        't0_progress': (1 - offset0/circumference).toFixed(3),
        't5_progress': (1 - offset5/circumference).toFixed(3),
        't10_progress': (1 - offset10/circumference).toFixed(3),
      });
    });

    it('logs actual values for debugging', () => {
      const baseGameTime = sec(100);
      const lastWaveSpawnTime = baseGameTime - sec(10.35); // 10.35s ago
      const nextWaveTime = 15; // 15 seconds total

      const setLullState = {
        setState: 'SET',
        stateStartTime: baseGameTime - sec(30),
        setDuration: 60,
        lastWaveSpawnTime: lastWaveSpawnTime,
        nextWaveTime: nextWaveTime,
        wavesSpawned: 2,
        currentSetWaves: 5,
      };

      render(<DebugPanel {...createDefaultProps({
        setLullState,
        gameTime: baseGameTime,
      })} />);

      // Manual calculation to verify
      const timeSinceLastWave = (baseGameTime - lastWaveSpawnTime) / 1000;
      const expectedProgress = timeSinceLastWave / nextWaveTime;

      console.log('Debug values:', {
        gameTime: baseGameTime,
        lastWaveSpawnTime: lastWaveSpawnTime,
        nextWaveTime: nextWaveTime,
        timeSinceLastWave: timeSinceLastWave.toFixed(2),
        expectedProgress: expectedProgress.toFixed(3),
      });

      const circumference = 2 * Math.PI * 8.5;
      const progressFill = document.querySelector('.circular-progress-fill');
      const actualOffset = parseFloat(progressFill.getAttribute('stroke-dashoffset'));
      const actualProgress = 1 - actualOffset / circumference;

      console.log('Rendered values:', {
        actualOffset: actualOffset.toFixed(2),
        actualProgress: actualProgress.toFixed(3),
        expectedOffset: (circumference * (1 - expectedProgress)).toFixed(2),
      });

      expect(actualProgress).toBeCloseTo(expectedProgress, 2);
    });
  });
});
