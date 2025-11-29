import React from 'react';
import { createRoot } from 'react-dom/client';
import { MDXProvider } from '@mdx-js/react';
import App from './App';

const components = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5em' }} {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 style={{ color: '#88c0d0', marginTop: '2em' }} {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code style={{ background: '#2e3440', padding: '0.2em 0.4em', borderRadius: 4 }} {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      style={{
        background: '#2e3440',
        padding: '1em',
        borderRadius: 8,
        overflow: 'auto',
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
