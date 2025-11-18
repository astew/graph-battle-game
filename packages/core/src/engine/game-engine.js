import { ACTION_TYPES, validateAction } from '../actions.js';
import { EmptyBoardGenerator } from '../board/empty-board-generator.js';
import {
  createGameState,
  advanceTurnState,
  createNodeState,
} from '../domain/entities.js';
import { EventBus, EVENT_TYPES } from '../events/index.js';
import {
  allocateReinforcements,
  evaluateReinforcements,
} from './reinforcements.js';
import { canExecuteAttack } from './combat.js';

export const ERROR_CODES = Object.freeze({
  OUT_OF_TURN: 'core.error.outOfTurn',
  INVALID_ATTACK: 'core.error.invalidAttack',
});

export class GameEngine {
  constructor({ players, boardGenerator = new EmptyBoardGenerator(), eventBus = new EventBus(), rng } = {}) {
    if (!Array.isArray(players) || players.length === 0) {
      throw new Error('GameEngine requires at least one player.');
    }

    this.eventBus = eventBus;
    this.boardGenerator = boardGenerator;
    this.rng = rng;
    const baseState = createGameState({
      board: this.boardGenerator.generate({ players, rng }),
      players,
    });
    this.state = Object.freeze({
      ...baseState,
      lastReinforcements: null,
    });

    this.eventBus.publish({
      type: EVENT_TYPES.GAME_STARTED,
      payload: { players: this.state.players },
    });
    this.eventBus.publish({
      type: EVENT_TYPES.TURN_STARTED,
      payload: { turn: this.state.turn },
    });
  }

  getState() {
    return this.state;
  }

  getView() {
    const boardDimensions = this.state.board.dimensions;
    return {
      currentPlayerId: this.state.turn.activePlayerId,
      turnNumber: this.state.turn.number,
      nodes: Array.from(this.state.board.nodes.values()).map((node) => ({
        ...node,
        position: node.position ? { ...node.position } : undefined,
      })),
      edges: Array.isArray(this.state.board.edges)
        ? this.state.board.edges.map(([a, b]) => [a, b])
        : [],
      grid: boardDimensions ? { ...boardDimensions } : undefined,
      reinforcements: {
        preview: evaluateReinforcements(
          this.state.board,
          this.state.turn.activePlayerId
        ),
        lastAwarded: this.state.lastReinforcements,
      },
    };
  }

  applyAction(action) {
    validateAction(action);

    switch (action.type) {
      case ACTION_TYPES.END_TURN:
        return this.#handleEndTurn(action);
      case ACTION_TYPES.ATTACK:
        return this.#handleAttack(action);
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  #handleAttack(action) {
    if (action.playerId !== this.state.turn.activePlayerId) {
      return {
        ok: false,
        error: {
          code: ERROR_CODES.OUT_OF_TURN,
          message: 'It is not this player\'s turn.',
        },
      };
    }

    const evaluation = canExecuteAttack({
      board: this.state.board,
      playerId: action.playerId,
      attackerId: action.attackerId,
      defenderId: action.defenderId,
    });

    if (!evaluation.ok) {
      return this.#invalidAttack(evaluation.message);
    }

    const { attackerNode, defenderNode } = evaluation;

    const outcome = this.#resolveAttack(attackerNode, defenderNode);

    const updatedNodes = new Map(this.state.board.nodes);

    let updatedAttackerNode;
    let updatedDefenderNode;
    if (outcome.success) {
      const transferStrength = Math.max(outcome.attackerStrength - 1, 0);
      updatedAttackerNode = createNodeState({
        ...attackerNode,
        strength: 1,
      });
      updatedDefenderNode = createNodeState({
        ...defenderNode,
        ownerId: attackerNode.ownerId,
        strength: transferStrength,
      });
    } else {
      updatedAttackerNode = createNodeState({
        ...attackerNode,
        strength: outcome.attackerStrength,
      });
      updatedDefenderNode = createNodeState({
        ...defenderNode,
        strength: outcome.defenderStrength,
      });
    }

    updatedNodes.set(updatedAttackerNode.id, updatedAttackerNode);
    updatedNodes.set(updatedDefenderNode.id, updatedDefenderNode);

    const updatedBoard = Object.freeze({
      ...this.state.board,
      nodes: updatedNodes,
    });

    this.state = Object.freeze({
      ...this.state,
      board: updatedBoard,
    });

    this.eventBus.publish({
      type: EVENT_TYPES.ATTACK_RESOLVED,
      payload: {
        playerId: action.playerId,
        attackerNodeId: attackerNode.id,
        defenderNodeId: defenderNode.id,
        success: outcome.success,
        rounds: outcome.rounds,
        attackerStrength: updatedAttackerNode.strength,
        defenderStrength: updatedDefenderNode.strength,
        newOwnerId: updatedDefenderNode.ownerId,
      },
    });

    return { ok: true, state: this.state };
  }

  #handleEndTurn(action) {
    if (action.playerId !== this.state.turn.activePlayerId) {
      return {
        ok: false,
        error: {
          code: ERROR_CODES.OUT_OF_TURN,
          message: 'It is not this player\'s turn.',
        },
      };
    }

    this.eventBus.publish({
      type: EVENT_TYPES.TURN_ENDED,
      payload: { turn: this.state.turn },
    });

    const reinforcements = this.#awardReinforcements(action.playerId);
    if (reinforcements) {
      this.eventBus.publish({
        type: EVENT_TYPES.REINFORCEMENTS_AWARDED,
        payload: reinforcements,
      });
    }

    const { nextTurn, skipped } = this.#advanceToNextEligibleTurn(this.state.turn);
    this.state = Object.freeze({
      ...this.state,
      turn: nextTurn,
    });

    skipped.forEach((skippedTurn) => {
      this.eventBus.publish({
        type: EVENT_TYPES.TURN_SKIPPED,
        payload: { turn: skippedTurn },
      });
    });

    this.eventBus.publish({
      type: EVENT_TYPES.TURN_STARTED,
      payload: { turn: nextTurn },
    });

    return { ok: true, state: this.state };
  }

