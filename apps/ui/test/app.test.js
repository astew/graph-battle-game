import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App.js';

test('App renders a heading with the game name', () => {
  const markup = renderToStaticMarkup(React.createElement(App));
  assert.match(markup, /<h1[^>]*>Graph Battle<\/h1>/);
  assert.match(
    markup,
    /Welcome to the Graph Battle prototype\. Gameplay implementation is coming soon\./
  );
});
