import React from 'react';

export default function App() {
  return React.createElement(
    'main',
    { className: 'app-shell' },
    React.createElement('h1', null, 'Graph Battle'),
    React.createElement(
      'p',
      null,
      'Welcome to the Graph Battle prototype. Gameplay implementation is coming soon.'
    )
  );
}
