import React, { useCallback, useMemo, useRef, useState } from 'react';
import * as core from '@graph-battle/core';

const { GameEngine, StandardBoardGenerator, createEndTurnAction } = core;
const h = React.createElement;

const DEFAULT_PLAYERS = [
  { id: 'captain-aurora', name: 'Captain Aurora', color: '#f94144' },
  { id: 'warden-umbra', name: 'Warden Umbra', color: '#277da1' },
  { id: 'seer-lyra', name: 'Seer Lyra', color: '#f9844a' },
  { id: 'marshal-orbit', name: 'Marshal Orbit', color: '#43aa8b' },
  { id: 'oracle-solis', name: 'Oracle Solis', color: '#9b5de5' },
];

const GRID_SPACING = 96;
const NODE_RADIUS = 24;

function TitleScreen({ onNewGame }) {
  return h(
    'section',
    { className: 'title-screen card' },
    h('p', { className: 'eyebrow' }, 'Mode Select'),
    h('h2', null, 'Welcome to Graph Battle'),
    h(
      'p',
      { className: 'lede' },
      'Launch a new 5-player match on a procedurally carved grid to explore the core rule set.'
    ),
    h(
      'button',
      {
        type: 'button',
        className: 'primary-button',
        onClick: onNewGame,
      },
      'New Game'
    )
  );
}

function PlayerList({ players, currentPlayerId }) {
  const items = players.map((player) => {
    const isActive = player.id === currentPlayerId;
    return h(
      'li',
      {
        key: player.id,
        className: `player-list__item${isActive ? ' player-list__item--active' : ''}`,
      },
      h('span', {
        className: 'player-list__color',
        style: { backgroundColor: player.color },
        'aria-hidden': 'true',
      }),
      h(
        'div',
        { className: 'player-list__meta' },
        h('div', { className: 'player-list__name' }, player.name),
        h('div', { className: 'player-list__id' }, player.id)
      )
    );
  });

  return h('ul', { className: 'player-list' }, items);
}

function BoardCanvas({ nodes, edges, playersById }) {
  if (!nodes || nodes.length === 0) {
    return h('div', { className: 'board-empty' }, 'Board unavailable');
  }

  const coordinates = nodes.map((node) => {
    const row = node.position?.row ?? 0;
    const column = node.position?.column ?? 0;
    const cx = column * GRID_SPACING + GRID_SPACING / 2;
    const cy = row * GRID_SPACING + GRID_SPACING / 2;
    return { node, cx, cy };
  });

  const maxRow = coordinates.reduce(
    (max, entry) => Math.max(max, entry.node.position?.row ?? 0),
    0
  );
  const maxColumn = coordinates.reduce(
    (max, entry) => Math.max(max, entry.node.position?.column ?? 0),
    0
  );
  const width = (maxColumn + 1) * GRID_SPACING;
  const height = (maxRow + 1) * GRID_SPACING;

  const nodeLookup = new Map(coordinates.map((entry) => [entry.node.id, entry]));

  const edgeElements = edges
    .map(([fromId, toId], index) => {
      const from = nodeLookup.get(fromId);
      const to = nodeLookup.get(toId);
      if (!from || !to) {
        return null;
      }

      return h('line', {
        key: `edge-${fromId}-${toId}-${index}`,
        x1: from.cx,
        y1: from.cy,
        x2: to.cx,
        y2: to.cy,
        className: 'board-edge',
      });
    })
    .filter(Boolean);

  const nodeElements = coordinates.map(({ node, cx, cy }) => {
    const owner = node.ownerId ? playersById.get(node.ownerId) : null;
    const fill = owner?.color ?? '#9CA3AF';
    return h(
      'g',
      {
        key: node.id,
        className: 'board-node',
        transform: `translate(${cx} ${cy})`,
      },
      h('title', null, `${node.id}`),
      h('circle', { r: NODE_RADIUS, fill }),
      h(
        'text',
        {
          className: 'board-node__strength',
          textAnchor: 'middle',
          dominantBaseline: 'central',
        },
        `${node.strength}`
      )
    );
  });

  return h(
    'div',
    { className: 'board-canvas' },
    h(
      'svg',
      {
        className: 'board-svg',
        viewBox: `0 0 ${width} ${height}`,
        role: 'presentation',
        preserveAspectRatio: 'xMidYMid meet',
      },
      h('g', { className: 'board-edges' }, edgeElements),
      h('g', { className: 'board-nodes' }, nodeElements)
    )
  );
}

function StatusPanel({ view, activePlayer, onEndTurn }) {
  return h(
    'section',
    { className: 'status-panel card' },
    h('h2', null, `Turn ${view.turnNumber}`),
    h(
      'p',
      { className: 'status-panel__detail' },
      `Currently acting: ${activePlayer ? activePlayer.name : view.currentPlayerId}`
    ),
    h(
      'button',
      {
        type: 'button',
        className: 'end-turn-button',
        onClick: onEndTurn,
      },
      'End Turn'
    )
  );
}

function GameScreen({ view, players, onEndTurn }) {
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [
    players,
  ]);
  const activePlayer = playersById.get(view.currentPlayerId);

  return h(
    'div',
    { className: 'game-screen' },
    h(StatusPanel, { view, activePlayer, onEndTurn }),
    h(
      'section',
      { className: 'board-panel card' },
      h('h2', null, 'Battlefield'),
      h(BoardCanvas, { nodes: view.nodes, edges: view.edges ?? [], playersById })
    ),
    h(
      'section',
      { className: 'player-panel card' },
      h('h2', null, 'Players'),
      h(PlayerList, { players, currentPlayerId: view.currentPlayerId })
    )
  );
}

export default function App() {
  const engineRef = useRef(null);
  const [mode, setMode] = useState('menu');
  const [view, setView] = useState(null);
  const [players, setPlayers] = useState([]);

  const startNewGame = useCallback(() => {
    const engine = new GameEngine({
      players: DEFAULT_PLAYERS,
      boardGenerator: new StandardBoardGenerator(),
    });
    engineRef.current = engine;
    setPlayers(engine.getState().players);
    setView(engine.getView());
    setMode('playing');
  }, []);

  const endTurn = useCallback(() => {
    if (!engineRef.current) {
      return { ok: false, error: { code: 'core.error.noEngine', message: 'No active game.' } };
    }

    const { activePlayerId } = engineRef.current.getState().turn;
    const result = engineRef.current.applyAction(createEndTurnAction(activePlayerId));
    if (result.ok) {
      setView(engineRef.current.getView());
    }

    return result;
  }, []);

  return h(
    'main',
    { className: 'app-shell' },
    h(
      'header',
      { className: 'app-header' },
      h('p', { className: 'eyebrow' }, 'Prototype'),
      h('h1', null, 'Graph Battle'),
      h(
        'p',
        { className: 'lede' },
        'A turn-based duel played on a connected graph. This preview now renders the standard board layout so we can iterate on combat UI.'
      )
    ),
    mode === 'menu'
      ? h(TitleScreen, { onNewGame: startNewGame })
      : h(GameScreen, { view, players, onEndTurn: endTurn })
  );
}

export { TitleScreen, GameScreen, BoardCanvas };
