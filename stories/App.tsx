import React, { useState, useEffect } from 'react';
import EnergyFieldDocs from './energy-field.mdx';
import WaveBreakingDocs from './wave-breaking.mdx';

const pages: Record<
  string,
  { component: React.ComponentType; label: string; sections: { id: string; label: string }[] }
> = {
  'energy-field': {
    component: EnergyFieldDocs,
    label: 'Energy Field',
    sections: [
      { id: 'no-damping', label: 'No Damping' },
      { id: 'low-damping', label: 'Low Damping' },
      { id: 'high-damping', label: 'High Damping' },
      { id: 'energy-drain', label: 'Energy Drain' },
    ],
  },
  'wave-breaking': {
    component: WaveBreakingDocs,
    label: 'Dummy',
    sections: [
      { id: 'section-a', label: 'Section A' },
      { id: 'section-b', label: 'Section B' },
    ],
  },
};

function getInitialPage(): string {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  return page && pages[page] ? page : 'energy-field';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [activeSection, setActiveSection] = useState('');
  const pageData = pages[currentPage];
  const PageComponent = pageData.component;

  // Handle initial hash on page load
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setActiveSection(hash);
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, []);

  const handlePageChange = (pageId: string) => {
    setCurrentPage(pageId);
    setActiveSection('');
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageId);
    url.hash = '';
    window.history.pushState({}, '', url.toString());
  };

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    window.location.hash = sectionId;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left sidebar - file navigation */}
      <nav
        style={{
          width: 180,
          padding: 16,
          background: '#16213e',
          borderRight: '1px solid #333',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ margin: '0 0 1em', color: '#88c0d0', fontSize: 14 }}>Wave Physics</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {Object.entries(pages).map(([pageId, page]) => (
            <li key={pageId}>
              <button
                onClick={() => handlePageChange(pageId)}
                style={{
                  background: currentPage === pageId ? '#2e3440' : 'transparent',
                  border: 'none',
                  color: '#eee',
                  padding: '8px 12px',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                {page.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content area */}
      <main style={{ flex: 1, padding: '24px 48px', maxWidth: 800, minWidth: 0 }}>
        <PageComponent />
      </main>

      {/* Right sidebar - section anchors (sticky) */}
      <aside
        style={{
          width: 160,
          padding: 16,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <h4
          style={{
            margin: '0 0 12px',
            color: '#666',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          On this page
        </h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {pageData.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleSectionClick(section.id);
                }}
                style={{
                  display: 'block',
                  color: activeSection === section.id ? '#88c0d0' : '#888',
                  padding: '4px 0',
                  textDecoration: 'none',
                  fontSize: 12,
                  borderLeft:
                    activeSection === section.id ? '2px solid #88c0d0' : '2px solid transparent',
                  paddingLeft: 8,
                }}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
