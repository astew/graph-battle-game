import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDeterministicPolicy,
  createRandomPolicy,
  createSimplePolicy,
  enumerateLegalAttacks,
  executePolicyTurn,
} from '../src/index.js';
import {
  GameEngine,
  createBoardState,
  createMulberry32,
  EventBus,
} from '@graph-battle/core';

test('enumerateLegalAttacks lists adjacent enemy targets with strengths', () => {
  const view = {
    currentPlayerId: 'alpha',
    nodes: [
      { id: 'a', ownerId: 'alpha', strength: 3 },
      { id: 'b', ownerId: 'bravo', strength: 1 },
      { id: 'c', ownerId: 'alpha', strength: 1 },
    ],
    edges: [
      ['a', 'b'],
      ['b', 'c'],
    ],
  };

  const attacks = enumerateLegalAttacks(view);
  assert.deepEqual(attacks, [
    {
      attackerId: 'a',
      defenderId: 'b',
      attackerStrength: 3,
      defenderStrength: 1,
    },
  ]);
});

test('createDeterministicPolicy selects the lexicographically smallest attack command', () => {
  const policy = createDeterministicPolicy();
  const view = {
    currentPlayerId: 'alpha',
    nodes: [
      { id: 'a', ownerId: 'alpha', strength: 3 },
      { id: 'b', ownerId: 'alpha', strength: 3 },
      { id: 'x', ownerId: 'bravo', strength: 1 },
      { id: 'y', ownerId: 'bravo', strength: 1 },
    ],
    edges: [
      ['a', 'x'],
      ['b', 'y'],
    ],
  };

  const command = policy(view, createMulberry32(1));
  assert.equal(command.type, 'core.action.attack');
  assert.equal(command.attackerId, 'a');
  assert.equal(command.defenderId, 'x');
});

test('createRandomPolicy honors injected randomness', () => {
  const policy = createRandomPolicy();
  const rng = { next: () => 0.6 };
  const view = {
    currentPlayerId: 'alpha',
    nodes: [
      { id: 'a', ownerId: 'alpha', strength: 3 },
      { id: 'b', ownerId: 'alpha', strength: 3 },
      { id: 'x', ownerId: 'bravo', strength: 1 },
      { id: 'y', ownerId: 'bravo', strength: 1 },
    ],
    edges: [
      ['a', 'x'],
      ['b', 'y'],
    ],
  };

  const command = policy(view, rng);
  assert.equal(command.attackerId, 'b');
  assert.equal(command.defenderId, 'y');
});

test('createSimplePolicy selects strongest attacker versus weakest neighbor', () => {
  const policy = createSimplePolicy();
  const view = {
    currentPlayerId: 'alpha',
    nodes: [
      { id: 'a', ownerId: 'alpha', strength: 4 },
      { id: 'b', ownerId: 'alpha', strength: 5 },
      { id: 'c', ownerId: 'alpha', strength: 2 },
      { id: 'x', ownerId: 'bravo', strength: 1 },
      { id: 'y', ownerId: 'bravo', strength: 4 },
      { id: 'z', ownerId: 'bravo', strength: 2 },
    ],
    edges: [
      ['a', 'x'],
      ['b', 'y'],
      ['b', 'z'],
      ['c', 'y'],
    ],
  };

  const command = policy(view);
  assert.equal(command.attackerId, 'b');
  assert.equal(command.defenderId, 'z');
});

test('executePolicyTurn resolves commands until the policy ends its turn', () => {
  const players = [
    { id: 'alpha', color: 'red' },
    { id: 'bravo', color: 'blue' },
  ];
  const board = createBoardState({
    nodes: [
      { id: 'n1', ownerId: 'alpha', strength: 3, position: { row: 0, column: 0 } },
      { id: 'n2', ownerId: 'bravo', strength: 1, position: { row: 0, column: 1 } },
    ],
    edges: [['n1', 'n2']],
    dimensions: { rows: 1, columns: 2 },
  });
  const boardGenerator = { generate: () => board };
  const rng = createMulberry32(42);
  const engine = new GameEngine({ players, boardGenerator, eventBus: new EventBus(), rng });
  const policy = createDeterministicPolicy();

  executePolicyTurn(engine, policy, { rng });

  const state = engine.getState();
  const conquered = state.board.nodes.get('n2');
  assert.equal(conquered.ownerId, 'alpha');
  assert.equal(state.turn.activePlayerId, 'alpha');
  assert.equal(state.turn.number, 2);
});
