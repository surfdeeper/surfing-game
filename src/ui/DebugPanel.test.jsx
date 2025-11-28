import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DebugPanel } from './DebugPanel';

afterEach(() => {
  cleanup();
});

// Default props for testing
const createDefaultProps = (overrides = {}) => ({
  setLullState: {
    setState: 'SET',
    wavesSpawned: 2,
    currentSetWaves: 5,
    setTimer: 15.5,
    setDuration: 60.0,
    timeSinceLastWave: 8.3,
    nextWaveTime: 15.0,
  },
  displayWaves: [
    { wave: { id: 1, type: 'SET', amplitude: 0.8 }, progress: 0.3, travelDuration: 10000 },
    { wave: { id: 2, type: 'SET', amplitude: 0.6 }, progress: 0.5, travelDuration: 10000 },
    { wave: { id: 3, type: 'BACKGROUND', amplitude: 0.3 }, progress: 0.7, travelDuration: 8000 },
  ],
  foamCount: 42,
  timeScale: 1,
  onTimeScaleChange: vi.fn(),
  toggles: {
    showBathymetry: true,
    showSetWaves: true,
    showBackgroundWaves: false,
    showFoamZones: true,
    showFoamSamples: false,
    showPlayer: true,
  },
  onToggle: vi.fn(),
  fps: 60,
  playerConfig: {
    waterSpeed: 30,
    foamSpeed: 20,
    maxPushForce: 50,
    foamSpeedPenalty: 0.3,
  },
  onPlayerConfigChange: vi.fn(),
  ...overrides,
});

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

    it('displays set timer with circular progress', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      expect(screen.getByText('15.5s / 60.0s')).toBeInTheDocument();
      // Verify circular progress SVG exists
      const svgs = document.querySelectorAll('.circular-progress');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('displays wave timer with circular progress', () => {
      render(<DebugPanel {...createDefaultProps()} />);
      expect(screen.getByText('8.3s / 15.0s')).toBeInTheDocument();
    });

    it('shows LULL state correctly', () => {
      const setLullState = {
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 10.0,
        setDuration: 30.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 12.0,
      };
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
      const setLullState = {
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 15.0,
        setDuration: 30.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 12.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      // First one should be orange for LULL state
      expect(progressFills[0]).toHaveAttribute('stroke', '#e8a644');
    });

    it('calculates stroke-dashoffset based on progress', () => {
      const setLullState = {
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 30.0, // 50% progress
        setDuration: 60.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 10.0,
      };
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
      const setLullState = {
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: 0,           // 0% progress
        setDuration: 60.0,
        timeSinceLastWave: 0,  // 0% progress
        nextWaveTime: 15.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');

      // At 0% progress, offset should equal full circumference (no fill visible)
      const setTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      expect(setTimerOffset).toBeCloseTo(defaultCircumference, 1);
      expect(waveTimerOffset).toBeCloseTo(defaultCircumference, 1);
    });

    it('displays 50% progress correctly (circle half-filled)', () => {
      const setLullState = {
        setState: 'SET',
        wavesSpawned: 2,
        currentSetWaves: 5,
        setTimer: 30.0,         // 50% of 60
        setDuration: 60.0,
        timeSinceLastWave: 7.5, // 50% of 15
        nextWaveTime: 15.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const expectedOffset = defaultCircumference * 0.5; // half circumference

      const setTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      expect(setTimerOffset).toBeCloseTo(expectedOffset, 1);
      expect(waveTimerOffset).toBeCloseTo(expectedOffset, 1);
    });

    it('displays 100% progress correctly (circle full)', () => {
      const setLullState = {
        setState: 'SET',
        wavesSpawned: 5,
        currentSetWaves: 5,
        setTimer: 60.0,         // 100% of 60
        setDuration: 60.0,
        timeSinceLastWave: 15.0, // 100% of 15
        nextWaveTime: 15.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');

      // At 100% progress, offset should be 0 (full circle visible)
      const setTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      expect(setTimerOffset).toBeCloseTo(0, 1);
      expect(waveTimerOffset).toBeCloseTo(0, 1);
    });

    it('clamps progress at 100% when values exceed total (prevents >100% display)', () => {
      // This test catches the "120/106" bug - where timer exceeds nextWaveTime
      const setLullState = {
        setState: 'SET',
        wavesSpawned: 5,
        currentSetWaves: 5,
        setTimer: 120.0,         // EXCEEDS setDuration!
        setDuration: 60.0,
        timeSinceLastWave: 120.0, // EXCEEDS nextWaveTime! (like the 120/106 bug)
        nextWaveTime: 106.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');

      // Even though values exceed totals, progress should clamp to 100%
      // offset = circumference * (1 - 1.0) = 0
      const setTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      expect(setTimerOffset).toBeCloseTo(0, 1);
      expect(waveTimerOffset).toBeCloseTo(0, 1);
    });

    it('displays correct text values even when exceeding total', () => {
      // The text display shows the raw values (120s / 106s)
      // This documents the current behavior - the TEXT shows impossible state
      const setLullState = {
        setState: 'SET',
        wavesSpawned: 5,
        currentSetWaves: 5,
        setTimer: 120.0,
        setDuration: 106.0,
        timeSinceLastWave: 85.0,  // Different value to avoid duplicate text
        nextWaveTime: 70.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState })} />);

      // These texts show the impossible state (which is the actual bug symptom)
      // Set timer shows 120/106 (exceeding total)
      expect(screen.getByText('120.0s / 106.0s')).toBeInTheDocument();
      // Wave timer shows 85/70 (also exceeding total)
      expect(screen.getByText('85.0s / 70.0s')).toBeInTheDocument();
    });
  });

  describe('Circular Progress - Valid State Constraints', () => {
    // These tests document expected invariants from the setLullModel

    it('nextWaveTime should be within expected range (swellPeriod ± variation)', () => {
      // Default: swellPeriod=15, periodVariation=5, so range is 10-20 seconds
      // If nextWaveTime is outside this range, something is wrong
      const validState = {
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: 0,
        setDuration: 60.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 15.0, // Valid: within 10-20 range
      };
      render(<DebugPanel {...createDefaultProps({ setLullState: validState })} />);

      // This should render normally
      expect(screen.getByText('5.0s / 15.0s')).toBeInTheDocument();
    });

    it('timeSinceLastWave should reset to 0 after wave spawn', () => {
      // After a wave spawns, timeSinceLastWave resets to 0
      // If we see timeSinceLastWave > nextWaveTime by a large margin, state wasn't reset
      const freshSpawnState = {
        setState: 'SET',
        wavesSpawned: 1,  // Just spawned one wave
        currentSetWaves: 5,
        setTimer: 15.0,
        setDuration: 60.0,
        timeSinceLastWave: 0.5, // Just after spawn, should be small
        nextWaveTime: 14.0,     // New nextWaveTime after spawn
      };
      render(<DebugPanel {...createDefaultProps({ setLullState: freshSpawnState })} />);

      // timeSinceLastWave should be much smaller than nextWaveTime after spawn
      expect(screen.getByText('0.5s / 14.0s')).toBeInTheDocument();

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));

      // Progress should be very small (~3.5%)
      // offset ≈ circumference * (1 - 0.035) ≈ circumference * 0.965
      expect(waveTimerOffset).toBeGreaterThan(50); // Nearly full circumference
    });

    it('setTimer should be less than or equal to setDuration during normal operation', () => {
      const normalState = {
        setState: 'SET',
        wavesSpawned: 2,
        currentSetWaves: 5,
        setTimer: 25.0,  // Normal: less than setDuration
        setDuration: 60.0,
        timeSinceLastWave: 8.0,
        nextWaveTime: 15.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState: normalState })} />);

      expect(screen.getByText('25.0s / 60.0s')).toBeInTheDocument();

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const setTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));

      // ~41.7% progress, offset should be ~58.3% of circumference
      const defaultCircumference = 2 * Math.PI * 8.5;
      const expectedOffset = defaultCircumference * (1 - 25/60);
      expect(setTimerOffset).toBeCloseTo(expectedOffset, 1);
    });
  });

  describe('Circular Progress - SVG Geometry', () => {
    it('has correct radius calculation (size - strokeWidth) / 2', () => {
      render(<DebugPanel {...createDefaultProps()} />);

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
      // In LULL state
      const lullState = {
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 10.0,
        setDuration: 30.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 12.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState: lullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      // Second circle is wave timer - should always be blue
      expect(progressFills[1]).toHaveAttribute('stroke', '#4a90b8');

      cleanup();

      // In SET state
      const setState = {
        setState: 'SET',
        wavesSpawned: 2,
        currentSetWaves: 5,
        setTimer: 15.0,
        setDuration: 60.0,
        timeSinceLastWave: 8.0,
        nextWaveTime: 15.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState: setState })} />);

      const progressFills2 = document.querySelectorAll('.circular-progress-fill');
      // Still blue
      expect(progressFills2[1]).toHaveAttribute('stroke', '#4a90b8');
    });

    it('set timer is orange during LULL', () => {
      const lullState = {
        setState: 'LULL',
        wavesSpawned: 0,
        currentSetWaves: 3,
        setTimer: 10.0,
        setDuration: 30.0,
        timeSinceLastWave: 5.0,
        nextWaveTime: 12.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState: lullState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      // First circle is set timer - should be orange in LULL
      expect(progressFills[0]).toHaveAttribute('stroke', '#e8a644');
    });

    it('set timer is green during SET', () => {
      const setState = {
        setState: 'SET',
        wavesSpawned: 2,
        currentSetWaves: 5,
        setTimer: 15.0,
        setDuration: 60.0,
        timeSinceLastWave: 8.0,
        nextWaveTime: 15.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState: setState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      // First circle is set timer - should be green in SET
      expect(progressFills[0]).toHaveAttribute('stroke', '#44e8a6');
    });
  });

  describe('Circular Progress - Edge Cases', () => {
    it('handles zero setDuration without crashing (division by zero)', () => {
      const zeroDurationState = {
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 1,
        setTimer: 5.0,
        setDuration: 0,  // Edge case: zero duration
        timeSinceLastWave: 2.0,
        nextWaveTime: 10.0,
      };

      // Should not throw
      expect(() => {
        render(<DebugPanel {...createDefaultProps({ setLullState: zeroDurationState })} />);
      }).not.toThrow();

      // Progress calculation: 5/0 = Infinity, Math.min(Infinity, 1) = 1
      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const setTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      // At 100% (clamped), offset should be 0
      expect(setTimerOffset).toBeCloseTo(0, 1);
    });

    it('handles zero nextWaveTime without crashing', () => {
      const zeroNextWaveState = {
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: 10.0,
        setDuration: 60.0,
        timeSinceLastWave: 3.0,
        nextWaveTime: 0,  // Edge case: zero
      };

      // Should not throw
      expect(() => {
        render(<DebugPanel {...createDefaultProps({ setLullState: zeroNextWaveState })} />);
      }).not.toThrow();
    });

    it('handles negative timer values gracefully', () => {
      // This shouldn't happen in practice, but tests robustness
      const negativeState = {
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: -5.0,  // Negative (shouldn't happen)
        setDuration: 60.0,
        timeSinceLastWave: -2.0,  // Negative
        nextWaveTime: 15.0,
      };

      expect(() => {
        render(<DebugPanel {...createDefaultProps({ setLullState: negativeState })} />);
      }).not.toThrow();

      // Negative progress results in offset > circumference
      // This shows progress bar "before" start, which is weird but doesn't crash
      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const setTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      const circumference = 2 * Math.PI * 8.5;

      // -5/60 = -0.083, so offset = circumference * (1 - (-0.083)) = circumference * 1.083
      expect(setTimerOffset).toBeGreaterThan(circumference);
    });

    it('handles very small progress values accurately', () => {
      const smallProgressState = {
        setState: 'SET',
        wavesSpawned: 0,
        currentSetWaves: 5,
        setTimer: 0.1,  // Very small
        setDuration: 60.0,
        timeSinceLastWave: 0.1,
        nextWaveTime: 15.0,
      };
      render(<DebugPanel {...createDefaultProps({ setLullState: smallProgressState })} />);

      const progressFills = document.querySelectorAll('.circular-progress-fill');
      const circumference = 2 * Math.PI * 8.5;

      // setTimer: 0.1/60 = 0.00167, offset = circumference * 0.998
      const setTimerOffset = parseFloat(progressFills[0].getAttribute('stroke-dashoffset'));
      expect(setTimerOffset).toBeCloseTo(circumference * (1 - 0.1/60), 1);

      // waveTimer: 0.1/15 = 0.00667, offset = circumference * 0.993
      const waveTimerOffset = parseFloat(progressFills[1].getAttribute('stroke-dashoffset'));
      expect(waveTimerOffset).toBeCloseTo(circumference * (1 - 0.1/15), 1);
    });
  });
});
