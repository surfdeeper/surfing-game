import './DebugPanel.css';

// Pure component - receives all data as props, rendered from game loop via requestAnimationFrame
export function DebugPanel({ setLullState, displayWaves, foamCount, timeScale, onTimeScaleChange, toggles, onToggle, fps, playerConfig, onPlayerConfigChange }) {
  const sls = setLullState;
  const setWaves = displayWaves.filter(w => w.wave.type === 'SET');
  const bgWaves = displayWaves.filter(w => w.wave.type === 'BACKGROUND');

  return (
    <div className="debug-panel">
      <FPSCounter fps={fps} />
      <Section title="View Layers">
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
          label="Foam Zones"
          checked={toggles.showFoamZones}
          onChange={() => onToggle('showFoamZones')}
          hotkey="F"
        />
        <Toggle
          label="Foam Samples"
          checked={toggles.showFoamSamples}
          onChange={() => onToggle('showFoamSamples')}
          hotkey="D"
        />
        <Toggle
          label="Player"
          checked={toggles.showPlayer}
          onChange={() => onToggle('showPlayer')}
          hotkey="P"
        />
        <Select
          label="Speed"
          value={timeScale}
          options={[1, 2, 4, 8]}
          onChange={onTimeScaleChange}
          hotkey="T"
        />
      </Section>

      <Section title="Set/Lull State">
        <ReadOnly label="State" value={sls.setState} />
        <ReadOnly label="Waves" value={`${sls.wavesSpawned}/${sls.currentSetWaves}`} />
        <ReadOnly label="Set Timer" value={`${sls.setTimer.toFixed(1)}s / ${sls.setDuration.toFixed(1)}s`} />
        <ReadOnly label="Wave Timer" value={`${sls.timeSinceLastWave.toFixed(1)}s / ${sls.nextWaveTime.toFixed(1)}s`} />
      </Section>

      <Section title="Wave Status">
        <ReadOnly label="Set Waves" value={setWaves.length} />
        <ReadOnly label="Background" value={bgWaves.length} />
        <ReadOnly label="Foam Segments" value={foamCount} />
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

function Toggle({ label, checked, onChange, hotkey }) {
  return (
    <label className="control toggle-control">
      <span className="label">
        <kbd>{hotkey}</kbd> {label}
      </span>
      <button
        className={`toggle-btn ${checked ? 'active' : ''}`}
        onClick={onChange}
      >
        {checked ? 'ON' : 'OFF'}
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

function ProgressBar({ label, progress, color }) {
  return (
    <div className="progress-item">
      <span className="progress-label">{label}</span>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
      </div>
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

function Slider({ label, value, min, max, onChange, suffix = '', tooltip }) {
  return (
    <div className="slider-control">
      <div className="slider-header">
        <span className="label">
          {label}
          {tooltip && <span className="tooltip-trigger" title={tooltip}>?</span>}
        </span>
        <span className="slider-value">{Math.round(value)}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
      />
    </div>
  );
}
