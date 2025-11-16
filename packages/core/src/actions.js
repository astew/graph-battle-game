const ACTION_TYPES = Object.freeze({
  END_TURN: 'core.action.endTurn',
});

function createEndTurnAction(playerId) {
  if (typeof playerId !== 'string' || playerId.length === 0) {
    throw new Error('playerId is required for end turn action.');
  }

  return Object.freeze({
    type: ACTION_TYPES.END_TURN,
    playerId,
  });
}

function validateAction(action) {
  if (!action || typeof action !== 'object') {
    throw new Error('Action must be an object.');
  }

  if (!Object.values(ACTION_TYPES).includes(action.type)) {
    throw new Error(`Unsupported action type: ${action.type}`);
  }

  if (action.type === ACTION_TYPES.END_TURN) {
    if (typeof action.playerId !== 'string' || action.playerId.length === 0) {
      throw new Error('End turn actions require a playerId.');
    }
  }
}

module.exports = {
  ACTION_TYPES,
  createEndTurnAction,
  validateAction,
};