  #awardReinforcements(playerId) {
    const summary = allocateReinforcements({
      board: this.state.board,
      playerId,
      random: () => this.#nextRandom(),
    });

    if (summary.total === 0 || summary.eligibleNodeIds.length === 0) {
      this.state = Object.freeze({
        ...this.state,
        lastReinforcements: summary,
      });
      return summary;
    }

    const updatedNodes = new Map(this.state.board.nodes);
    for (const allocation of summary.allocations) {
      const currentNode = this.state.board.nodes.get(allocation.nodeId);
      if (!currentNode) {
        continue;
      }

      const updatedNode = createNodeState({
        ...currentNode,
        strength: currentNode.strength + allocation.amount,
      });
      updatedNodes.set(updatedNode.id, updatedNode);
    }

    const updatedBoard = Object.freeze({
      ...this.state.board,
      nodes: updatedNodes,
    });

    this.state = Object.freeze({
      ...this.state,
      board: updatedBoard,
      lastReinforcements: summary,
    });

    return summary;
  }

  #invalidAttack(message) {
    return {
      ok: false,
      error: {
        code: ERROR_CODES.INVALID_ATTACK,
        message,
      },
    };
  }

  #resolveAttack(attackerNode, defenderNode) {
    let attackerStrength = attackerNode.strength;
    let defenderStrength = defenderNode.strength;
    const rounds = [];
    let round = 1;

    while (attackerStrength >= 2 && defenderStrength > 0) {
      const roll = this.#nextRandom();
      const attackerWins = roll >= 0.5;
      if (attackerWins) {
        defenderStrength -= 1;
        rounds.push({ round, winner: 'attacker', roll });
      } else {
        attackerStrength -= 1;
        rounds.push({ round, winner: 'defender', roll });
      }

      round += 1;
    }

    return {
      success: defenderStrength === 0,
      attackerStrength,
      defenderStrength,
      rounds,
    };
  }

  #advanceToNextEligibleTurn(currentTurn) {
    if (!currentTurn || this.state.players.length === 0) {
      return { nextTurn: currentTurn, skipped: [] };
    }

    let candidateTurn = advanceTurnState(currentTurn, this.state.players);
    const skipped = [];
    let remaining = this.state.players.length;

    while (remaining > 0 && !this.#playerOwnsAnyNodes(candidateTurn.activePlayerId)) {
      skipped.push(candidateTurn);
      candidateTurn = advanceTurnState(candidateTurn, this.state.players);
      remaining -= 1;
    }

    return { nextTurn: candidateTurn, skipped };
  }

  #playerOwnsAnyNodes(playerId) {
    if (typeof playerId !== 'string' || playerId.length === 0) {
      return false;
    }

    for (const node of this.state.board.nodes.values()) {
      if (node.ownerId === playerId) {
        return true;
      }
    }

    return false;
  }

  #nextRandom() {
    if (this.rng && typeof this.rng.next === 'function') {
      return this.rng.next();
    }

    return Math.random();
  }
}
