import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDoNothingBot,
  createBotContext,
  enumerateLegalAttacks,
  createDeterministicBot,
  createRandomBot,
  executeBotTurn,
} from '../src/index.js';
import {
  GameEngine,
  createBoardState,
  EventBus,
} from '@graph-battle/core';

test('createDoNothingBot generates a color-coded name and passive action', () => {
  const bot = createDoNothingBot('green');
  assert.ok(bot.name.includes('green'));

  const context = createBotContext('green');
  const decision = bot.selectAction(context);
  assert.equal(decision.attackerId, null);
  assert.equal(decision.defenderId, null);
  assert.deepEqual(decision.snapshot, context.snapshot);
});

test('enumerateLegalAttacks lists adjacent enemy targets for current player', () => {
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
  assert.deepEqual(attacks, [{ attackerId: 'a', defenderId: 'b' }]);
});

test('createDeterministicBot selects the lexicographically smallest attack', () => {
  const bot = createDeterministicBot();
  const attacks = [
    { attackerId: 'c', defenderId: 'a' },
    { attackerId: 'a', defenderId: 'z' },
    { attackerId: 'b', defenderId: 'a' },
  ];

  const selection = bot.selectAttack({ legalAttacks: attacks });
  assert.deepEqual(selection, { attackerId: 'a', defenderId: 'z' });
});

test('createRandomBot honors injected randomness', () => {
  const picks = [];
  const bot = createRandomBot({ random: () => 0.6 });
  const attacks = [
    { attackerId: 'a', defenderId: 'b' },
    { attackerId: 'b', defenderId: 'c' },
  ];
  picks.push(bot.selectAttack({ legalAttacks: attacks }));
  assert.deepEqual(picks[0], attacks[1]);
});

test('executeBotTurn resolves attacks until no legal options remain', () => {
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
  const rng = { next: () => 0.9 };
  const engine = new GameEngine({ players, boardGenerator, eventBus: new EventBus(), rng });
  const bot = createDeterministicBot();

  executeBotTurn(engine, bot);

  const state = engine.getState();
  const conquered = state.board.nodes.get('n2');
  assert.equal(conquered.ownerId, 'alpha');
  assert.equal(state.turn.activePlayerId, 'alpha');
  assert.equal(state.turn.number, 2);
});
