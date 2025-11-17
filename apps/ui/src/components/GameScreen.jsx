import React, { useMemo } from 'react';
import BoardCanvas from './BoardCanvas.jsx';

function PlayerTrack({ players, nodes, currentPlayerId }) {
  const totals = new Map(players.map((player) => [player.id, 0]));
  for (const node of nodes ?? []) {
    if (node.ownerId && totals.has(node.ownerId)) {
      totals.set(node.ownerId, totals.get(node.ownerId) + 1);
    }
  }

  return (
    <div className="player-track">
      {players.map((player) => {
        const count = totals.get(player.id) ?? 0;
        const isActive = player.id === currentPlayerId;
        const classes = ['player-track__badge'];
        if (isActive) {
          classes.push('player-track__badge--active');
        }
        return (
          <div
            key={player.id}
            className={classes.join(' ')}
            style={{ backgroundColor: player.color }}
          >
            <span className="player-track__count">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function EventLog({ entries }) {
  if (!entries || entries.length === 0) {
    return <div className="event-log__empty">No events yet.</div>;
  }

  return (
    <ol className="event-log">
      {entries.map((entry) => (
        <li key={entry.id}>{entry.label}</li>
      ))}
    </ol>
  );
}

export default function GameScreen({
  view,
  players,
  onEndTurn,
  onNodeSelect,
  interaction,
  actionableNodeIds,
  targetNodeIds,
  eventLog,
  reinforcementHighlights,
  gridDimensions,
  highlightedEdges,
}) {
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [
    players,
  ]);

  return (
    <div className="game-screen">
      <section className="board-panel card">
        <div className="board-panel__header">
          <h2>Battlefield</h2>
          <PlayerTrack players={players} nodes={view.nodes} currentPlayerId={view.currentPlayerId} />
        </div>
        <BoardCanvas
          nodes={view.nodes}
          edges={view.edges ?? []}
          playersById={playersById}
          onNodeSelect={onNodeSelect}
          selectedAttackerId={interaction.attackerId}
          targetNodeIds={targetNodeIds}
          actionableNodeIds={actionableNodeIds}
          reinforcementHighlights={reinforcementHighlights}
          gridDimensions={gridDimensions}
          highlightedEdges={highlightedEdges}
          currentPlayerId={view.currentPlayerId}
        />
      </section>
      <section className="turn-controls card">
        <button
          type="button"
          className="end-turn-button"
          onClick={onEndTurn}
          aria-label="End turn (keyboard shortcut: E)"
        >
          End Turn
        </button>
      </section>
      <section className="event-panel card">
        <h2>Event Log</h2>
        <EventLog entries={eventLog} />
      </section>
    </div>
  );
}

export { PlayerTrack, EventLog };
