import { GameEngine } from './engine/game-engine.js';
import { StandardBoardGenerator } from './board/standard-board-generator.js';
import { DEFAULT_PLAYER_COLORS, createPlayer } from './domain/entities.js';
import { createMulberry32 } from './rng/mulberry32.js';

const DEFAULT_ROWS = 8;
const DEFAULT_COLUMNS = 6;
const DEFAULT_NODES_PER_PLAYER = 6;
const DEFAULT_REINFORCEMENTS = 12;
const DEFAULT_ATTACK_WIN_PROBABILITY = 0.5;
const DEFAULT_PLAYER_COUNT = 5;

function normalizePlayers(players) {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('createStandardGame requires at least one player.');
  }

  return players.map((player, index) =>
    createPlayer({
      ...player,
      color: player.color ?? DEFAULT_PLAYER_COLORS[index % DEFAULT_PLAYER_COLORS.length],
    })
  );
}

function buildDefaultPlayers(count = DEFAULT_PLAYER_COUNT) {
  const safeCount = Math.max(1, count);
  return Array.from({ length: safeCount }, (_, index) => ({
    id: `player-${index + 1}`,
    color: DEFAULT_PLAYER_COLORS[index % DEFAULT_PLAYER_COLORS.length],
  }));
}

export function createStandardGame({
  rows = DEFAULT_ROWS,
  columns = DEFAULT_COLUMNS,
  nodesPerPlayer = DEFAULT_NODES_PER_PLAYER,
  initialReinforcements = DEFAULT_REINFORCEMENTS,
  attackWinProb = DEFAULT_ATTACK_WIN_PROBABILITY,
  maxNodes,
  players = buildDefaultPlayers(),
  rng = createMulberry32(Date.now()),
} = {}) {
  if (!Number.isInteger(nodesPerPlayer) || nodesPerPlayer <= 0) {
    throw new Error('nodesPerPlayer must be a positive integer.');
  }

  if (!Number.isInteger(rows) || rows <= 0) {
    throw new Error('rows must be a positive integer.');
  }

  if (!Number.isInteger(columns) || columns <= 0) {
    throw new Error('columns must be a positive integer.');
  }

  const playerList = normalizePlayers(players);
  const gridCapacity = rows * columns;
  const requestedNodes = nodesPerPlayer * playerList.length;

  if (maxNodes != null) {
    if (!Number.isInteger(maxNodes) || maxNodes <= 0) {
      throw new Error('maxNodes must be a positive integer when provided.');
    }

    if (requestedNodes > maxNodes) {
      throw new Error('Requested nodes exceed the maxNodes constraint.');
    }
  }

  if (requestedNodes > gridCapacity) {
    throw new Error('Requested nodes exceed available grid capacity.');
  }

  const boardGenerator = new StandardBoardGenerator({
    rows,
    columns,
    targetNodeCount: requestedNodes,
    nodesPerPlayer,
    strengthPerPlayer: initialReinforcements,
  });

  return new GameEngine({
    players: playerList,
    boardGenerator,
    rng,
    attackWinProbability: attackWinProb,
  });
}
