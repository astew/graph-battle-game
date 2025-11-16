const { createBotContext, createDoNothingBot } = require('@graph-battle/bots');
const { DEFAULT_PLAYER_COLORS } = require('@graph-battle/core');

function createSimulationConfig(players, botFactory) {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('Simulation requires at least one player');
  }

  return {
    players,
    botFactory,
  };
}

function describeSimulation(config, snapshot) {
  const { players } = config;
  const currentPlayer =
    snapshot.currentPlayerId ??
    snapshot.currentPlayer ??
    snapshot.turn?.activePlayerId ??
    'unknown';
  return `Simulation with ${players.length} players; current player: ${currentPlayer}`;
}

function runCli() {
  const players = DEFAULT_PLAYER_COLORS.slice(0, 2);
  const config = createSimulationConfig(players, (color) => createDoNothingBot(color));
  const context = createBotContext(config.players[0]);
  return describeSimulation(config, context.snapshot);
}

if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log(runCli());
}

module.exports = {
  createSimulationConfig,
  describeSimulation,
  runCli,
};
