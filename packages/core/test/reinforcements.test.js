const test = require('node:test');
const assert = require('node:assert/strict');
const { createBoardState } = require('../src/domain/entities');
const {
  evaluateReinforcements,
  allocateReinforcements,
} = require('../src/engine/reinforcements');

function createBoardFixture() {
  return createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 2 },
      { id: 'b', ownerId: 'p1', strength: 2 },
      { id: 'c', ownerId: 'p1', strength: 2 },
      { id: 'd', ownerId: 'p1', strength: 2 },
      { id: 'e', ownerId: 'p2', strength: 2 },
      { id: 'f', ownerId: 'p1', strength: 2 },
      { id: 'g', ownerId: 'p2', strength: 2 },
    ],
    edges: [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['c', 'e'],
      ['d', 'e'],
      ['f', 'g'],
    ],
  });
}

function deterministicRandomSequence(values) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

test('evaluateReinforcements identifies the largest territory and eligible border nodes', () => {
  const board = createBoardFixture();
  const summary = evaluateReinforcements(board, 'p1');
  assert.equal(summary.total, 4);
  assert.deepEqual(summary.territoryNodeIds.sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual(summary.eligibleNodeIds.sort(), ['c', 'd']);
  assert.equal(summary.baseAmount, 2);
  assert.equal(summary.remainder, 0);
});

test('allocateReinforcements distributes remainder randomly but deterministically with provided rng', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 1 },
      { id: 'b', ownerId: 'p1', strength: 1 },
      { id: 'c', ownerId: 'p1', strength: 1 },
      { id: 'd', ownerId: 'p2', strength: 1 },
      { id: 'e', ownerId: 'p2', strength: 1 },
    ],
    edges: [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['a', 'e'],
    ],
  });
  const result = allocateReinforcements({
    board,
    playerId: 'p1',
    random: deterministicRandomSequence([0.9, 0.1, 0.3]),
  });

  assert.equal(result.total, 3);
  assert.deepEqual(result.eligibleNodeIds.sort(), ['a', 'c']);
  assert.equal(result.baseAmount, 1);
  assert.equal(result.remainder, 1);
  const allocationMap = new Map(result.allocations.map((entry) => [entry.nodeId, entry.amount]));
  assert.equal(allocationMap.get('a'), 2);
  assert.equal(allocationMap.get('c'), 1);
});

test('allocateReinforcements handles players without eligible nodes', () => {
  const board = createBoardState({
    nodes: [
      { id: 'a', ownerId: 'p1', strength: 1 },
      { id: 'b', ownerId: 'p1', strength: 1 },
      { id: 'c', ownerId: 'p2', strength: 1 },
    ],
    edges: [
      ['a', 'b'],
    ],
  });

  const result = allocateReinforcements({ board, playerId: 'p1' });
  assert.equal(result.total, 2);
  assert.equal(result.eligibleNodeIds.length, 0);
  assert.equal(result.allocations.length, 0);
});
