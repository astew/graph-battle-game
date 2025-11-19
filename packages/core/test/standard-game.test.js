import test from 'node:test';
import assert from 'node:assert/strict';

import { createStandardGame } from '../src/standard-game.js';
import { createMulberry32 } from '../src/rng/mulberry32.js';

function ownershipTotals(board) {
  const totals = new Map();
  for (const node of board.nodes.values()) {
    totals.set(node.ownerId, (totals.get(node.ownerId) ?? 0) + node.strength);
  }
  return totals;
}

test('createStandardGame builds a default board matching the standard generator', () => {
  const engine = createStandardGame({ rng: createMulberry32(123) });
  const state = engine.getState();

  assert.equal(state.players.length, 5);
  assert.equal(state.board.nodes.size, 30);
  assert.deepEqual(state.board.dimensions, { rows: 8, columns: 6 });
  const counts = new Map();
  for (const node of state.board.nodes.values()) {
    counts.set(node.ownerId, (counts.get(node.ownerId) ?? 0) + 1);
  }

  for (const player of state.players) {
    assert.equal(counts.get(player.id), 6);
  }
});

test('createStandardGame respects custom parameters', () => {
  const players = [
    { id: 'alpha' },
    { id: 'beta' },
  ];
  const engine = createStandardGame({
    rows: 4,
    columns: 3,
    nodesPerPlayer: 2,
    initialReinforcements: 4,
    attackWinProb: 0.75,
    players,
    rng: createMulberry32(42),
  });

  const state = engine.getState();
  assert.equal(state.players.length, 2);
  assert.equal(state.board.nodes.size, 4);
  assert.deepEqual(state.board.dimensions, { rows: 4, columns: 3 });
  const totals = ownershipTotals(state.board);
  assert.equal(totals.get('alpha'), 4);
  assert.equal(totals.get('beta'), 4);
});

test('createStandardGame enforces maxNodes constraint', () => {
  assert.throws(() => {
    createStandardGame({
      rows: 2,
      columns: 2,
      nodesPerPlayer: 3,
      maxNodes: 2,
      players: [{ id: 'p1' }, { id: 'p2' }],
    });
  }, /maxNodes/);
});
