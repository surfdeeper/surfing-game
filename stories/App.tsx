import React, { useState } from 'react';
import EnergyFieldDocs from './energy-field.mdx';

const pages: Record<string, React.ComponentType> = {
  'energy-field': EnergyFieldDocs,
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('energy-field');
  const PageComponent = pages[currentPage];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav
        style={{
          width: 200,
          padding: 16,
          background: '#16213e',
          borderRight: '1px solid #333',
        }}
      >
        <h3 style={{ margin: '0 0 1em', color: '#88c0d0' }}>Wave Physics</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <button
              onClick={() => setCurrentPage('energy-field')}
              style={{
                background: currentPage === 'energy-field' ? '#2e3440' : 'transparent',
                border: 'none',
                color: '#eee',
                padding: '8px 12px',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              Energy Field
            </button>
          </li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '24px 48px', maxWidth: 900 }}>
        <PageComponent />
      </main>
    </div>
  );
}
