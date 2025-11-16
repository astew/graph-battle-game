import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import './styles.css';

export function start() {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Expected #root container to exist');
  }

  const root = createRoot(container);
  root.render(React.createElement(React.StrictMode, null, React.createElement(App)));
}

if (typeof document !== 'undefined') {
  start();
}
