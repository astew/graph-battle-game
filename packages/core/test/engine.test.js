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

test('GameEngine awards reinforcements after a player ends their turn', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 1 },
      { id: 'b', ownerId: 'p1', strength: 1 },
      { id: 'c', ownerId: 'p1', strength: 1 },
      { id: 'd', ownerId: 'p2', strength: 2 },
    ],
    edges: [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
    ],
  });
  const eventBus = new EventBus();
  const reinforcementEvents = [];
  eventBus.subscribe(EVENT_TYPES.REINFORCEMENTS_AWARDED, (event) =>
    reinforcementEvents.push(event.payload)
  );

  const engine = new GameEngine({
    players: PLAYERS,
    boardGenerator: new FixedBoardGenerator(board),
    eventBus,
    rng: createDeterministicRng([0.7]),
  });

  const result = engine.applyAction(createEndTurnAction('p1'));

  assert.equal(result.ok, true);
  const updatedNodes = engine.getState().board.nodes;
  assert.equal(updatedNodes.get('c').strength, 4);
  assert.equal(reinforcementEvents.length, 1);
  assert.equal(reinforcementEvents[0].total, 3);
  assert.deepEqual(reinforcementEvents[0].allocations, [
    { nodeId: 'c', amount: 3 },
  ]);
  const view = engine.getView();
  assert.equal(view.reinforcements.lastAwarded.total, 3);
  assert.equal(view.reinforcements.preview.playerId, 'p2');
  assert.equal(view.reinforcements.preview.total, 1);
});

test('GameEngine view exposes board dimensions when available', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 2, position: { row: 0, column: 0 } },
      { id: 'b', ownerId: 'p2', strength: 2, position: { row: 0, column: 1 } },
    ],
    edges: [['a', 'b']],
    dimensions: { rows: 6, columns: 8 },
  });
  const engine = new GameEngine({
    players: PLAYERS,
    boardGenerator: new FixedBoardGenerator(board),
  });

  const view = engine.getView();
  assert.deepEqual(view.grid, { rows: 6, columns: 8 });
});
