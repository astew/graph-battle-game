import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { GameScreen } from '../src/App.js';

function renderApp() {
  return renderToStaticMarkup(React.createElement(App));
}

test('App renders the title screen by default', () => {
  const markup = renderApp();
  assert.match(markup, /Mode Select/);
  assert.match(markup, /New Game/);
});

test('GameScreen renders battlefield and player information', () => {
  const view = {
    currentPlayerId: 'p1',
    turnNumber: 3,
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 2, position: { row: 0, column: 0 } },
      { id: 'b', ownerId: 'p2', strength: 1, position: { row: 0, column: 1 } },
    ],
    edges: [['a', 'b']],
  };
  const players = [
    { id: 'p1', name: 'Alpha', color: '#f00' },
    { id: 'p2', name: 'Beta', color: '#0f0' },
  ];
  const markup = renderToStaticMarkup(
    React.createElement(GameScreen, { view, players, onEndTurn: () => {} })
  );

  assert.match(markup, /Turn\s+3/);
  assert.match(markup, /Battlefield/);
  assert.match(markup, /Players/);
  assert.match(markup, /Alpha/);
  assert.match(markup, /board-edge/);
});
