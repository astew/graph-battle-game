const test = require('node:test');
const assert = require('node:assert/strict');
const { GameEngine } = require('../src/engine/game-engine');
const { createEndTurnAction, createAttackAction } = require('../src/actions');
const { EventBus, EVENT_TYPES } = require('../src/events');
const { createBoardState } = require('../src/domain/entities');

const PLAYERS = [
  { id: 'p1' },
  { id: 'p2' },
];

class FixedBoardGenerator {
  constructor(board) {
    this.board = board;
  }

  generate() {
    return this.board;
  }
}

function createDeterministicRng(sequence) {
  let index = 0;
  return {
    next() {
      const value = sequence[index % sequence.length];
      index += 1;
      return value;
    },
  };
}

test('GameEngine rejects out-of-turn end turn actions', () => {
  const engine = new GameEngine({ players: PLAYERS, eventBus: new EventBus() });
  const result = engine.applyAction(createEndTurnAction('p2'));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'core.error.outOfTurn');
});

test('GameEngine advances turn order and emits events', () => {
  const events = [];
  const eventBus = new EventBus();
  eventBus.subscribe(EVENT_TYPES.TURN_STARTED, (event) => events.push(event.type));
  eventBus.subscribe(EVENT_TYPES.TURN_ENDED, (event) => events.push(event.type));

  const engine = new GameEngine({ players: PLAYERS, eventBus });
  const result = engine.applyAction(createEndTurnAction('p1'));

  assert.equal(result.ok, true);
  assert.equal(engine.getState().turn.activePlayerId, 'p2');
  assert.equal(events.includes(EVENT_TYPES.TURN_ENDED), true);
  assert.equal(events.includes(EVENT_TYPES.TURN_STARTED), true);
});

test('GameEngine resolves successful attacks and emits events', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 3 },
      { id: 'b', ownerId: 'p2', strength: 1 },
    ],
    edges: [
      ['a', 'b'],
    ],
  });
  const eventBus = new EventBus();
  const attackEvents = [];
  eventBus.subscribe(EVENT_TYPES.ATTACK_RESOLVED, (event) => attackEvents.push(event.payload));

  const engine = new GameEngine({
    players: PLAYERS,
    boardGenerator: new FixedBoardGenerator(board),
    eventBus,
    rng: createDeterministicRng([0.9]),
  });

  const result = engine.applyAction(
    createAttackAction({ playerId: 'p1', attackerId: 'a', defenderId: 'b' })
  );

  assert.equal(result.ok, true);
  const updated = engine.getState().board.nodes;
  assert.equal(updated.get('a').strength, 1);
  assert.equal(updated.get('b').ownerId, 'p1');
  assert.equal(updated.get('b').strength, 2);
  assert.equal(attackEvents.length > 0, true);
  assert.equal(attackEvents[0].success, true);
});

test('GameEngine resolves failed attacks with deterministic rng', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 3 },
      { id: 'b', ownerId: 'p2', strength: 2 },
    ],
    edges: [
      ['a', 'b'],
    ],
  });
  const engine = new GameEngine({
    players: PLAYERS,
    boardGenerator: new FixedBoardGenerator(board),
    rng: createDeterministicRng([0.1, 0.1]),
  });

  const result = engine.applyAction(
    createAttackAction({ playerId: 'p1', attackerId: 'a', defenderId: 'b' })
  );

  assert.equal(result.ok, true);
  const updated = engine.getState().board.nodes;
  assert.equal(updated.get('a').strength, 1);
  assert.equal(updated.get('b').strength, 2);
  assert.equal(updated.get('b').ownerId, 'p2');
});

test('GameEngine rejects illegal attacks', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 1 },
      { id: 'b', ownerId: 'p2', strength: 1 },
    ],
    edges: [
      ['a', 'b'],
    ],
  });
  const engine = new GameEngine({
    players: PLAYERS,
    boardGenerator: new FixedBoardGenerator(board),
  });

  const result = engine.applyAction(
    createAttackAction({ playerId: 'p1', attackerId: 'a', defenderId: 'b' })
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'core.error.invalidAttack');
});
