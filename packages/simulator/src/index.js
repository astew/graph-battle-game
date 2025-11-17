import { fileURLToPath } from 'node:url';

import { createBotContext, createDoNothingBot } from '@graph-battle/bots';
import { DEFAULT_PLAYER_COLORS } from '@graph-battle/core';

export function createSimulationConfig(players, botFactory) {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('Simulation requires at least one player');
  }

  return {
    players,
    botFactory,
  };
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

export function runCli() {
  const players = DEFAULT_PLAYER_COLORS.slice(0, 2);
  const config = createSimulationConfig(players, (color) => createDoNothingBot(color));
  const context = createBotContext(config.players[0]);
  return describeSimulation(config, context.snapshot);
}

const simulatorApi = Object.freeze({
  createSimulationConfig,
  describeSimulation,
  runCli,
});

export default simulatorApi;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // eslint-disable-next-line no-console
  console.log(runCli());
}
