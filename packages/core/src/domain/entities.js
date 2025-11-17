const DEFAULT_PLAYER_COLORS = ['red', 'green', 'yellow', 'blue', 'purple'];

function createPlayer(config) {
  if (!config || typeof config.id !== 'string' || config.id.length === 0) {
    throw new Error('Player id must be a non-empty string.');
  }

  const color = config.color ?? DEFAULT_PLAYER_COLORS[0];

  return Object.freeze({
    id: config.id,
    color,
    name: config.name ?? config.id,
  });
}

function normalizePosition(position) {
  if (position == null) {
    return undefined;
  }

  if (typeof position !== 'object') {
    throw new Error('position must be an object when provided.');
  }

  const { row, column } = position;
  if (!Number.isInteger(row) || row < 0) {
    throw new Error('position.row must be a non-negative integer.');
  }

  if (!Number.isInteger(column) || column < 0) {
    throw new Error('position.column must be a non-negative integer.');
  }

  return Object.freeze({ row, column });
}

function createNodeState({ id, ownerId = null, strength = 0, position = undefined }) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Node id must be a non-empty string.');
  }

  if (ownerId !== null && typeof ownerId !== 'string') {
    throw new Error('ownerId must be null or a string.');
  }

  if (!Number.isInteger(strength) || strength < 0) {
    throw new Error('strength must be a non-negative integer.');
  }

  const normalizedPosition = normalizePosition(position);

  return Object.freeze({ id, ownerId, strength, position: normalizedPosition });
}

function normalizeDimensions(dimensions) {
  if (dimensions == null) {
    return undefined;
  }

  if (typeof dimensions !== 'object') {
    throw new Error('dimensions must be an object when provided.');
  }

  const { rows, columns } = dimensions;
  if (!Number.isInteger(rows) || rows <= 0) {
    throw new Error('dimensions.rows must be a positive integer.');
  }

  if (!Number.isInteger(columns) || columns <= 0) {
    throw new Error('dimensions.columns must be a positive integer.');
  }

  return Object.freeze({ rows, columns });
}

function createBoardState({ nodes = [], edges = [], dimensions = undefined }) {
  const nodeMap = new Map();
  for (const node of nodes) {
    if (nodeMap.has(node.id)) {
      throw new Error(`Duplicate node id detected: ${node.id}`);
    }

    nodeMap.set(node.id, createNodeState(node));
  }

  const adjacency = new Map();
  for (const nodeId of nodeMap.keys()) {
    adjacency.set(nodeId, new Set());
  }

  const normalizedEdges = [];
  for (const [a, b] of edges) {
    if (!nodeMap.has(a) || !nodeMap.has(b)) {
      throw new Error(`Edge references unknown node: ${a}, ${b}`);
    }

    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
    normalizedEdges.push([a, b]);
  }

  return Object.freeze({
    nodes: nodeMap,
    adjacency,
    edges: normalizedEdges,
    dimensions: normalizeDimensions(dimensions),
  });
}

function createTurnState({ number = 1, orderIndex = 0, activePlayerId }) {
  if (typeof activePlayerId !== 'string' || activePlayerId.length === 0) {
    throw new Error('activePlayerId is required.');
  }

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error('Turn number must be a positive integer.');
  }

  if (!Number.isInteger(orderIndex) || orderIndex < 0) {
    throw new Error('orderIndex must be a non-negative integer.');
  }

  return Object.freeze({ number, orderIndex, activePlayerId });
}

function createGameState({ board, players, turn }) {
  if (!board) {
    throw new Error('GameState requires a board.');
  }

  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('GameState requires at least one player.');
  }

  const normalizedPlayers = players.map((player, index) => createPlayer({
    ...player,
    color: player.color ?? DEFAULT_PLAYER_COLORS[index % DEFAULT_PLAYER_COLORS.length],
  }));
  const safeTurn = turn ??
    createTurnState({ activePlayerId: normalizedPlayers[0].id, number: 1, orderIndex: 0 });

  return Object.freeze({
    board,
    players: normalizedPlayers,
    turn: safeTurn,
  });
}

function advanceTurnState(turn, players) {
  if (!turn) {
    throw new Error('turn is required to advance.');
  }

  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('players must be a non-empty array.');
  }

  const nextOrderIndex = (turn.orderIndex + 1) % players.length;
  const wrapsAround = nextOrderIndex === 0;
  const nextNumber = wrapsAround ? turn.number + 1 : turn.number;
  const nextPlayer = players[nextOrderIndex];

  return createTurnState({
    number: nextNumber,
    orderIndex: nextOrderIndex,
    activePlayerId: nextPlayer.id ?? nextPlayer,
  });
}

module.exports = {
  DEFAULT_PLAYER_COLORS,
  createPlayer,
  createNodeState,
  createBoardState,
  normalizeDimensions,
  createTurnState,
  createGameState,
  advanceTurnState,
  normalizePosition,
};
