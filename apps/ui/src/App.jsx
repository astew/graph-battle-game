import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import core from '@graph-battle/core';
import GameScreen from './components/GameScreen.jsx';
import TitleScreen from './components/TitleScreen.jsx';
import { formatEventLogEntry, DEFAULT_PLAYERS } from './utils/gameHelpers.js';
import useDisplayInterpolator from './useDisplayInterpolator.js';
import { ATTACK_ITERATION_MS, REINFORCEMENT_STEP_MS } from './constants.js';

const STANDARD_BOARD_DIMENSIONS = Object.freeze({ rows: 7, columns: 6 });

const {
  GameEngine,
  StandardBoardGenerator,
  createEndTurnAction,
  createAttackAction,
  EventBus,
  EVENT_TYPES,
  canExecuteAttack,
} = core ?? {};

const missingCoreExports = Object.entries({
  GameEngine,
  StandardBoardGenerator,
  createEndTurnAction,
  createAttackAction,
  EventBus,
  EVENT_TYPES,
  canExecuteAttack,
}).filter(([, value]) => typeof value === 'undefined');

if (missingCoreExports.length > 0) {
  const names = missingCoreExports.map(([key]) => key).join(', ');
  throw new Error(`Failed to load @graph-battle/core exports: ${names}`);
}


