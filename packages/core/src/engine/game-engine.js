const { ACTION_TYPES, validateAction } = require('../actions');
const { EmptyBoardGenerator } = require('../board/empty-board-generator');
const {
  createGameState,
  advanceTurnState,
} = require('../domain/entities');
const { EventBus, EVENT_TYPES } = require('../events');

const ERROR_CODES = Object.freeze({
  OUT_OF_TURN: 'core.error.outOfTurn',
});

class GameEngine {
  constructor({ players, boardGenerator = new EmptyBoardGenerator(), eventBus = new EventBus(), rng } = {}) {
    if (!Array.isArray(players) || players.length === 0) {
      throw new Error('GameEngine requires at least one player.');
    }

    this.eventBus = eventBus;
    this.boardGenerator = boardGenerator;
    this.rng = rng;
    this.state = createGameState({
      board: this.boardGenerator.generate({ players, rng }),
      players,
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
    return {
      currentPlayerId: this.state.turn.activePlayerId,
      turnNumber: this.state.turn.number,
      nodes: Array.from(this.state.board.nodes.values()).map((node) => ({ ...node })),
    };
  }

  applyAction(action) {
    validateAction(action);

    switch (action.type) {
      case ACTION_TYPES.END_TURN:
        return this.#handleEndTurn(action);
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
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
}

module.exports = {
  GameEngine,
  ERROR_CODES,
};
