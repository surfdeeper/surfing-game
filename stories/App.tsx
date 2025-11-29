import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { ThemeContext, Theme, ThemeColors, darkColors, lightColors } from './ThemeContext';

// Dynamically import all MDX files matching the numbered pattern
const mdxModules = import.meta.glob<{ default: React.ComponentType }>('./**/*.mdx');

// Extract metadata from MDX file path
function parseFileName(path: string): { id: string; number: number; label: string } | null {
  // Match pattern like "./01-bathymetry.mdx" or "./02-energy-field.mdx"
  const match = path.match(/\.\/(?:.+\/)?(\d+)-(.+)\.mdx$/);
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

type ViewMode = 'normal' | 'presentation';

interface AppProps {
  MDXWrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

interface SectionInfo {
  id: string;
  label: string;
  fileIndex: number;
  sectionIndex: number;
}

function getInitialPage(): string {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  if (page && pageComponents[page]) return page;
  return pageEntries[0]?.id ?? '';
}

function getInitialMode(): ViewMode {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  return mode === 'presentation' ? 'presentation' : 'normal';
}

function getInitialSection(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('section') ?? '';
}

function getInitialTheme(): Theme {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme');
  if (theme === 'light' || theme === 'dark') return theme;
  // Default to dark
  return 'dark';
}

export default function App({ MDXWrapper = React.Fragment }: AppProps) {
  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [activeSection, setActiveSection] = useState('');
  const [sections, setSections] = useState<{ id: string; label: string }[]>([]);
  const [mode, setMode] = useState<ViewMode>(getInitialMode);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState(getInitialSection);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [currentReadingIndex, setCurrentReadingIndex] = useState(-1); // Index of element being read
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const contentRef = useRef<HTMLDivElement>(null);
  const readableElementsRef = useRef<Element[]>([]);

  const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2] as const;

  const PageComponent = pageComponents[currentPage];
  const currentPageIndex = pageEntries.findIndex((entry) => entry.id === currentPage);
  const totalPages = pageEntries.length;

  // Find the current section index within the current page's sections
  const currentSectionIndex = sections.findIndex((s) => s.id === currentSectionId);
  // If no section selected or not found, default to first section (index 0)
  const effectiveSectionIndex = currentSectionIndex >= 0 ? currentSectionIndex : 0;

  // Extract sections from the DOM after component renders
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const extractSections = () => {
      const sectionElements = document.querySelectorAll('main section[id]');
      const extractedSections = Array.from(sectionElements).map((el) => ({
        id: el.id,
        label: el.querySelector('h2')?.textContent ?? el.id,
      }));

      // If no sections found and we haven't exceeded max attempts, retry
      if (extractedSections.length === 0 && attempts < maxAttempts) {
        attempts++;
        setTimeout(extractSections, 100);
        return;
      }

      setSections(extractedSections);

      // In presentation mode, handle section selection
      if (mode === 'presentation' && extractedSections.length > 0) {
        if (currentSectionId === '__last__') {
          // Navigate to last section (when going back from next file)
          const lastSection = extractedSections[extractedSections.length - 1];
          setCurrentSectionId(lastSection.id);
        } else if (!currentSectionId) {
          // Default to first section
          setCurrentSectionId(extractedSections[0].id);
        }
      }
    };

    // Small delay to let MDX content render, then start extraction with retry
    const timer = setTimeout(extractSections, 50);
    return () => clearTimeout(timer);
  }, [currentPage, mode, currentSectionId]);

  // Auto-scroll to current section when it changes in presentation mode
  useEffect(() => {
    if (mode !== 'presentation' || !currentSectionId || currentSectionId === '__last__') return;

    const timer = setTimeout(() => {
      const element = document.getElementById(currentSectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [mode, currentSectionId]);

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

  // preserveAutoPlay: if true, don't stop auto-play mode (used for automatic advancement)
  const handlePageChange = useCallback(
    (pageId: string, sectionId?: string, preserveAutoPlay = false) => {
      // Stop any ongoing speech when changing pages
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      // Only reset auto-play if not preserving (manual navigation stops auto-play)
      if (!preserveAutoPlay) {
        setIsAutoPlaying(false);
        setCurrentReadingIndex(-1);
      }
      setCurrentPage(pageId);
      setActiveSection('');
      setSections([]);
      setCurrentSectionId(sectionId ?? '');
      const url = new URL(window.location.href);
      url.searchParams.set('page', pageId);
      if (sectionId) {
        url.searchParams.set('section', sectionId);
      } else {
        url.searchParams.delete('section');
      }
      url.hash = '';
      window.history.pushState({}, '', url.toString());
    },
    [setCurrentPage, setActiveSection, setSections]
  );

  // Navigate to a specific section (within current page)
  // preserveAutoPlay: if true, don't stop auto-play mode (used for automatic advancement)
  const goToSection = useCallback(
    (sectionId: string, preserveAutoPlay = false) => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      // Only reset auto-play if not preserving (manual navigation stops auto-play)
      if (!preserveAutoPlay) {
        setIsAutoPlaying(false);
        setCurrentReadingIndex(-1);
      }
      setCurrentSectionId(sectionId);
      const url = new URL(window.location.href);
      url.searchParams.set('section', sectionId);
      window.history.pushState({}, '', url.toString());

      // Scroll to section
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    },
    [setCurrentSectionId, setIsSpeaking]
  );

  // Navigate to next section (may cross to next file)
  // preserveAutoPlay: if true, don't stop auto-play mode (used for automatic advancement)
  const goToNextSection = useCallback(
    (preserveAutoPlay = false) => {
      if (sections.length === 0) return;

      const nextSectionIndex = effectiveSectionIndex + 1;
      if (nextSectionIndex < sections.length) {
        // Stay in same file, go to next section
        goToSection(sections[nextSectionIndex].id, preserveAutoPlay);
      } else if (currentPageIndex < totalPages - 1) {
        // Move to next file (first section will be selected automatically)
        handlePageChange(pageEntries[currentPageIndex + 1].id, undefined, preserveAutoPlay);
      }
    },
    [sections, effectiveSectionIndex, currentPageIndex, totalPages, goToSection, handlePageChange]
  );

  // Navigate to previous section (may cross to previous file)
  const goToPrevSection = useCallback(() => {
    if (sections.length === 0) return;

    const prevSectionIndex = effectiveSectionIndex - 1;
    if (prevSectionIndex >= 0) {
      // Stay in same file, go to previous section
      goToSection(sections[prevSectionIndex].id);
    } else if (currentPageIndex > 0) {
      // Move to previous file - we'll need to go to its last section
      // For now, just go to previous file (last section selection happens after sections load)
      handlePageChange(pageEntries[currentPageIndex - 1].id, '__last__');
    }
  }, [sections, effectiveSectionIndex, currentPageIndex, goToSection, handlePageChange]);

  // Jump to next file (skip remaining sections in current file)
  const goToNextFile = useCallback(() => {
    if (currentPageIndex < totalPages - 1) {
      handlePageChange(pageEntries[currentPageIndex + 1].id);
    }
  }, [currentPageIndex, totalPages, handlePageChange]);

  // Jump to previous file (go to first section of previous file)
  const goToPrevFile = useCallback(() => {
    if (currentPageIndex > 0) {
      handlePageChange(pageEntries[currentPageIndex - 1].id);
    }
  }, [currentPageIndex, handlePageChange]);

  const goToNextPage = useCallback(() => {
    if (currentPageIndex < totalPages - 1) {
      handlePageChange(pageEntries[currentPageIndex + 1].id);
    }
  }, [currentPageIndex, totalPages, handlePageChange]);

  const goToPrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      handlePageChange(pageEntries[currentPageIndex - 1].id);
    }
  }, [currentPageIndex, handlePageChange]);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'normal' ? 'presentation' : 'normal';
    setMode(newMode);
    const url = new URL(window.location.href);
    if (newMode === 'presentation') {
      url.searchParams.set('mode', 'presentation');
    } else {
      url.searchParams.delete('mode');
    }
    window.history.pushState({}, '', url.toString());
  }, [mode]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    const url = new URL(window.location.href);
    if (newTheme === 'light') {
      url.searchParams.set('theme', 'light');
    } else {
      url.searchParams.delete('theme');
    }
    window.history.pushState({}, '', url.toString());
  }, [theme]);

  // Theme colors from shared context
  const colors: ThemeColors = theme === 'dark' ? darkColors : lightColors;

  // Get readable elements from current section
  const getReadableElements = useCallback((): Element[] => {
    if (!contentRef.current || !currentSectionId) return [];
    const section = contentRef.current.querySelector(`section#${currentSectionId}`);
    if (!section) return [];
    // Select paragraphs, headings, list items, and code blocks
    return Array.from(section.querySelectorAll('p, h1, h2, h3, h4, li, pre'));
  }, [currentSectionId]);

  // Check if we're at the last section of the last file
  const isAtEnd =
    currentPageIndex === totalPages - 1 && effectiveSectionIndex === sections.length - 1;

  // Toggle auto-play mode
  const toggleAutoPlay = useCallback(() => {
    if (isAutoPlaying) {
      // Stop auto-play
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      setIsAutoPlaying(false);
      setCurrentReadingIndex(-1);
    } else {
      // Start auto-play from the beginning of current section
      setCurrentReadingIndex(0);
      setIsAutoPlaying(true);
    }
  }, [isAutoPlaying]);

  // Track when readable elements are ready (used to trigger auto-play after section change)
  const [elementsReady, setElementsReady] = useState(false);

  // Update readable elements when section changes
  useEffect(() => {
    if (mode !== 'presentation') return;
    // Mark elements as not ready while we wait for content to render
    setElementsReady(false);
    // Small delay to let content render
    const timer = setTimeout(() => {
      readableElementsRef.current = getReadableElements();
      setElementsReady(true);
    }, 150); // Slightly longer delay to ensure content is rendered
    return () => clearTimeout(timer);
  }, [mode, currentSectionId, getReadableElements]);

  // Reset reading index when section changes during auto-play
  // Wait for elements to be ready before starting to read
  useEffect(() => {
    if (isAutoPlaying && mode === 'presentation' && elementsReady) {
      setCurrentReadingIndex(0);
    }
  }, [currentSectionId, isAutoPlaying, mode, elementsReady]);

  // Jump to a specific element index during auto-play
  const jumpToElement = useCallback(
    (index: number) => {
      if (index < 0 || index >= readableElementsRef.current.length) return;
      // Cancel current speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      // Set to a temporary invalid index first to force effect to re-run
      // (in case we're clicking the same element that's currently reading)
      setCurrentReadingIndex(-1);
      // Use setTimeout to ensure state update happens in next tick
      setTimeout(() => {
        setCurrentReadingIndex(index);
        // Start auto-play if not already playing
        if (!isAutoPlaying) {
          setIsAutoPlaying(true);
        }
      }, 0);
    },
    [isAutoPlaying]
  );

  // Apply highlight class and click handlers to readable elements
  useEffect(() => {
    const elements = readableElementsRef.current;

    // Create click handlers for each element
    const clickHandlers: Array<(e: Event) => void> = [];
    elements.forEach((el, index) => {
      el.classList.remove('reading-highlight');
      // Add clickable styling
      (el as HTMLElement).style.cursor = 'pointer';
      // Create and attach click handler
      const handler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        jumpToElement(index);
      };
      clickHandlers.push(handler);
      el.addEventListener('click', handler);
    });

    // Add highlight to current element
    if (currentReadingIndex >= 0 && currentReadingIndex < elements.length) {
      elements[currentReadingIndex]?.classList.add('reading-highlight');
    }

    return () => {
      // Cleanup: remove highlights and click handlers
      elements.forEach((el, index) => {
        el.classList.remove('reading-highlight');
        (el as HTMLElement).style.cursor = '';
        if (clickHandlers[index]) {
          el.removeEventListener('click', clickHandlers[index]);
        }
      });
    };
  }, [currentReadingIndex, jumpToElement]);

  // Auto-play effect: read element-by-element with highlighting
  useEffect(() => {
    if (!isAutoPlaying || mode !== 'presentation') return;
    if (!window.speechSynthesis) return;
    if (currentReadingIndex < 0) return;
    // Wait for elements to be ready after section change
    if (!elementsReady) return;

    const elements = readableElementsRef.current;

    // If we've read all elements in this section, advance to next section
    // (elements.length === 0 means content hasn't loaded yet, so don't advance)
    if (elements.length > 0 && currentReadingIndex >= elements.length) {
      if (!isAtEnd) {
        // Pass true to preserve auto-play mode when advancing
        goToNextSection(true);
      } else {
        // Reached the end, stop auto-play
        setIsAutoPlaying(false);
        setCurrentReadingIndex(-1);
      }
      return;
    }

    const currentElement = elements[currentReadingIndex];
    if (!currentElement) return;

    // Scroll the current element into view
    currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Get text content (skip code blocks for reading, but still highlight them)
    const isCodeBlock = currentElement.tagName === 'PRE';
    const text = isCodeBlock ? '' : (currentElement.textContent ?? '').trim();

    if (!text) {
      // No readable text (e.g., code block), pause briefly then advance
      const timer = setTimeout(() => {
        setCurrentReadingIndex((i) => i + 1);
      }, 1500); // Show code block for 1.5 seconds
      return () => clearTimeout(timer);
    }

    // Read the text
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      setIsSpeaking(false);
      // Move to next element
      setCurrentReadingIndex((i) => i + 1);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsAutoPlaying(false);
      setCurrentReadingIndex(-1);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);

    return () => {
      // Cleanup: cancel speech if effect re-runs
      window.speechSynthesis.cancel();
    };
  }, [
    isAutoPlaying,
    mode,
    currentReadingIndex,
    isAtEnd,
    goToNextSection,
    elementsReady,
    playbackSpeed,
  ]);

  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (mode !== 'presentation') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            goToNextFile();
          } else {
            goToNextSection();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            goToPrevFile();
          } else {
            goToPrevSection();
          }
          break;
        case 'Home':
          e.preventDefault();
          handlePageChange(pageEntries[0].id);
          break;
        case 'End':
          e.preventDefault();
          handlePageChange(pageEntries[totalPages - 1].id, '__last__');
          break;
        case ' ':
          e.preventDefault();
          toggleAutoPlay();
          break;
        case 'Escape':
          e.preventDefault();
          toggleMode();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    goToNextSection,
    goToPrevSection,
    goToNextFile,
    goToPrevFile,
    handlePageChange,
    totalPages,
    toggleAutoPlay,
    toggleMode,
  ]);

  // Listen for 'P' key to enter presentation mode from normal view
  useEffect(() => {
    if (mode !== 'normal') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, toggleMode]);

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    // Update URL without triggering browser's native anchor scroll
    const url = new URL(window.location.href);
    url.hash = sectionId;
    window.history.pushState({}, '', url.toString());
    // Now scroll to the element
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Compute prev/next section info for UI labels
  const currentSectionLabel = sections[effectiveSectionIndex]?.label ?? 'Loading...';
  const prevSectionLabel =
    effectiveSectionIndex > 0
      ? sections[effectiveSectionIndex - 1]?.label
      : currentPageIndex > 0
        ? `← ${pageEntries[currentPageIndex - 1]?.label}`
        : null;
  const nextSectionLabel =
    effectiveSectionIndex < sections.length - 1
      ? sections[effectiveSectionIndex + 1]?.label
      : currentPageIndex < totalPages - 1
        ? `${pageEntries[currentPageIndex + 1]?.label} →`
        : null;

  // Check if at start (first section of first file)
  const isAtStart = currentPageIndex === 0 && effectiveSectionIndex === 0;

  // Theme context value for child components (including MDX)
  const themeContextValue = { theme, colors, toggleTheme };

  // Presentation mode UI
  if (mode === 'presentation') {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: colors.bg,
          }}
          tabIndex={0}
        >
          {/* Header with navigation */}
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              background: colors.bgHeader,
              borderBottom: `1px solid ${colors.border}`,
              position: 'sticky',
              top: 0,
              zIndex: 100,
            }}
          >
            {/* Left: Exit button and theme toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={toggleMode}
                style={{
                  background: colors.buttonBg,
                  border: `1px solid ${colors.buttonBorder}`,
                  color: colors.text,
                  padding: '8px 16px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                Exit
              </button>
              <button
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                style={{
                  background: colors.buttonBg,
                  border: `1px solid ${colors.buttonBorder}`,
                  color: colors.text,
                  padding: '8px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>

            {/* Center: Section navigation with labels */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Previous file button */}
              <button
                onClick={goToPrevFile}
                disabled={currentPageIndex === 0}
                title="Previous file"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: currentPageIndex === 0 ? colors.textDim : colors.textMuted,
                  fontSize: 16,
                  cursor: currentPageIndex === 0 ? 'default' : 'pointer',
                  padding: '4px 8px',
                }}
              >
                ⏮
              </button>

              {/* Previous section button with label */}
              <button
                onClick={() => goToPrevSection()}
                disabled={isAtStart}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isAtStart ? colors.textDim : colors.textMuted,
                  fontSize: 12,
                  cursor: isAtStart ? 'default' : 'pointer',
                  padding: '4px 8px',
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={prevSectionLabel ?? undefined}
              >
                ◀ {prevSectionLabel ?? ''}
              </button>

              {/* Current position indicator */}
              <div style={{ textAlign: 'center', minWidth: 180 }}>
                <div style={{ color: colors.textBright, fontSize: 14, fontWeight: 500 }}>
                  {currentSectionLabel}
                </div>
                <div style={{ color: colors.textDim, fontSize: 11 }}>
                  {currentPageIndex + 1}.{effectiveSectionIndex + 1} of {totalPages} files
                </div>
              </div>

              {/* Next section button with label */}
              <button
                onClick={() => goToNextSection()}
                disabled={isAtEnd}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isAtEnd ? colors.textDim : colors.textMuted,
                  fontSize: 12,
                  cursor: isAtEnd ? 'default' : 'pointer',
                  padding: '4px 8px',
                  maxWidth: 150,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={nextSectionLabel ?? undefined}
              >
                {nextSectionLabel ?? ''} ▶
              </button>

              {/* Next file button */}
              <button
                onClick={goToNextFile}
                disabled={currentPageIndex === totalPages - 1}
                title="Next file"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: currentPageIndex === totalPages - 1 ? colors.textDim : colors.textMuted,
                  fontSize: 16,
                  cursor: currentPageIndex === totalPages - 1 ? 'default' : 'pointer',
                  padding: '4px 8px',
                }}
              >
                ⏭
              </button>
            </div>

            {/* Right: Auto-play / TTS controls */}
            {typeof window !== 'undefined' && window.speechSynthesis && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Speed control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      style={{
                        background: playbackSpeed === speed ? colors.accent : colors.buttonBg,
                        border: `1px solid ${colors.buttonBorder}`,
                        color: playbackSpeed === speed ? '#ffffff' : colors.textMuted,
                        padding: '4px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 11,
                        fontFamily: 'inherit',
                        minWidth: 36,
                      }}
                    >
                      {speed === 1 ? '1x' : speed < 1 ? `${speed}x` : `${speed}x`}
                    </button>
                  ))}
                </div>

                {/* Play/Stop button */}
                <button
                  onClick={toggleAutoPlay}
                  style={{
                    background: isAutoPlaying ? colors.playingBg : colors.buttonBg,
                    border: `1px solid ${colors.buttonBorder}`,
                    color: isAutoPlaying ? '#ffffff' : colors.text,
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isAutoPlaying ? (
                    <>
                      <span
                        style={{
                          display: 'inline-block',
                          animation: 'pulse 1s ease-in-out infinite',
                        }}
                      >
                        ●
                      </span>{' '}
                      Stop
                    </>
                  ) : (
                    '▶ Play'
                  )}
                </button>
              </div>
            )}
          </header>

          {/* Main content - renders only the current section */}
          <main
            ref={contentRef}
            style={{
              flex: 1,
              padding: '48px 80px',
              maxWidth: 900,
              margin: '0 auto',
              width: '100%',
              overflowY: 'auto',
              color: colors.text,
            }}
          >
            <Suspense
              fallback={
                <div style={{ color: colors.textMuted, padding: '2em', textAlign: 'center' }}>
                  Loading...
                </div>
              }
            >
              <MDXWrapper>{PageComponent && <PageComponent />}</MDXWrapper>
            </Suspense>
          </main>

          {/* Footer with keyboard hints */}
          <footer
            style={{
              padding: '12px 24px',
              background: colors.bgHeader,
              borderTop: `1px solid ${colors.border}`,
              textAlign: 'center',
              color: colors.textDim,
              fontSize: 12,
            }}
          >
            <kbd
              style={{
                ...kbdStyle,
                background: colors.buttonBg,
                border: `1px solid ${colors.buttonBorder}`,
              }}
            >
              ←
            </kbd>{' '}
            <kbd
              style={{
                ...kbdStyle,
                background: colors.buttonBg,
                border: `1px solid ${colors.buttonBorder}`,
              }}
            >
              →
            </kbd>{' '}
            Section &nbsp;|&nbsp;{' '}
            <kbd
              style={{
                ...kbdStyle,
                background: colors.buttonBg,
                border: `1px solid ${colors.buttonBorder}`,
              }}
            >
              Shift
            </kbd>
            +
            <kbd
              style={{
                ...kbdStyle,
                background: colors.buttonBg,
                border: `1px solid ${colors.buttonBorder}`,
              }}
            >
              ←
            </kbd>{' '}
            <kbd
              style={{
                ...kbdStyle,
                background: colors.buttonBg,
                border: `1px solid ${colors.buttonBorder}`,
              }}
            >
              →
            </kbd>{' '}
            File &nbsp;|&nbsp;{' '}
            <kbd
              style={{
                ...kbdStyle,
                background: colors.buttonBg,
                border: `1px solid ${colors.buttonBorder}`,
              }}
            >
              Space
            </kbd>{' '}
            Play/Stop &nbsp;|&nbsp;{' '}
            <kbd
              style={{
                ...kbdStyle,
                background: colors.buttonBg,
                border: `1px solid ${colors.buttonBorder}`,
              }}
            >
              Esc
            </kbd>{' '}
            Exit
          </footer>

          {/* CSS to hide non-current sections and animation */}
          <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          ${
            currentSectionId && currentSectionId !== '__last__'
              ? `
          /* Hide all sections except the current one */
          main section[id] {
            display: none !important;
          }
          main section[id="${currentSectionId}"] {
            display: block !important;
          }
          `
              : ''
          }
          /* Theme-aware text colors for MDX content */
          main h1, main h2, main h3, main h4 {
            color: ${colors.textBright};
          }
          main p, main li {
            color: ${colors.text};
          }
          main code {
            background: ${colors.buttonBg};
            color: ${colors.text};
          }
          main pre {
            background: ${colors.bgHeader} !important;
            border: 1px solid ${colors.border};
          }
          main a {
            color: ${colors.accent};
          }
          /* Highlight the current element being read */
          .reading-highlight {
            position: relative;
            padding-left: 20px !important;
            margin-left: -20px;
            border-left: 4px solid ${colors.accent};
            background: ${colors.highlightBg};
            border-radius: 0 4px 4px 0;
            transition: all 0.2s ease;
          }
          /* Hover effect for clickable elements in presentation mode */
          main p:hover, main h1:hover, main h2:hover, main h3:hover, main h4:hover, main li:hover, main pre:hover {
            background: ${colors.hoverBg};
            border-radius: 4px;
          }
        `}</style>
        </div>
      </ThemeContext.Provider>
    );
  }

  // Normal mode UI
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Left sidebar - file navigation */}
        <nav
          style={{
            width: 200,
            padding: '24px 16px',
            background: colors.bgHeader,
            borderRight: `1px solid ${colors.border}`,
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5em',
            }}
          >
            <h3
              style={{
                margin: 0,
                color: colors.accent,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Wave Physics
            </h3>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.textDim,
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '2px 6px',
                }}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={toggleMode}
                title="Enter presentation mode (P)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.textDim,
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: '2px 6px',
                }}
              >
                ▶
              </button>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pageEntries.map(({ id, label }) => (
              <li key={id} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => handlePageChange(id)}
                  style={{
                    background: currentPage === id ? colors.buttonBg : 'transparent',
                    border: 'none',
                    color: currentPage === id ? colors.textBright : colors.textMuted,
                    padding: '10px 12px',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                    borderLeft:
                      currentPage === id ? `3px solid ${colors.accent}` : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== id) {
                      e.currentTarget.style.background = colors.bgSection;
                      e.currentTarget.style.color = colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== id) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = colors.textMuted;
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
                            color: activeSection === section.id ? colors.accent : colors.textDim,
                            padding: '4px 8px',
                            textDecoration: 'none',
                            fontSize: 11,
                            borderLeft:
                              activeSection === section.id
                                ? `2px solid ${colors.accent}`
                                : `2px solid ${colors.borderLight}`,
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
          ref={contentRef}
          style={{
            flex: 1,
            padding: '32px 56px',
            minWidth: 0,
            background: colors.bg,
            color: colors.text,
          }}
        >
          <Suspense
            fallback={
              <div
                style={{
                  color: colors.textMuted,
                  padding: '2em',
                  textAlign: 'center',
                }}
              >
                Loading...
              </div>
            }
          >
            <MDXWrapper>{PageComponent && <PageComponent />}</MDXWrapper>
          </Suspense>
        </main>

        {/* Theme-aware MDX styling for normal mode */}
        <style>{`
          /* Theme-aware text colors for MDX content in normal mode */
          main h1, main h2, main h3, main h4 {
            color: ${colors.textBright};
          }
          main p, main li {
            color: ${colors.text};
          }
          main code {
            background: ${colors.buttonBg};
            color: ${colors.text};
          }
          main pre {
            background: ${colors.bgHeader} !important;
            border: 1px solid ${colors.border};
          }
          main a {
            color: ${colors.accent};
          }
        `}</style>
      </div>
    </ThemeContext.Provider>
  );
}

// Keyboard hint styling
const kbdStyle: React.CSSProperties = {
  background: '#21262d',
  border: '1px solid #30363d',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 11,
  fontFamily: 'monospace',
};
