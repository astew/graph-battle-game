function normalizePlayerId(player) {
  if (typeof player === 'string' && player.length > 0) {
    return player;
  }

  if (player && typeof player.id === 'string' && player.id.length > 0) {
    return player.id;
  }

  throw new Error('A player id is required to create a bot context.');
}

function createEmptySnapshot(currentPlayerId) {
  return Object.freeze({
    nodes: [],
    turnNumber: 1,
    currentPlayerId,
    // Maintain backwards compatibility with older helpers that relied on
    // `currentPlayer` instead of the new `currentPlayerId` name.
    currentPlayer: currentPlayerId,
  });
}

function createDoNothingBot(color) {
  const name = `${color}-idle-bot`;
  return {
    name,
    selectAction(context) {
      return {
        attackerNodeId: null,
        targetNodeId: null,
        snapshot: context.snapshot,
      };
    },
  };
}

function createBotContext(currentPlayer) {
  const playerId = normalizePlayerId(currentPlayer);
  return {
    snapshot: createEmptySnapshot(playerId),
  };
}

module.exports = {
  createDoNothingBot,
  createBotContext,
  createEmptySnapshot,
};
