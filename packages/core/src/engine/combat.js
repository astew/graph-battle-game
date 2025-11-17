import { createNodeState } from '../domain/entities.js';

export const ATTACK_INELIGIBILITY_REASONS = Object.freeze({
  NOT_OWNER: 'attackerNotOwned',
  INVALID_DEFENDER: 'invalidDefender',
  NOT_ADJACENT: 'notAdjacent',
  INSUFFICIENT_STRENGTH: 'insufficientStrength',
});

export function canExecuteAttack({ board, playerId, attackerId, defenderId }) {
  if (!board) {
    throw new Error('board is required to evaluate attacks.');
  }
  if (typeof playerId !== 'string' || playerId.length === 0) {
    throw new Error('playerId is required to evaluate attacks.');
  }
  if (typeof attackerId !== 'string' || attackerId.length === 0) {
    throw new Error('attackerId is required to evaluate attacks.');
  }
  if (typeof defenderId !== 'string' || defenderId.length === 0) {
    throw new Error('defenderId is required to evaluate attacks.');
  }

  const attackerNode = board.nodes.get(attackerId) ?? null;
  const defenderNode = board.nodes.get(defenderId) ?? null;

  if (!attackerNode || !defenderNode) {
    throw new Error(
      `Board state is missing expected nodes for attack evaluation: attacker=${attackerId}, defender=${defenderId}`
    );
  }

  if (attackerNode.ownerId !== playerId) {
    return {
      ok: false,
      reason: ATTACK_INELIGIBILITY_REASONS.NOT_OWNER,
      message: 'Attacker node does not belong to the player.',
    };
  }

  if (!defenderNode.ownerId || defenderNode.ownerId === playerId) {
    return {
      ok: false,
      reason: ATTACK_INELIGIBILITY_REASONS.INVALID_DEFENDER,
      message: 'Defender must be owned by an opponent.',
    };
  }

  const adjacency = board.adjacency.get(attackerNode.id);
  if (!adjacency || !adjacency.has(defenderNode.id)) {
    return {
      ok: false,
      reason: ATTACK_INELIGIBILITY_REASONS.NOT_ADJACENT,
      message: 'Attacker and defender must be adjacent.',
    };
  }

  if (!Number.isInteger(attackerNode.strength) || attackerNode.strength < 2) {
    return {
      ok: false,
      reason: ATTACK_INELIGIBILITY_REASONS.INSUFFICIENT_STRENGTH,
      message: 'Attacker must have at least 2 strength to initiate an attack.',
    };
  }

  return {
    ok: true,
    attackerNode: createNodeState(attackerNode),
    defenderNode: createNodeState(defenderNode),
    adjacency,
  };
}
