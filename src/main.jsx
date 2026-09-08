import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import './editor/layouts.js';

function ensureStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

// Theme/editor CSS lives in src/App.css; fonts.css is shared.
ensureStylesheet('/fonts/fonts.css');

const root = document.getElementById('root');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
