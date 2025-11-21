import test from 'node:test';
import assert from 'node:assert/strict';

import { GameEngine, ERROR_CODES } from '../src/engine/game-engine.js';
import { canExecuteAttack, ATTACK_INELIGIBILITY_REASONS } from '../src/engine/combat.js';
import { createEndTurnAction, createAttackAction } from '../src/actions.js';
import { EventBus, EVENT_TYPES } from '../src/events/index.js';
import { createBoardState } from '../src/domain/entities.js';

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

test('GameEngine emits ATTACK_ITERATION events for each combat round', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 3 },
      { id: 'b', ownerId: 'p2', strength: 2 },
    ],
    edges: [
      ['a', 'b'],
    ],
  });
  const eventBus = new EventBus();
  const iterations = [];
  const resolved = [];
  eventBus.subscribe(EVENT_TYPES.ATTACK_ITERATION, (event) => iterations.push(event.payload));
  eventBus.subscribe(EVENT_TYPES.ATTACK_RESOLVED, (event) => resolved.push(event.payload));

  const engine = new GameEngine({
    players: PLAYERS,
    boardGenerator: new FixedBoardGenerator(board),
    eventBus,
    rng: createDeterministicRng([0.9, 0.1]),
  });

  const result = engine.applyAction(
    createAttackAction({ playerId: 'p1', attackerId: 'a', defenderId: 'b' })
  );

  assert.equal(result.ok, true);
  assert.equal(iterations.length, 3);
  assert.deepEqual(iterations.map((entry) => entry.winner), ['attacker', 'defender', 'attacker']);
  assert.equal(resolved[0].rounds.length, iterations.length);
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

test('canExecuteAttack reflects engine attack rules', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 3 },
      { id: 'b', ownerId: 'p2', strength: 1 },
      { id: 'c', ownerId: 'p2', strength: 1 },
    ],
    edges: [
      ['a', 'b'],
    ],
  });

  const success = canExecuteAttack({
    board,
    playerId: 'p1',
    attackerId: 'a',
    defenderId: 'b',
  });
  assert.equal(success.ok, true);

  const failure = canExecuteAttack({
    board,
    playerId: 'p1',
    attackerId: 'a',
    defenderId: 'c',
  });
  assert.equal(failure.ok, false);
  assert.equal(failure.reason, ATTACK_INELIGIBILITY_REASONS.NOT_ADJACENT);
});

test('canExecuteAttack throws when board references unknown nodes', () => {
  const board = createBoardState({
    nodes: [{ id: 'a', ownerId: 'p1', strength: 3 }],
    edges: [],
  });

  assert.throws(() => {
    canExecuteAttack({
      board,
      playerId: 'p1',
      attackerId: 'a',
      defenderId: 'missing',
    });
  }, /missing expected nodes/);
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

test('GameEngine emits reinforcement steps and uses rng to break ties', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 1 },
      { id: 'b', ownerId: 'p1', strength: 1 },
      { id: 'c', ownerId: 'p2', strength: 1 },
      { id: 'd', ownerId: 'p2', strength: 1 },
    ],
    edges: [
      ['a', 'c'],
      ['b', 'd'],
    ],
  });
  const eventBus = new EventBus();
  const steps = [];
  eventBus.subscribe(EVENT_TYPES.REINFORCEMENT_STEP, (event) => steps.push(event.payload));

  const engine = new GameEngine({
    players: PLAYERS,
    boardGenerator: new FixedBoardGenerator(board),
    eventBus,
    rng: createDeterministicRng([0.8]),
  });

  const result = engine.applyAction(createEndTurnAction('p1'));

  assert.equal(result.ok, true);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].nodeId, 'b');
  const lastSummary = engine.getState().lastReinforcements;
  assert.equal(lastSummary.total, 1);
  assert.deepEqual(new Set(lastSummary.territoryNodeIds), new Set(['b']));
  const updatedNodes = engine.getState().board.nodes;
  assert.equal(updatedNodes.get('b').strength, 2);
});

test('GameEngine view exposes board dimensions when available', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 2, position: { row: 0, column: 0 } },
      { id: 'b', ownerId: 'p2', strength: 2, position: { row: 0, column: 1 } },
    ],
    edges: [['a', 'b']],
    dimensions: { rows: 8, columns: 6 },
  });
  const engine = new GameEngine({
    players: PLAYERS,
    boardGenerator: new FixedBoardGenerator(board),
  });

  const view = engine.getView();
  assert.deepEqual(view.grid, { rows: 8, columns: 6 });
});

test('GameEngine skips players without territory and emits TURN_SKIPPED', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 3 },
      { id: 'b', ownerId: 'p3', strength: 2 },
    ],
    edges: [['a', 'b']],
  });
  const players = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];
  const eventBus = new EventBus();
  const skipped = [];
  eventBus.subscribe(EVENT_TYPES.TURN_SKIPPED, (event) => skipped.push(event.payload.turn.activePlayerId));

  const engine = new GameEngine({
    players,
    boardGenerator: new FixedBoardGenerator(board),
    eventBus,
  });

  const result = engine.applyAction(createEndTurnAction('p1'));

  assert.equal(result.ok, true);
  assert.equal(engine.getState().turn.activePlayerId, 'p3');
  assert.deepEqual(skipped, ['p2']);
});

test('GameEngine declares a winner once one player controls every node', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 3 },
      { id: 'b', ownerId: 'p2', strength: 1 },
    ],
    edges: [['a', 'b']],
  });
  const eventBus = new EventBus();
  const victories = [];
  eventBus.subscribe(EVENT_TYPES.GAME_WON, (event) => victories.push(event.payload));

  const engine = new GameEngine({
    players: PLAYERS,
    boardGenerator: new FixedBoardGenerator(board),
    eventBus,
    rng: createDeterministicRng([0.9]),
  });

  const attack = engine.applyAction(
    createAttackAction({ playerId: 'p1', attackerId: 'a', defenderId: 'b' })
  );

  assert.equal(attack.ok, true);
  assert.equal(engine.getState().winnerId, 'p1');
  const view = engine.getView();
  assert.equal(view.winnerId, 'p1');
  assert.equal(view.status, 'complete');
  assert.equal(victories.length, 1);
  assert.equal(victories[0].winnerId, 'p1');

  const followUp = engine.applyAction(createEndTurnAction('p1'));
  assert.equal(followUp.ok, false);
  assert.equal(followUp.error.code, ERROR_CODES.GAME_OVER);
});
