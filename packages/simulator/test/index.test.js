const test = require('node:test');
const assert = require('node:assert/strict');
const { createSimulationConfig, describeSimulation, runCli } = require('../src/index');

test('describeSimulation summarizes configuration', () => {
  const config = createSimulationConfig(['red', 'green'], (color) => ({
    name: `${color}-bot`,
    selectAction: () => ({ attackerNodeId: null, targetNodeId: null }),
  }));

  const summary = describeSimulation(config, { nodes: [], currentPlayer: 'red' });
  assert.match(summary, /2 players/);
  assert.match(summary, /current player: red/);
});

test('runCli produces a summary string', () => {
  const output = runCli();
  assert.match(output, /Simulation with/);
});
