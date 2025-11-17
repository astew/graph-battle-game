import test from 'node:test';
import assert from 'node:assert/strict';

import { createMulberry32 } from '../src/rng/mulberry32.js';

test('createMulberry32 generates deterministic sequences', () => {
  const rngA = createMulberry32(42);
  const rngB = createMulberry32(42);

  const sequenceA = [rngA.next(), rngA.next(), rngA.next()];
  const sequenceB = [rngB.next(), rngB.next(), rngB.next()];

  assert.deepEqual(sequenceA, sequenceB);
});
