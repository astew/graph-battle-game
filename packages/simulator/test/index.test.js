import test from 'node:test';
import assert from 'node:assert/strict';

import { createSimulationConfig, describeSimulation, runCli } from '../src/index.js';

test('describeSimulation summarizes configuration', () => {
  const config = createSimulationConfig(['red', 'green'], (color) => ({
    name: `${color}-bot`,
    selectAction: () => ({ attackerNodeId: null, targetNodeId: null }),
  }));

  const summary = describeSimulation(config, { nodes: [], currentPlayerId: 'red' });
  assert.match(summary, /2 players/);
  assert.match(summary, /current player: red/);
});

test('runCli produces a summary string', () => {
  const output = runCli();
  assert.match(output, /Simulation with/);
});
