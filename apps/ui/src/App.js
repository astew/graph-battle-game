import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import core from '@graph-battle/core';

const {
  GameEngine,
  StandardBoardGenerator,
  createEndTurnAction,
  createAttackAction,
  EventBus,
  EVENT_TYPES,
} = core;
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
const SLOT_RADIUS = NODE_RADIUS + 10;

function createEdgeKey(a, b) {
  if (!a || !b) {
    return '';
  }
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function buildAdjacencyMap(edges = []) {
  const map = new Map();
  for (const [a, b] of edges) {
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a).add(b);
    map.get(b).add(a);
  }
  return map;
}

function describeNode(node, playersById) {
  const owner = node.ownerId ? playersById.get(node.ownerId) : null;
  const ownerName = owner?.name ?? node.ownerId ?? 'Unclaimed';
  return `${node.id} controlled by ${ownerName} with strength ${node.strength}`;
}

function formatEventLogEntry(event, playersById) {
  const resolvePlayer = (playerId) => playersById.get(playerId)?.name ?? playerId;
  switch (event.type) {
    case EVENT_TYPES.GAME_STARTED:
      return `Match initialized for ${event.payload.players.length} players.`;
    case EVENT_TYPES.TURN_STARTED:
      return `${resolvePlayer(event.payload.turn.activePlayerId)} began turn ${event.payload.turn.number}.`;
    case EVENT_TYPES.TURN_ENDED:
      return `${resolvePlayer(event.payload.turn.activePlayerId)} ended turn ${event.payload.turn.number}.`;
    case EVENT_TYPES.ATTACK_RESOLVED:
      return `${resolvePlayer(event.payload.playerId)} attacked ${event.payload.defenderNodeId} from ${event.payload.attackerNodeId} (${event.payload.success ? 'victory' : 'defeat'}).`;
    case EVENT_TYPES.REINFORCEMENTS_AWARDED:
      return `${resolvePlayer(event.payload.playerId)} received ${event.payload.total} reinforcements.`;
    default:
      return '';
  }
}

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

function ReinforcementOverlay({ summary, playersById }) {
  if (!summary || summary.total === 0) {
    return null;
  }

  const owner = playersById.get(summary.playerId);
  return h(
    'div',
    {
      className: 'reinforcement-overlay',
      role: 'status',
      'aria-live': 'polite',
    },
    h('strong', null, `${owner?.name ?? summary.playerId} reinforced ${summary.total} nodes`),
    h(
      'ul',
      null,
      (summary.allocations ?? []).map((allocation) =>
        h('li', { key: allocation.nodeId }, `${allocation.nodeId}: +${allocation.amount}`)
      )
    )
  );
}

