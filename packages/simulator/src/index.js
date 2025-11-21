import { fileURLToPath } from 'node:url';

import {
  createDeterministicPolicy,
  createRandomPolicy,
  createSimplePolicy,
  executePolicyTurn,
} from '@graph-battle/bots';
import {
  DEFAULT_PLAYER_COLORS,
  GameEngine,
  StandardBoardGenerator,
  EventBus,
  createMulberry32,
} from '@graph-battle/core';

export function createSimulationConfig({ players, policyFactory, policyName }) {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('Simulation requires at least one player');
  }
  if (typeof policyFactory !== 'function') {
    throw new Error('Simulation requires a policyFactory(player) function');
  }

  return {
    players,
    policyFactory,
    policyName: policyName ?? policyFactory.name ?? 'policy',
  };
}

function detectWinner(board) {
  const owners = new Set();
  for (const node of board.nodes.values()) {
    if (node.ownerId) {
      owners.add(node.ownerId);
      if (owners.size > 1) {
        return null;
      }
    }
  }

  if (owners.size === 1) {
    return owners.values().next().value;
  }
  return null;
}

export function describeSimulation(config, snapshot) {
  const { players } = config;
  const currentPlayer =
    snapshot.currentPlayerId ??
    snapshot.currentPlayer ??
    snapshot.turn?.activePlayerId ??
    'unknown';
  return `Simulation with ${players.length} players; current player: ${currentPlayer}`;
}

export function runSingleGame(config, { seed, maxTurns } = {}) {
  const rng = typeof seed === 'number' ? createMulberry32(seed) : undefined;
  const generator = new StandardBoardGenerator();
  const engine = new GameEngine({
    players: config.players,
    boardGenerator: generator,
    eventBus: new EventBus(),
    rng,
  });
  const policies = config.players.map((player, index) => config.policyFactory(player, index));
  const limit = maxTurns ?? config.players.length * 200;
  let turns = 0;

  while (turns < limit) {
    const state = engine.getState();
    const winnerId = detectWinner(state.board);
    if (winnerId) {
      return { winnerId, turns };
    }

    const policy = policies[state.turn.orderIndex];
    executePolicyTurn(engine, policy, { rng });
    turns += 1;
  }

  return { winnerId: null, turns: limit };
}

export function runGames(config, { games = 1, seed = Date.now(), maxTurns } = {}) {
  if (!Number.isInteger(games) || games <= 0) {
    throw new Error('games must be a positive integer');
  }

  const wins = new Map(config.players.map((player) => [player.id, 0]));
  let draws = 0;
  let totalTurns = 0;

  for (let i = 0; i < games; i += 1) {
    const result = runSingleGame(config, { seed: typeof seed === 'number' ? seed + i : undefined, maxTurns });
    totalTurns += result.turns;
    if (result.winnerId) {
      wins.set(result.winnerId, (wins.get(result.winnerId) ?? 0) + 1);
    } else {
      draws += 1;
    }
  }

  return {
    games,
    draws,
    averageTurns: games > 0 ? totalTurns / games : 0,
    wins: Object.fromEntries(wins),
    seed,
    policy: config.policyName ?? 'policy',
  };
}

function createDefaultPlayers() {
  return DEFAULT_PLAYER_COLORS.map((color, index) => ({
    id: `player-${index + 1}`,
    name: color,
    color,
  }));
}

function formatSummary(summary) {
  return JSON.stringify(summary);
}

function parseCliArgs(argv) {
  const defaults = { games: 1, seed: undefined, policy: 'simple' };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--games=')) {
      defaults.games = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--seed=')) {
      defaults.seed = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--policy=')) {
      defaults.policy = arg.split('=')[1];
    }
  }
  return defaults;
}

export function runCli(argv = process.argv) {
  const args = parseCliArgs(argv);
  const players = createDefaultPlayers();
  const policyFactory = () => {
    if (args.policy === 'random') {
      return createRandomPolicy();
    }
    if (args.policy === 'deterministic') {
      return createDeterministicPolicy();
    }
    return createSimplePolicy();
  };
  const config = createSimulationConfig({
    players,
    policyFactory,
    policyName: args.policy,
  });
  const summary = runGames(config, { games: args.games, seed: args.seed });
  return formatSummary(summary);
}

const simulatorApi = Object.freeze({
  createSimulationConfig,
  describeSimulation,
  runSingleGame,
  runGames,
  runCli,
});

export default simulatorApi;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // eslint-disable-next-line no-console
  console.log(runCli());
}
