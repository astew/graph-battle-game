import React, { useMemo, useState } from 'react';
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
  targetNodeIds,
  eventLog,
  reinforcementHighlights,
  gridDimensions,
  highlightedEdges,
  activeAnimation,
  interactionLocked,
  animationSpeed,
  onAnimationSpeedChange,
  initialLogOpen = false,
}) {
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [
    players,
  ]);
  const [logOpen, setLogOpen] = useState(initialLogOpen);
  const toggleLog = () => setLogOpen((open) => !open);

  const animationMessage = useMemo(() => {
    if (activeAnimation?.type === 'attack-iteration') {
      return `Resolving attack between ${activeAnimation.attackerNodeId} and ${activeAnimation.defenderNodeId} (${activeAnimation.winner} won iteration ${
        (activeAnimation.index ?? 0) + 1
      }).`;
    }
    if (activeAnimation?.type === 'reinforcement-step') {
      return `Applying reinforcement ${
        (activeAnimation.step ?? 0) + 1
      } of ${activeAnimation.totalSteps} to ${activeAnimation.nodeId}.`;
    }
    if (interactionLocked) {
      return 'Animations in progress…';
    }
    return '';
  }, [activeAnimation, interactionLocked]);

  return (
    <div className="game-screen">
      <section className="board-panel card card--flush">
        <div className="board-panel__header">
          <h2>Battlefield</h2>
          <PlayerTrack players={players} nodes={view.nodes} currentPlayerId={view.currentPlayerId} />
        </div>
        <div className="board-panel__status" aria-live="polite">
          <div className="animation-status" data-locked={interactionLocked}>
            <span className="animation-status__dot" aria-hidden="true" />
            <span>{animationMessage || 'Ready for orders.'}</span>
          </div>
          <label className="animation-speed" htmlFor="animation-speed">
            <span className="animation-speed__label">Animation speed</span>
            <select
              id="animation-speed"
              value={animationSpeed}
              onChange={(event) => onAnimationSpeedChange?.(event.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
          </label>
        </div>
        <BoardCanvas
          nodes={view.nodes}
          edges={view.edges ?? []}
          playersById={playersById}
          onNodeSelect={onNodeSelect}
          selectedAttackerId={interaction.attackerId}
          targetNodeIds={targetNodeIds}
          reinforcementHighlights={reinforcementHighlights}
          gridDimensions={gridDimensions}
          highlightedEdges={highlightedEdges}
          currentPlayerId={view.currentPlayerId}
          activeAnimation={activeAnimation}
        />
      </section>
      <section className="turn-controls card">
        <div className="turn-controls__buttons">
          <button
            type="button"
            className="ghost-button"
            onClick={toggleLog}
            aria-pressed={logOpen}
          >
            Show Log
          </button>
          <button
            type="button"
            className="end-turn-button"
            onClick={onEndTurn}
            aria-label="End turn (keyboard shortcut: E)"
            disabled={logOpen || interactionLocked}
          >
            End Turn
          </button>
        </div>
      </section>
      {logOpen ? (
        <div className="event-panel overlay" role="dialog" aria-modal="true">
          <div className="event-panel__content card">
            <div className="event-panel__header">
              <h2>Event Log</h2>
              <button
                type="button"
                className="ghost-button event-panel__close"
                onClick={toggleLog}
                aria-label="Close event log"
              >
                Close Log
              </button>
            </div>
            <EventLog entries={eventLog} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { PlayerTrack, EventLog };
