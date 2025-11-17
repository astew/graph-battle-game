const { ACTION_TYPES, validateAction } = require('../actions');
const { EmptyBoardGenerator } = require('../board/empty-board-generator');
const {
  createGameState,
  advanceTurnState,
  createNodeState,
} = require('../domain/entities');
const { EventBus, EVENT_TYPES } = require('../events');
const {
  allocateReinforcements,
  evaluateReinforcements,
} = require('./reinforcements');

const ERROR_CODES = Object.freeze({
  OUT_OF_TURN: 'core.error.outOfTurn',
  INVALID_ATTACK: 'core.error.invalidAttack',
});

class GameEngine {
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

    const attackerNode = this.state.board.nodes.get(action.attackerId);
    const defenderNode = this.state.board.nodes.get(action.defenderId);
    const adjacency = this.state.board.adjacency.get(action.attackerId);

    if (!attackerNode || !defenderNode) {
      return this.#invalidAttack('Unknown attacker or defender.');
    }

    if (attackerNode.ownerId !== action.playerId) {
      return this.#invalidAttack('Attacker node does not belong to the player.');
    }

    if (!defenderNode.ownerId || defenderNode.ownerId === action.playerId) {
      return this.#invalidAttack('Defender must be owned by an opponent.');
    }

    if (!adjacency || !adjacency.has(defenderNode.id)) {
      return this.#invalidAttack('Attacker and defender must be adjacent.');
    }

    if (!Number.isInteger(attackerNode.strength) || attackerNode.strength < 2) {
      return this.#invalidAttack('Attacker must have at least 2 strength to initiate an attack.');
    }

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

    const nextTurn = advanceTurnState(this.state.turn, this.state.players);
    this.state = Object.freeze({
      ...this.state,
      turn: nextTurn,
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

  #nextRandom() {
    if (this.rng && typeof this.rng.next === 'function') {
      return this.rng.next();
    }

    return Math.random();
  }
}

module.exports = {
  GameEngine,
  ERROR_CODES,
};
