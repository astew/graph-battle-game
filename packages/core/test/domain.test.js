const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createNodeState,
  createBoardState,
  createTurnState,
  advanceTurnState,
} = require('../src/domain/entities');

test('createNodeState guards against invalid arguments', () => {
  assert.throws(() => createNodeState({ id: '' }), /Node id must be a non-empty string/);
  assert.throws(() => createNodeState({ id: 'n-1', ownerId: 5 }), /ownerId must be null or a string/);
  assert.throws(() => createNodeState({ id: 'n-1', strength: -1 }), /non-negative/);
});

test('createBoardState enforces unique node ids and valid edges', () => {
  const board = createBoardState({
    nodes: [
      { id: 'n-1' },
      { id: 'n-2' },
    ],
    edges: [['n-1', 'n-2']],
  });
  assert.equal(board.nodes.size, 2);
  assert.equal(board.adjacency.get('n-1').has('n-2'), true);

  assert.throws(() => createBoardState({ nodes: [{ id: 'n-1' }, { id: 'n-1' }] }), /Duplicate node id/);
  assert.throws(() => createBoardState({ nodes: [{ id: 'n-1' }], edges: [['n-1', 'missing']] }), /Edge references unknown node/);
});

test('advanceTurnState cycles through players and increments turn number', () => {
  const players = [{ id: 'p1' }, { id: 'p2' }];
  const start = createTurnState({ activePlayerId: 'p1', orderIndex: 0, number: 1 });
  const mid = advanceTurnState(start, players);
  assert.equal(mid.activePlayerId, 'p2');
  assert.equal(mid.number, 1);

  const next = advanceTurnState(mid, players);
  assert.equal(next.activePlayerId, 'p1');
  assert.equal(next.number, 2);
});
