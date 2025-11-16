import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App.js';

function renderApp() {
  return renderToStaticMarkup(React.createElement(App));
}

test('App renders the engine-driven status panels', () => {
  const markup = renderApp();
  assert.match(markup, /Turn\s+1/);
  assert.match(markup, /Currently acting: Captain Aurora/);
  assert.match(markup, /End Turn/);
});

test('App lists the seeded players and nodes', () => {
  const markup = renderApp();
  assert.match(markup, /Captain Aurora/);
  assert.match(markup, /Warden Umbra/);
  assert.match(markup, /node-1/);
  assert.match(markup, /node-6/);
});