export default function App() {
  const engineRef = useRef(null);
  const subscriptionsRef = useRef([]);
  const playersRef = useRef(new Map());
  const logCounterRef = useRef(0);
  const eventBusRef = useRef(null);
  const reinforcementLockRef = useRef(false);
  const [mode, setMode] = useState('menu');
  const [view, setView] = useState(null);
  const [players, setPlayers] = useState([]);
  const [interaction, setInteraction] = useState({ mode: 'idle', attackerId: null });
  const [eventLog, setEventLog] = useState([]);
  const [reinforcementHighlights, setReinforcementHighlights] = useState(new Set());
  const [animationSpeed, setAnimationSpeed] = useState('normal');

  const [displayView, activeAnimation, isInteractionLocked] = useDisplayInterpolator(eventBusRef.current, view, () => engineRef.current?.getView(), animationSpeed);

  const interactionLocked = isInteractionLocked || reinforcementLockRef.current;

  useEffect(() => {
    playersRef.current = new Map(players.map((player) => [player.id, player]));
  }, [players]);

  const appendEventLog = useCallback((event) => {
    const label = formatEventLogEntry(event, playersRef.current);
    if (!label) {
      return;
    }
    logCounterRef.current += 1;
    const entry = { id: `${event.type}-${logCounterRef.current}`, label };
    setEventLog((previous) => [entry, ...previous].slice(0, 30));
  }, []);

  const attachEventBus = useCallback(
    (eventBus) => {
      subscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
      subscriptionsRef.current = [
        eventBus.subscribe(EVENT_TYPES.GAME_STARTED, appendEventLog),
        eventBus.subscribe(EVENT_TYPES.TURN_STARTED, appendEventLog),
        eventBus.subscribe(EVENT_TYPES.TURN_ENDED, appendEventLog),
        eventBus.subscribe(EVENT_TYPES.TURN_SKIPPED, appendEventLog),
        eventBus.subscribe(EVENT_TYPES.REINFORCEMENTS_AWARDED, (event) => {
          appendEventLog(event);
          reinforcementLockRef.current = false;
        }),
      ];
    },
    [activeAnimation, appendEventLog]
  );

  const startNewGame = useCallback(() => {
    const eventBus = new EventBus();
    eventBusRef.current = eventBus;
    playersRef.current = new Map(DEFAULT_PLAYERS.map((player) => [player.id, player]));
    setEventLog([]);
    logCounterRef.current = 0;
    attachEventBus(eventBus);
    const engine = new GameEngine({
      players: DEFAULT_PLAYERS,
      boardGenerator: new StandardBoardGenerator(STANDARD_BOARD_DIMENSIONS),
      eventBus,
    });
    engineRef.current = engine;
    setPlayers(engine.getState().players);
    setView(engine.getView());
    setMode('playing');
    setInteraction({ mode: 'idle', attackerId: null });
    setReinforcementHighlights(new Set());
    reinforcementLockRef.current = false;
  }, [attachEventBus]);

  const endTurn = useCallback(() => {
    if (!engineRef.current || interactionLocked) {
      return { ok: false, error: { code: 'core.error.noEngine', message: 'No active game.' } };
    }

    const { activePlayerId } = engineRef.current.getState().turn;
    const result = engineRef.current.applyAction(createEndTurnAction(activePlayerId));
    if (result.ok) {
      setView(engineRef.current.getView());
      setInteraction({ mode: 'idle', attackerId: null });
    }

    return result;
  }, [interactionLocked]);

  const nodesById = useMemo(() => {
    if (!displayView) {
      return new Map();
    }
    return new Map(displayView.nodes.map((node) => [node.id, node]));
  }, [displayView]);

  const targetNodeIds = useMemo(() => {
    if (!view || !interaction.attackerId || !engineRef.current) {
      return new Set();
    }

    const state = engineRef.current.getState();
    const adjacency = state.board.adjacency.get(interaction.attackerId);
    if (!adjacency) {
      return new Set();
    }

    const result = new Set();
    adjacency.forEach((candidateId) => {
      const evaluation = canExecuteAttack({
        board: state.board,
        playerId: state.turn.activePlayerId,
        attackerId: interaction.attackerId,
        defenderId: candidateId,
      });
      if (evaluation.ok) {
        result.add(candidateId);
      }
    });
    return result;
  }, [interaction.attackerId, view]);

  const highlightedEdges = useMemo(() => {
    if (!interaction.attackerId || targetNodeIds.size === 0) {
      return new Set();
    }
    return new Set(
      displayView.nodes
        .filter((node) => node.ownerId === displayView.currentPlayerId && node.strength >= 2)
        .map((node) => node.id)
    );
  }, [displayView, interaction.attackerId, targetNodeIds]);

  const handleNodeSelect = useCallback(
    (nodeId) => {
      if (!engineRef.current || !view || interactionLocked) {
        return;
      }
      const node = nodesById.get(nodeId);
      if (!node) {
        return;
      }

      if (node.ownerId === view.currentPlayerId) {
        if (interaction.attackerId === node.id) {
          setInteraction({ mode: 'idle', attackerId: null });
          return;
        }

        setInteraction({ mode: 'selectTarget', attackerId: node.id });

        return;
      }

      if (interaction.attackerId && targetNodeIds.has(node.id)) {
        const result = engineRef.current.applyAction(
          createAttackAction({
            playerId: view.currentPlayerId,
            attackerId: interaction.attackerId,
            defenderId: node.id,
          })
        );
        if (result.ok) {
          setView(engineRef.current.getView());
          setInteraction({ mode: 'idle', attackerId: null });
        } else {
          throw result.error ?? new Error('Attack failed.');
        }
        return;
      }

      return;
    },
    [interaction.attackerId, interactionLocked, nodesById, targetNodeIds, view]
  );

  const handleCancel = useCallback(() => {
    setInteraction({ mode: 'idle', attackerId: null });
  }, []);

  useEffect(() => {
    if (mode !== 'playing') {
      return undefined;
    }
    const listener = (event) => {
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        endTurn();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [mode, endTurn, handleCancel]);

  useEffect(() => {
    if (!view || !view.reinforcements) {
      setReinforcementHighlights(new Set());
      return;
    }
    const summary = view.reinforcements.lastAwarded;
    if (!summary || !summary.allocations) {
      setReinforcementHighlights(new Set());
      return;
    }
    const ids = new Set(summary.allocations.map((allocation) => allocation.nodeId));
    setReinforcementHighlights(ids);
    if (ids.size === 0) {
      return undefined;
    }
    const timer = setTimeout(() => setReinforcementHighlights(new Set()), 3500);
    return () => clearTimeout(timer);
  }, [view]);

  const header = (
    <header className="app-header">
      <p className="eyebrow">Prototype</p>
      <h1>Graph Battle</h1>
      <p className="lede">
        A turn-based free-for-all played on a connected graph. This preview now renders the standard
        board layout so we can iterate on combat UI.
      </p>
    </header>
  );

  const shellClassName = ['app-shell', `app-shell--${mode}`].join(' ');

  return (
    <main className={shellClassName}>
      <div className="app-stage">
        {mode === 'menu' ? (
          <>
            {header}
            <TitleScreen onNewGame={startNewGame} />
          </>
        ) : (
            <GameScreen
              view={displayView}
              players={players}
              onEndTurn={endTurn}
              onNodeSelect={handleNodeSelect}
              interaction={interaction}
              targetNodeIds={targetNodeIds}
              eventLog={eventLog}
              reinforcementHighlights={reinforcementHighlights}
              gridDimensions={displayView?.grid}
              highlightedEdges={highlightedEdges}
              activeAnimation={activeAnimation}
              interactionLocked={interactionLocked}
              animationSpeed={animationSpeed}
              onAnimationSpeedChange={setAnimationSpeed}
            />
          )}
        </div>
      </main>
  );
}

