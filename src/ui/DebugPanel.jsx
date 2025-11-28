import './DebugPanel.css';

// Pure component - receives all data as props, rendered from game loop via requestAnimationFrame
export function DebugPanel({ setLullState, displayWaves, foamCount, timeScale, onTimeScaleChange, toggles, onToggle, fps }) {
  const sls = setLullState;
  const setWaves = displayWaves.filter(w => w.wave.type === 'SET');
  const bgWaves = displayWaves.filter(w => w.wave.type === 'BACKGROUND');

  const nextWaveIn = Math.max(0, sls.nextWaveTime - sls.timeSinceLastWave);
  const waveTimerProgress = Math.min(sls.timeSinceLastWave / sls.nextWaveTime, 1);
  const stateTimeLeft = Math.max(0, sls.setDuration - sls.setTimer);
  const stateTimerProgress = Math.min(sls.setTimer / sls.setDuration, 1);
  const stateLabel2 = sls.setState === 'LULL' ? 'Until set' : 'Set ends';

  return (
    <div className="debug-panel">
      <FPSCounter fps={fps} />
      <Section title="View Layers">
        <Toggle
          label="Bathymetry"
          checked={toggles.showBathymetry}
          onChange={() => onToggle('showBathymetry')}
          hotkey="B"
          activeColor="#c8a03c"
        />
        <Toggle
          label="Set Waves"
          checked={toggles.showSetWaves}
          onChange={() => onToggle('showSetWaves')}
          hotkey="S"
          activeColor="#4682b4"
        />
        <Toggle
          label="Background"
          checked={toggles.showBackgroundWaves}
          onChange={() => onToggle('showBackgroundWaves')}
          hotkey="G"
          activeColor="#6496b4"
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
        <ReadOnly label="State" value={`${sls.setState} (${sls.wavesSpawned}/${sls.currentSetWaves})`} />
        <ProgressBar
          label={`Next wave: ${nextWaveIn.toFixed(1)}s`}
          progress={1 - waveTimerProgress}
          color="#4a90b8"
        />
        <ProgressBar
          label={`${stateLabel2}: ${stateTimeLeft.toFixed(1)}s`}
          progress={1 - stateTimerProgress}
          color={sls.setState === 'LULL' ? '#e8a644' : '#44e8a6'}
        />
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

function Toggle({ label, checked, onChange, hotkey, activeColor }) {
  return (
    <label className="control toggle-control">
      <span className="label">
        <kbd>{hotkey}</kbd> {label}
      </span>
      <button
        className={`toggle-btn ${checked ? 'active' : ''}`}
        style={checked ? { backgroundColor: activeColor } : {}}
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
