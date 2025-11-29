import './DebugPanel.css';
import { Tooltip } from 'react-tooltip';

// Pure component - receives all data as props, rendered from game loop via requestAnimationFrame
export function DebugPanel({ setLullState, gameTime, displayWaves, foamCount, energyTransferCount, timeScale, onTimeScaleChange, toggles, onToggle, onSettingChange, fps, playerConfig, onPlayerConfigChange, aiMode, onAIModeChange }) {
  const sls = setLullState;
  const setWaves = displayWaves.filter(w => w.wave.type === 'set');
  const bgWaves = displayWaves.filter(w => w.wave.type === 'background');

  // Compute countdown timers (time remaining, not elapsed)
  // Use defaults of 0 if state fields are undefined (e.g., from old localStorage)
  const stateStartTime = sls.stateStartTime ?? 0;
  const lastWaveSpawnTime = sls.lastWaveSpawnTime ?? 0;
  const setDuration = sls.setDuration ?? 0;
  const nextWaveTime = sls.nextWaveTime ?? 0;

  const elapsedInState = (gameTime - stateStartTime) / 1000;
  const timeSinceLastWave = (gameTime - lastWaveSpawnTime) / 1000;

  // Countdown: time remaining until state/wave ends (clamped to 0)
  const stateTimeRemaining = Math.max(0, setDuration - elapsedInState);
  const waveTimeRemaining = Math.max(0, nextWaveTime - timeSinceLastWave);

  // Calculate progress values for circular indicators (clamped to valid range)
  const waveTimerProgress = nextWaveTime > 0 ? Math.min(Math.max(timeSinceLastWave / nextWaveTime, 0), 1) : 0;
  const setTimerProgress = setDuration > 0 ? Math.min(Math.max(elapsedInState / setDuration, 0), 1) : 0;

  return (
    <div className="debug-panel">
      <FPSCounter fps={fps} />
      <Tooltip id="debug-tooltip" place="left" />
      <Section title="View Layers">
        <p className="layer-order-note">Order: source → transfer → foam (top to bottom here; back to front on canvas).</p>
        <Toggle
          label="Bathymetry"
          checked={toggles.showBathymetry}
          onChange={() => onToggle('showBathymetry')}
          hotkey="B"
        />
        <Toggle
          label="Set Waves"
          checked={toggles.showSetWaves}
          onChange={() => onToggle('showSetWaves')}
          hotkey="S"
        />
        <Toggle
          label="Background"
          checked={toggles.showBackgroundWaves}
          onChange={() => onToggle('showBackgroundWaves')}
          hotkey="G"
        />
        <Toggle
          label="Energy Field (source)"
          checked={toggles.showEnergyField}
          onChange={() => onToggle('showEnergyField')}
          hotkey="E"
        />
        <Toggle
          label="Energy Transfer Samples"
          checked={toggles.showFoamSamples}
          onChange={() => onToggle('showFoamSamples')}
          hotkey="D"
        />
        <Toggle
          label="Energy Transfer (contours)"
          checked={toggles.showFoamZones}
          onChange={() => onToggle('showFoamZones')}
          hotkey="F"
        />
        <Toggle
          label="Player"
          checked={toggles.showPlayer}
          onChange={() => onToggle('showPlayer')}
          hotkey="P"
        />
        {toggles.showPlayer && (
          <Toggle
            label="AI Player"
            checked={toggles.showAIPlayer}
            onChange={() => onToggle('showAIPlayer')}
            hotkey="A"
          />
        )}
        {toggles.showPlayer && toggles.showAIPlayer && (
          <Toggle
            label="AI Mode"
            checked={true}
            onChange={onAIModeChange}
            hotkey="M"
            text={aiMode}
          />
        )}
      </Section>

      <Section title="Foam Dispersion">
        <Toggle
          label="Option A (expand)"
          checked={toggles.showFoamOptionA}
          onChange={() => onToggle('showFoamOptionA')}
          hotkey="1"
        />
        <Toggle
          label="Option B (blur)"
          checked={toggles.showFoamOptionB}
          onChange={() => onToggle('showFoamOptionB')}
          hotkey="2"
        />
        <Toggle
          label="Option C (radius)"
          checked={toggles.showFoamOptionC}
          onChange={() => onToggle('showFoamOptionC')}
          hotkey="3"
        />
      </Section>

      <Section title="Playback">
        <Select
          label="Speed"
          value={timeScale}
          options={[1, 2, 4, 8]}
          onChange={onTimeScaleChange}
          hotkey="T"
        />
        <Slider
          label="Depth Damping"
          tooltip="Energy decay in shallow water. Higher = faster fade before shore."
          value={toggles.depthDampingCoefficient}
          min={0}
          max={0.2}
          step={0.01}
          onChange={(v) => onSettingChange('depthDampingCoefficient', v)}
        />
        <Slider
          label="Damping Exponent"
          tooltip="How sharply decay ramps as depth→0 (higher = more cliff near shore)."
          value={toggles.depthDampingExponent}
          min={1}
          max={4}
          step={0.1}
          onChange={(v) => onSettingChange('depthDampingExponent', v)}
        />
      </Section>

      <Section title="Set/Lull State">
        <ReadOnly label="State" value={sls.setState} />
        <ReadOnly label="Waves" value={`${sls.wavesSpawned}/${sls.currentSetWaves}`} />
        {sls.setState === 'LULL' ? (
          <CountdownReadOnly
            label="Lull ends in"
            remaining={stateTimeRemaining}
            total={setDuration}
            progress={setTimerProgress}
            color="#e8a644"
          />
        ) : (
          <ReadOnly label="Waves left" value={sls.currentSetWaves - sls.wavesSpawned} />
        )}
        <CountdownReadOnly
          label="Next wave in"
          remaining={waveTimeRemaining}
          total={nextWaveTime}
          progress={waveTimerProgress}
          color="#4a90b8"
        />
      </Section>

      <Section title="Wave Status">
        <ReadOnly label="Set Waves" value={setWaves.length} />
        <ReadOnly label="Background" value={bgWaves.length} />
        <ReadOnly label="Energy Transfer Cells" value={energyTransferCount} />
        <ReadOnly label="Foam Cells" value={foamCount} />
      </Section>

      {setWaves.length > 0 && (
        <Section title="Set Wave Details">
          {setWaves.map(({ wave, progress, travelDuration }) => {
            const timeToShore = ((1 - progress) * travelDuration / 1000).toFixed(1);
            const ampPercent = Math.round(wave.amplitude * 100);
            return (
              <div key={wave.id} className="wave-item">
                <span className="wave-label">{ampPercent}% amp, {timeToShore}s</span>
                <div className="wave-progress-bar">
                  <div className="wave-progress-fill" style={{ width: `${(1 - progress) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {toggles.showPlayer && playerConfig && (
        <Section title="Player Tuning">
          <Slider
            label="Water Speed"
            tooltip="Target paddle speed in calm water (px/s). This is the velocity you'll reach when holding a direction."
            value={playerConfig.waterSpeed}
            min={10}
            max={60}
            onChange={(v) => onPlayerConfigChange('waterSpeed', v)}
          />
          <Slider
            label="Foam Speed"
            tooltip="Target paddle speed when in whitewater (px/s). Lower than water speed because turbulence slows you down."
            value={playerConfig.foamSpeed}
            min={10}
            max={60}
            onChange={(v) => onPlayerConfigChange('foamSpeed', v)}
          />
          <Slider
            label="Push Force"
            tooltip="Velocity added toward shore when in foam (px/s). At max intensity foam, this is how fast you drift shoreward."
            value={playerConfig.maxPushForce}
            min={10}
            max={100}
            onChange={(v) => onPlayerConfigChange('maxPushForce', v)}
          />
          <Slider
            label="Foam Penalty"
            tooltip="Extra speed reduction in foam (%). Combined with lower Foam Speed, makes whitewater feel sluggish."
            value={Math.round(playerConfig.foamSpeedPenalty * 100)}
            min={0}
            max={80}
            suffix="%"
            onChange={(v) => onPlayerConfigChange('foamSpeedPenalty', v / 100)}
          />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <details open>
      <summary>{title}</summary>
      <div className="section-content">{children}</div>
    </details>
  );
}

function Toggle({ label, checked, onChange, hotkey, text }) {
  return (
    <label className="control toggle-control">
      <span className="label">
        <kbd>{hotkey}</kbd> {label}
      </span>
      <button
        className={`toggle-btn ${checked ? 'active' : ''}`}
        onClick={onChange}
      >
        {text ?? (checked ? 'ON' : 'OFF')}
      </button>
    </label>
  );
}

function Select({ label, value, options, onChange, hotkey }) {
  const cycleValue = () => {
    const currentIndex = options.indexOf(value);
    const nextIndex = (currentIndex + 1) % options.length;
    onChange(options[nextIndex]);
  };

  return (
    <label className="control">
      <span className="label">
        <kbd>{hotkey}</kbd> {label}
      </span>
      <button
        className={`toggle-btn ${value > 1 ? 'active' : ''}`}
        style={value > 1 ? { backgroundColor: '#64b464' } : {}}
        onClick={cycleValue}
      >
        {value}x
      </button>
    </label>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div className="control read-only">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}

function FPSCounter({ fps }) {
  // Color coding: green >= 55, yellow >= 30, red < 30
  let color = '#44e8a6';  // green
  let status = 'good';
  if (fps < 55) {
    color = '#e8c444';  // yellow
    status = 'ok';
  }
  if (fps < 30) {
    color = '#e84444';  // red
    status = 'bad';
  }

  return (
    <div className={`fps-counter fps-${status}`} style={{ color }}>
      {Math.round(fps)} FPS
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, suffix = '', tooltip }) {
  const decimals = step < 0.1 ? 2 : 1;
  return (
    <div className="slider-control">
      <div className="slider-header">
        <span className="label">
          {label}
          {tooltip && (
            <span
              className="tooltip-trigger"
              data-tooltip-id="debug-tooltip"
              data-tooltip-content={tooltip}
            >
              ?
            </span>
          )}
        </span>
        <span className="slider-value">{Number(value).toFixed(decimals)}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
      />
    </div>
  );
}

function CircularProgress({ progress, size = 20, strokeWidth = 3, color }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="circular-progress">
      <circle
        className="circular-progress-bg"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <circle
        className="circular-progress-fill"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function CountdownReadOnly({ label, remaining, total, progress, color }) {
  return (
    <div className="control read-only timer-control">
      <span className="label">{label}</span>
      <span className="timer-value">
        <CircularProgress progress={progress} color={color} />
        <span className="value">{remaining.toFixed(1)}s / {total.toFixed(1)}s</span>
      </span>
    </div>
  );
}
