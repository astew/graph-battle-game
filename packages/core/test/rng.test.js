const test = require('node:test');
const assert = require('node:assert/strict');
const { createMulberry32 } = require('../src/rng/mulberry32');

test('createMulberry32 generates deterministic sequences', () => {
  const rngA = createMulberry32(42);
  const rngB = createMulberry32(42);

  const sequenceA = [rngA.next(), rngA.next(), rngA.next()];
  const sequenceB = [rngB.next(), rngB.next(), rngB.next()];

  assert.deepEqual(sequenceA, sequenceB);
});