function BoardCanvas({
  nodes,
  edges,
  playersById,
  onNodeSelect,
  selectedAttackerId,
  targetNodeIds,
  actionableNodeIds,
  reinforcementHighlights,
  gridDimensions,
  highlightedEdges,
}) {
  if (!nodes || nodes.length === 0) {
    return h('div', { className: 'board-empty' }, 'Board unavailable');
  }

  const coordinates = nodes.map((node) => {
    const row = node.position?.row ?? 0;
    const column = node.position?.column ?? 0;
    const cx = column * GRID_SPACING + GRID_SPACING / 2;
    const cy = row * GRID_SPACING + GRID_SPACING / 2;
    const positionKey = `${row},${column}`;
    return { node, cx, cy, row, column, positionKey };
  });

  const derivedMaxRow = coordinates.reduce(
    (max, entry) => Math.max(max, entry.row),
    0
  );
  const derivedMaxColumn = coordinates.reduce(
    (max, entry) => Math.max(max, entry.column),
    0
  );
  const totalRows = Math.max(gridDimensions?.rows ?? derivedMaxRow + 1, 1);
  const totalColumns = Math.max(gridDimensions?.columns ?? derivedMaxColumn + 1, 1);
  const width = totalColumns * GRID_SPACING;
  const height = totalRows * GRID_SPACING;

  const nodeLookup = new Map(coordinates.map((entry) => [entry.node.id, entry]));
  const nodesByPosition = new Map(
    coordinates.map((entry) => [entry.positionKey, entry])
  );

  const actionableIds = actionableNodeIds ?? new Set();
  const targetIds = targetNodeIds ?? new Set();
  const reinforcementIds = reinforcementHighlights ?? new Set();
  const highlightedEdgeKeys = highlightedEdges ?? new Set();

  const slotElements = [];
  for (let row = 0; row < totalRows; row += 1) {
    for (let column = 0; column < totalColumns; column += 1) {
      const cx = column * GRID_SPACING + GRID_SPACING / 2;
      const cy = row * GRID_SPACING + GRID_SPACING / 2;
      const positionKey = `${row},${column}`;
      const occupied = nodesByPosition.has(positionKey);
      const slotClasses = ['board-slot'];
      if (occupied) {
        slotClasses.push('board-slot--occupied');
      }
      slotElements.push(
        h('circle', {
          key: `slot-${positionKey}`,
          className: slotClasses.join(' '),
          cx,
          cy,
          r: SLOT_RADIUS,
          'aria-hidden': 'true',
        })
      );
    }
  }

  const edgeElements = edges
    .map(([fromId, toId], index) => {
      const from = nodeLookup.get(fromId);
      const to = nodeLookup.get(toId);
      if (!from || !to) {
        return null;
      }

      const edgeKey = createEdgeKey(fromId, toId);
      const classes = ['board-edge'];
      if (highlightedEdgeKeys.has(edgeKey)) {
        classes.push('board-edge--highlighted');
      }

      return h('line', {
        key: `edge-${fromId}-${toId}-${index}`,
        x1: from.cx,
        y1: from.cy,
        x2: to.cx,
        y2: to.cy,
        className: classes.join(' '),
      });
    })
    .filter(Boolean);

  const handleNodeActivate = (nodeId) => {
    if (typeof onNodeSelect === 'function') {
      onNodeSelect(nodeId);
    }
  };

  const nodeElements = coordinates.map(({ node, cx, cy }) => {
    const owner = node.ownerId ? playersById.get(node.ownerId) : null;
    const fill = owner?.color ?? '#9CA3AF';
    const classes = ['board-node'];
    if (actionableIds.has(node.id)) {
      classes.push('board-node--actionable');
    }
    if (node.id === selectedAttackerId) {
      classes.push('board-node--selected');
    }
    if (targetIds.has(node.id)) {
      classes.push('board-node--targetable');
    }
    if (reinforcementIds.has(node.id)) {
      classes.push('board-node--reinforced');
    }
    const ariaLabel = describeNode(node, playersById);

    const onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNodeActivate(node.id);
      }
    };

    return h(
      'g',
      {
        key: node.id,
        className: classes.join(' '),
        transform: `translate(${cx} ${cy})`,
        tabIndex: 0,
        role: 'button',
        'aria-label': ariaLabel,
        onClick: () => handleNodeActivate(node.id),
        onKeyDown,
      },
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
    { className: 'board-canvas', role: 'application', 'aria-label': 'Battlefield' },
    h(
      'svg',
      {
        className: 'board-svg',
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: 'xMidYMid meet',
      },
      h('g', { className: 'board-slots' }, slotElements),
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
        'aria-label': 'End turn (keyboard shortcut: E)',
      },
      'End Turn'
    )
  );
}

function ActionPanel({
  interaction,
  onCancel,
  onEndTurn,
  actionMessage,
  reinforcementPreview,
}) {
  const instructions = {
    idle: 'Tap one of your nodes with strength ≥ 2 to begin planning an attack.',
    selectTarget: interaction.attackerId
      ? `Attacking from ${interaction.attackerId}. Choose a highlighted enemy node to resolve the attack.`
      : 'Tap a friendly node with enough strength first.',
  };
  const preview = reinforcementPreview ?? {};
  return h(
    'section',
    { className: 'action-panel card' },
    h('h2', null, 'Actions'),
    h('p', { className: 'action-panel__instruction' }, instructions[interaction.mode] ?? instructions.idle),
    actionMessage
      ? h('p', { className: 'action-panel__message' }, actionMessage)
      : null,
    h(
      'div',
      { className: 'action-panel__controls' },
      h(
        'button',
        {
          type: 'button',
          onClick: onCancel,
          className: 'ghost-button',
          'aria-label': 'Cancel current selection (keyboard shortcut: Escape)',
        },
        'Cancel Selection'
      ),
      h(
        'button',
        {
          type: 'button',
          onClick: onEndTurn,
          className: 'ghost-button',
          'aria-label': 'End turn (keyboard shortcut: E)',
        },
        'End Turn'
      )
    ),
    h(
      'div',
      { className: 'action-panel__preview' },
      h('strong', null, 'Next Reinforcement Estimate'),
      preview && preview.total > 0
        ? h(
            'p',
            null,
            `${preview.total} points across ${preview.eligibleNodeIds?.length ?? 0} border nodes (base ${preview.baseAmount ?? 0}${preview.remainder ? ` + ${preview.remainder} random` : ''})`
          )
        : h('p', null, 'Secure territory to earn reinforcements.')
    )
  );
}

