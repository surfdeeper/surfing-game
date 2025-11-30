import { useState } from 'react';

export default function ViewerPlaceholder() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'physics', label: 'Wave Physics' },
    { id: 'rendering', label: 'Rendering' },
    { id: 'components', label: 'Components' },
  ];

  return (
    <div style={styles.container}>
      <nav style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div style={styles.content}>
        <h2 style={styles.title}>Visual Dev Docs Viewer</h2>
        <p style={styles.description}>
          This viewer will display the visual regression testing documentation and component stories
          from the @surf/visual-regression-testing-viewer-react-application package.
        </p>
        <div style={styles.placeholder}>
          <p>
            Currently viewing: <strong>{activeTab}</strong>
          </p>
          <p style={styles.note}>TODO: Integrate the actual viewer component</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    minHeight: '600px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #ddd',
    background: '#f5f5f5',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#666',
  },
  activeTab: {
    background: 'white',
    color: '#0066cc',
    borderBottom: '2px solid #0066cc',
  },
  content: {
    padding: '2rem',
  },
  title: {
    marginBottom: '1rem',
  },
  description: {
    color: '#666',
    marginBottom: '2rem',
  },
  placeholder: {
    padding: '2rem',
    background: '#f9f9f9',
    borderRadius: '4px',
    textAlign: 'center',
  },
  note: {
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: '#999',
  },
};
