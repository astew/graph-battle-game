import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import core from '@graph-battle/core';
import App, { GameScreen, EventLog, formatEventLogEntry } from '../src/App.js';

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
    reinforcements: {
      preview: { total: 0, eligibleNodeIds: [] },
      lastAwarded: null,
    },
  };
  const players = [
    { id: 'p1', name: 'Alpha', color: '#f00' },
    { id: 'p2', name: 'Beta', color: '#0f0' },
  ];
  const noop = () => {};
  const markup = renderToStaticMarkup(
    React.createElement(GameScreen, {
      view,
      players,
      onEndTurn: noop,
      onNodeSelect: noop,
      interaction: { mode: 'idle', attackerId: null },
      actionableNodeIds: new Set(),
      targetNodeIds: new Set(),
      eventLog: [],
      actionMessage: '',
      reinforcements: view.reinforcements,
      onCancel: noop,
      reinforcementHighlights: new Set(),
      gridDimensions: { rows: 6, columns: 8 },
      highlightedEdges: new Set(),
    })
  );

  assert.match(markup, /Turn\s+3/);
  assert.match(markup, /Battlefield/);
  assert.match(markup, /Players/);
  assert.match(markup, /Alpha/);
  assert.match(markup, /board-edge/);
});

test('Event log records end turn events', () => {
  const eventBus = new core.EventBus();
  const players = [
    { id: 'alpha', name: 'Alpha', color: '#f00' },
    { id: 'beta', name: 'Beta', color: '#0f0' },
  ];
  const playersById = new Map(players.map((player) => [player.id, player]));
  const entries = [];
  eventBus.subscribe(core.EVENT_TYPES.TURN_ENDED, (event) => {
    entries.push({
      id: `log-${entries.length + 1}`,
      label: formatEventLogEntry(event, playersById),
    });
  });

  const engine = new core.GameEngine({ players, eventBus });
  const { activePlayerId } = engine.getState().turn;
  engine.applyAction(core.createEndTurnAction(activePlayerId));

  const markup = renderToStaticMarkup(React.createElement(EventLog, { entries }));
  assert.ok(entries.length > 0);
  assert.match(markup, /ended turn/);
});