function EventLog({ entries }) {
  if (!entries || entries.length === 0) {
    return h('div', { className: 'event-log__empty' }, 'No events yet.');
  }

  return h(
    'ol',
    { className: 'event-log' },
    entries.map((entry) => h('li', { key: entry.id }, entry.label))
  );
}

function GameScreen({
  view,
  players,
  onEndTurn,
  onNodeSelect,
  interaction,
  actionableNodeIds,
  targetNodeIds,
  eventLog,
  actionMessage,
  reinforcements,
  onCancel,
  reinforcementHighlights,
  gridDimensions,
  highlightedEdges,
}) {
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
      h(ReinforcementOverlay, {
        summary: reinforcements?.lastAwarded,
        playersById,
      }),
      h(BoardCanvas, {
        nodes: view.nodes,
        edges: view.edges ?? [],
        playersById,
        onNodeSelect,
        selectedAttackerId: interaction.attackerId,
        targetNodeIds,
        actionableNodeIds,
        reinforcementHighlights,
        gridDimensions,
        highlightedEdges,
      })
    ),
    h(
      'section',
      { className: 'player-panel card' },
      h('h2', null, 'Players'),
      h(PlayerList, { players, currentPlayerId: view.currentPlayerId })
    ),
    h(ActionPanel, {
      interaction,
      onCancel,
      onEndTurn,
      actionMessage,
      reinforcementPreview: reinforcements?.preview,
    }),
    h(
      'section',
      { className: 'event-panel card' },
      h('h2', null, 'Event Log'),
      h(EventLog, { entries: eventLog })
    )
  );
}

