import React, { useState, useEffect, Suspense } from 'react';

// Dynamically import all MDX files matching the numbered pattern
const mdxModules = import.meta.glob<{ default: React.ComponentType }>('./*.mdx');

// Extract metadata from MDX file path
function parseFileName(path: string): { id: string; number: number; label: string } | null {
  // Match pattern like "./01-bathymetry.mdx" or "./02-energy-field.mdx"
  const match = path.match(/\.\/(\d+)-(.+)\.mdx$/);
  if (!match) return null;

  const [, numStr, slug] = match;
  const number = parseInt(numStr, 10);
  // Convert slug to label: "energy-field" -> "Energy Field"
  const label = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: `${numStr}-${slug}`,
    number,
    label: `${number}. ${label}`,
  };
}

// Build sorted page list from discovered MDX files
const pageEntries = Object.keys(mdxModules)
  .map((path) => {
    const meta = parseFileName(path);
    if (!meta) return null;
    return { path, ...meta };
  })
  .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  .sort((a, b) => a.number - b.number);

// Create lazy-loaded components for each page
const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {};
for (const entry of pageEntries) {
  pageComponents[entry.id] = React.lazy(mdxModules[entry.path]);
}

function getInitialPage(): string {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  if (page && pageComponents[page]) return page;
  return pageEntries[0]?.id ?? '';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [activeSection, setActiveSection] = useState('');
  const [sections, setSections] = useState<{ id: string; label: string }[]>([]);

  const PageComponent = pageComponents[currentPage];

  // Extract sections from the DOM after component renders
  useEffect(() => {
    // Small delay to let MDX content render
    const timer = setTimeout(() => {
      const sectionElements = document.querySelectorAll('main section[id]');
      const extractedSections = Array.from(sectionElements).map((el) => ({
        id: el.id,
        label: el.querySelector('h2')?.textContent ?? el.id,
      }));
      setSections(extractedSections);
    }, 50);
    return () => clearTimeout(timer);
  }, [currentPage]);

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
    setSections([]);
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
          width: 200,
          padding: '24px 16px',
          background: '#010409',
          borderRight: '1px solid #21262d',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <h3
          style={{
            margin: '0 0 1.5em',
            color: '#58a6ff',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Wave Physics
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {pageEntries.map(({ id, label }) => (
            <li key={id} style={{ marginBottom: 2 }}>
              <button
                onClick={() => handlePageChange(id)}
                style={{
                  background: currentPage === id ? '#21262d' : 'transparent',
                  border: 'none',
                  color: currentPage === id ? '#f0f6fc' : '#8b949e',
                  padding: '10px 12px',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  borderLeft: currentPage === id ? '3px solid #58a6ff' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== id) {
                    e.currentTarget.style.background = '#161b22';
                    e.currentTarget.style.color = '#c9d1d9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#8b949e';
                  }
                }}
              >
                {label}
              </button>
              {/* Nested section links for current page */}
              {currentPage === id && sections.length > 0 && (
                <ul style={{ listStyle: 'none', padding: '4px 0 8px 16px', margin: 0 }}>
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSectionClick(section.id);
                        }}
                        style={{
                          display: 'block',
                          color: activeSection === section.id ? '#58a6ff' : '#6e7681',
                          padding: '4px 8px',
                          textDecoration: 'none',
                          fontSize: 11,
                          borderLeft:
                            activeSection === section.id
                              ? '2px solid #58a6ff'
                              : '2px solid #30363d',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {section.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content area */}
      <main
        style={{
          flex: 1,
          padding: '32px 56px',
          minWidth: 0,
          background: '#0d1117',
        }}
      >
        <Suspense
          fallback={
            <div
              style={{
                color: '#8b949e',
                padding: '2em',
                textAlign: 'center',
              }}
            >
              Loading...
            </div>
          }
        >
          {PageComponent && <PageComponent />}
        </Suspense>
      </main>
    </div>
  );
}
