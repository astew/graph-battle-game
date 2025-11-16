const test = require('node:test');
const assert = require('node:assert/strict');
const { createEmptySnapshot } = require('../src/index');

test('createEmptySnapshot returns the provided current player', () => {
  const snapshot = createEmptySnapshot('red');
  assert.equal(snapshot.currentPlayer, 'red');
  assert.deepEqual(snapshot.nodes, []);
});
