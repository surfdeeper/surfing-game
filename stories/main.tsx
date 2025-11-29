import React from 'react';
import { createRoot } from 'react-dom/client';
import { MDXProvider } from '@mdx-js/react';
import App from './App';
import { useTheme } from './ThemeContext';

// Theme-aware MDX components
function ThemedMDXProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  const components = {
    h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 600,
          color: colors.textBright,
          borderBottom: `1px solid ${colors.borderLight}`,
          paddingBottom: '0.75em',
          marginBottom: '1.5em',
        }}
        {...props}
      />
    ),
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 500,
          color: colors.accent,
          marginTop: '2.5em',
          marginBottom: '1em',
          paddingTop: '1em',
          borderTop: `1px solid ${colors.border}`,
        }}
        {...props}
      />
    ),
    h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: 500,
          color: colors.textMuted,
          marginTop: '1.5em',
          marginBottom: '0.75em',
        }}
        {...props}
      />
    ),
    p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p
        style={{
          marginBottom: '1em',
          color: colors.text,
        }}
        {...props}
      />
    ),
    ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
      <ul
        style={{
          paddingLeft: '1.5em',
          marginBottom: '1em',
        }}
        {...props}
      />
    ),
    li: (props: React.HTMLAttributes<HTMLLIElement>) => (
      <li
        style={{
          marginBottom: '0.5em',
          color: colors.text,
        }}
        {...props}
      />
    ),
    strong: (props: React.HTMLAttributes<HTMLElement>) => (
      <strong style={{ color: colors.textBright, fontWeight: 600 }} {...props} />
    ),
    code: (props: React.HTMLAttributes<HTMLElement>) => (
      <code
        style={{
          background: colors.codeBg,
          padding: '0.2em 0.4em',
          borderRadius: 6,
          fontSize: '0.9em',
          color: colors.codeText,
          border: `1px solid ${colors.borderLight}`,
        }}
        {...props}
      />
    ),
    pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
      <pre
        style={{
          background: colors.codeBg,
          padding: '1em 1.25em',
          borderRadius: 8,
          overflow: 'auto',
          border: `1px solid ${colors.borderLight}`,
          marginBottom: '1.5em',
        }}
        {...props}
      />
    ),
    section: (props: React.HTMLAttributes<HTMLElement>) => (
      <section
        style={{
          background: colors.bgSection,
          borderRadius: 12,
          padding: '1.5em 2em',
          marginBottom: '2em',
          border: `1px solid ${colors.borderLight}`,
        }}
        {...props}
      />
    ),
  };

  return <MDXProvider components={components}>{children}</MDXProvider>;
}

const root = createRoot(document.getElementById('root')!);
root.render(<App MDXWrapper={ThemedMDXProvider} />);
