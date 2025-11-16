import React, { useMemo, useState, useCallback } from 'react';
import * as core from '@graph-battle/core';

const { GameEngine, EmptyBoardGenerator, createEndTurnAction } = core;

const DEFAULT_PLAYERS = [
  { id: 'captain-aurora', name: 'Captain Aurora' },
  { id: 'warden-umbra', name: 'Warden Umbra' },
];

const DEFAULT_NODE_COUNT = 6;

function useBootstrappedGame() {
  const engine = useMemo(
    () =>
      new GameEngine({
        players: DEFAULT_PLAYERS,
        boardGenerator: new EmptyBoardGenerator({ nodeCount: DEFAULT_NODE_COUNT }),
      }),
    []
  );

  const [view, setView] = useState(() => engine.getView());

  const refreshView = useCallback(() => {
    setView(engine.getView());
  }, [engine]);

  const endTurn = useCallback(() => {
    const { activePlayerId } = engine.getState().turn;
    const result = engine.applyAction(createEndTurnAction(activePlayerId));
    if (result.ok) {
      refreshView();
    }

    return result;
  }, [engine, refreshView]);

  return {
    view,
    players: engine.getState().players,
    endTurn,
  };
}

function PlayerList({ players, currentPlayerId }) {
  const items = players.map((player) => {
    const isActive = player.id === currentPlayerId;
    return React.createElement(
      'li',
      {
        key: player.id,
        className: `player-list__item${isActive ? ' player-list__item--active' : ''}`,
      },
      React.createElement('span', {
        className: 'player-list__color',
        style: { backgroundColor: player.color },
        'aria-hidden': 'true',
      }),
      React.createElement(
        'div',
        { className: 'player-list__meta' },
        React.createElement('div', { className: 'player-list__name' }, player.name),
        React.createElement('div', { className: 'player-list__id' }, player.id)
      )
    );
  });

  return React.createElement('ul', { className: 'player-list' }, items);
}

function BoardPreview({ nodes, playersById }) {
  const nodeCards = nodes.map((node) => {
    const owner = node.ownerId ? playersById.get(node.ownerId) : null;
    return React.createElement(
      'div',
      { key: node.id, className: 'board-node' },
      React.createElement('div', { className: 'board-node__id' }, node.id),
      React.createElement(
        'div',
        { className: 'board-node__owner' },
        owner ? `Held by ${owner.name}` : 'Unclaimed'
      ),
      React.createElement('div', { className: 'board-node__strength' }, `Strength: ${node.strength}`)
    );
  });

  return React.createElement('div', { className: 'board-grid' }, nodeCards);
}

export default function App() {
  const { view, players, endTurn } = useBootstrappedGame();
  const playersById = useMemo(() => {
    const entries = players.map((player) => [player.id, player]);
    return new Map(entries);
  }, [players]);
  const activePlayer = playersById.get(view.currentPlayerId);

  return React.createElement(
    'main',
    { className: 'app-shell' },
    React.createElement(
      'header',
      { className: 'app-header' },
      React.createElement('p', { className: 'eyebrow' }, 'Prototype'),
      React.createElement('h1', null, 'Graph Battle'),
      React.createElement(
        'p',
        { className: 'lede' },
        'A turn-based duel played on a connected graph. This preview renders the core engine\'s initial state so we can start iterating on the UI.'
      )
    ),
    React.createElement(
      'section',
      { className: 'status-panel' },
      React.createElement('h2', null, `Turn ${view.turnNumber}`),
      React.createElement(
        'p',
        { className: 'status-panel__detail' },
        `Currently acting: ${activePlayer ? activePlayer.name : view.currentPlayerId}`
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'end-turn-button',
          onClick: endTurn,
        },
        'End Turn'
      )
    ),
    React.createElement(
      'section',
      { className: 'player-panel' },
      React.createElement('h2', null, 'Players'),
      React.createElement(PlayerList, { players, currentPlayerId: view.currentPlayerId })
    ),
    React.createElement(
      'section',
      { className: 'board-panel' },
      React.createElement('h2', null, 'Board Nodes'),
      React.createElement(BoardPreview, { nodes: view.nodes, playersById })
    )
  );
}