export default function App() {
  const engineRef = useRef(null);
  const subscriptionsRef = useRef([]);
  const playersRef = useRef(new Map());
  const logCounterRef = useRef(0);
  const [mode, setMode] = useState('menu');
  const [view, setView] = useState(null);
  const [players, setPlayers] = useState([]);
  const [interaction, setInteraction] = useState({ mode: 'idle', attackerId: null });
  const [eventLog, setEventLog] = useState([]);
  const [actionMessage, setActionMessage] = useState('');
  const [reinforcementHighlights, setReinforcementHighlights] = useState(new Set());

  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
      subscriptionsRef.current = [];
    };
  }, []);

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

  const attachEventBus = useCallback((eventBus) => {
    subscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
    subscriptionsRef.current = [
      eventBus.subscribe(EVENT_TYPES.GAME_STARTED, appendEventLog),
      eventBus.subscribe(EVENT_TYPES.TURN_STARTED, appendEventLog),
      eventBus.subscribe(EVENT_TYPES.TURN_ENDED, appendEventLog),
      eventBus.subscribe(EVENT_TYPES.ATTACK_RESOLVED, appendEventLog),
      eventBus.subscribe(EVENT_TYPES.REINFORCEMENTS_AWARDED, appendEventLog),
    ];
  }, [appendEventLog]);

  const startNewGame = useCallback(() => {
    const eventBus = new EventBus();
    playersRef.current = new Map(DEFAULT_PLAYERS.map((player) => [player.id, player]));
    setEventLog([]);
    logCounterRef.current = 0;
    attachEventBus(eventBus);
    const engine = new GameEngine({
      players: DEFAULT_PLAYERS,
      boardGenerator: new StandardBoardGenerator(),
      eventBus,
    });
    engineRef.current = engine;
    setPlayers(engine.getState().players);
    setView(engine.getView());
    setMode('playing');
    setInteraction({ mode: 'idle', attackerId: null });
    setActionMessage('Tap one of your nodes with at least 2 strength to begin an attack.');
    setReinforcementHighlights(new Set());
  }, [attachEventBus]);

  const endTurn = useCallback(() => {
    if (!engineRef.current) {
      return { ok: false, error: { code: 'core.error.noEngine', message: 'No active game.' } };
    }

    const { activePlayerId } = engineRef.current.getState().turn;
    const result = engineRef.current.applyAction(createEndTurnAction(activePlayerId));
    if (result.ok) {
      setView(engineRef.current.getView());
      setInteraction({ mode: 'idle', attackerId: null });
      setActionMessage('Turn ended. Await the next player.');
    }

    return result;
  }, []);

  const adjacencyMap = useMemo(() => buildAdjacencyMap(view?.edges ?? []), [view]);
  const nodesById = useMemo(() => {
    if (!view) {
      return new Map();
    }
    return new Map(view.nodes.map((node) => [node.id, node]));
  }, [view]);

  const actionableNodeIds = useMemo(() => {
    if (!view) {
      return new Set();
    }
    return new Set(
      view.nodes
        .filter((node) => node.ownerId === view.currentPlayerId && node.strength >= 2)
        .map((node) => node.id)
    );
  }, [view]);

  const targetNodeIds = useMemo(() => {
    if (!view || !interaction.attackerId) {
      return new Set();
    }
    const neighbors = adjacencyMap.get(interaction.attackerId) ?? new Set();
    const result = new Set();
    neighbors.forEach((neighborId) => {
      const neighbor = nodesById.get(neighborId);
      if (neighbor && neighbor.ownerId && neighbor.ownerId !== view.currentPlayerId) {
        result.add(neighborId);
      }
    });
    return result;
  }, [view, adjacencyMap, nodesById, interaction.attackerId]);

  const highlightedEdges = useMemo(() => {
    if (!interaction.attackerId || targetNodeIds.size === 0) {
      return new Set();
    }

    const result = new Set();
    targetNodeIds.forEach((targetId) => {
      result.add(createEdgeKey(interaction.attackerId, targetId));
    });
    return result;
  }, [interaction.attackerId, targetNodeIds]);

  const handleNodeSelect = useCallback(
    (nodeId) => {
      if (!engineRef.current || !view) {
        return;
      }
      const node = nodesById.get(nodeId);
      if (!node) {
        return;
      }

      if (node.ownerId === view.currentPlayerId) {
        if (node.strength < 2) {
          setActionMessage('Attacking nodes require at least 2 strength.');
          return;
        }
        const neighbors = adjacencyMap.get(node.id) ?? new Set();
        const hasTargets = Array.from(neighbors).some((neighborId) => {
          const neighbor = nodesById.get(neighborId);
          return neighbor && neighbor.ownerId && neighbor.ownerId !== view.currentPlayerId;
        });
        if (!hasTargets) {
          setActionMessage('No adjacent enemy nodes to attack from this position.');
          return;
        }
        setInteraction({ mode: 'selectTarget', attackerId: node.id });
        setActionMessage(`Attacking from ${node.id}. Choose a target.`);
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
          setActionMessage('Attack resolved. Tap another node or end your turn.');
        } else {
          setActionMessage(result.error?.message ?? 'Attack failed.');
        }
        return;
      }

      setActionMessage('Tap one of your nodes with enough strength to begin an attack.');
    },
    [adjacencyMap, interaction.attackerId, nodesById, targetNodeIds, view]
  );

  const handleCancel = useCallback(() => {
    setInteraction({ mode: 'idle', attackerId: null });
    setActionMessage('Selection cleared. Tap another node to plan an attack.');
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
      : h(GameScreen, {
          view,
          players,
          onEndTurn: endTurn,
          onNodeSelect: handleNodeSelect,
          interaction,
          actionableNodeIds,
          targetNodeIds,
          eventLog,
          actionMessage,
          reinforcements: view?.reinforcements,
          onCancel: handleCancel,
          reinforcementHighlights,
          gridDimensions: view?.grid,
          highlightedEdges,
        })
  );
}

export { TitleScreen, GameScreen, BoardCanvas, EventLog, formatEventLogEntry };
