const { createEmptySnapshot } = require('@graph-battle/core');

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
  return {
    snapshot: createEmptySnapshot(currentPlayer),
  };
}

module.exports = {
  createDoNothingBot,
  createBotContext,
};
