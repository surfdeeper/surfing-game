import { useState } from 'react';

export default function GamePlaceholder() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadGame = () => {
    setIsLoading(true);
    // TODO: Integrate actual game component from @surf/core
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.placeholder}>
        <h2 style={styles.title}>Game Canvas</h2>
        <p style={styles.description}>
          The surfing game will be embedded here using an Astro island for client-side hydration.
        </p>
        <button style={styles.button} onClick={handleLoadGame} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load Game (Placeholder)'}
        </button>
        <p style={styles.note}>TODO: Import and render the actual game canvas from @surf/core</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    minHeight: '500px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: '100%',
    maxWidth: '800px',
    aspectRatio: '16/9',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    padding: '2rem',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
  },
  description: {
    color: '#aaa',
    marginBottom: '1.5rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    background: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  note: {
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: '#666',
  },
};
