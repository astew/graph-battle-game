export const ACTION_TYPES = Object.freeze({
  END_TURN: 'core.action.endTurn',
  ATTACK: 'core.action.attack',
});

export function createEndTurnAction(playerId) {
  if (typeof playerId !== 'string' || playerId.length === 0) {
    throw new Error('playerId is required for end turn action.');
  }

  return Object.freeze({
    type: ACTION_TYPES.END_TURN,
    playerId,
  });
}

export function createAttackAction({ playerId, attackerId, defenderId }) {
  if (typeof playerId !== 'string' || playerId.length === 0) {
    throw new Error('playerId is required for attack actions.');
  }

  if (typeof attackerId !== 'string' || attackerId.length === 0) {
    throw new Error('attackerId is required for attack actions.');
  }

  if (typeof defenderId !== 'string' || defenderId.length === 0) {
    throw new Error('defenderId is required for attack actions.');
  }

  return Object.freeze({
    type: ACTION_TYPES.ATTACK,
    playerId,
    attackerId,
    defenderId,
  });
}

export function validateAction(action) {
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

  if (action.type === ACTION_TYPES.ATTACK) {
    if (typeof action.playerId !== 'string' || action.playerId.length === 0) {
      throw new Error('Attack actions require a playerId.');
    }

    if (typeof action.attackerId !== 'string' || action.attackerId.length === 0) {
      throw new Error('Attack actions require an attackerId.');
    }

    if (typeof action.defenderId !== 'string' || action.defenderId.length === 0) {
      throw new Error('Attack actions require a defenderId.');
    }
  }
}
