import React from 'react';
import { createRoot } from 'react-dom/client';
import { MDXProvider } from '@mdx-js/react';
import App from './App';

const components = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      style={{
        fontSize: '1.75rem',
        fontWeight: 600,
        color: '#f0f6fc',
        borderBottom: '1px solid #30363d',
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
        color: '#58a6ff',
        marginTop: '2.5em',
        marginBottom: '1em',
        paddingTop: '1em',
        borderTop: '1px solid #21262d',
      }}
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      style={{
        fontSize: '1rem',
        fontWeight: 500,
        color: '#8b949e',
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
        color: '#c9d1d9',
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
        color: '#c9d1d9',
      }}
      {...props}
    />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong style={{ color: '#f0f6fc', fontWeight: 600 }} {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      style={{
        background: '#161b22',
        padding: '0.2em 0.4em',
        borderRadius: 6,
        fontSize: '0.9em',
        color: '#79c0ff',
        border: '1px solid #30363d',
      }}
      {...props}
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      style={{
        background: '#161b22',
        padding: '1em 1.25em',
        borderRadius: 8,
        overflow: 'auto',
        border: '1px solid #30363d',
        marginBottom: '1.5em',
      }}
      {...props}
    />
  ),
  section: (props: React.HTMLAttributes<HTMLElement>) => (
    <section
      style={{
        background: '#161b22',
        borderRadius: 12,
        padding: '1.5em 2em',
        marginBottom: '2em',
        border: '1px solid #30363d',
      }}
      {...props}
    />
  ),
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <MDXProvider components={components}>
    <App />
  </MDXProvider>
);
