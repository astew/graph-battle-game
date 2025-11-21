import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSimulationConfig,
  describeSimulation,
  runGames,
  runCli,
} from '../src/index.js';
import { createDeterministicPolicy } from '@graph-battle/bots';

test('describeSimulation summarizes configuration', () => {
  const players = [
    { id: 'red' },
    { id: 'green' },
  ];
  const config = createSimulationConfig({
    players,
    policyFactory: () => createDeterministicPolicy(),
    policyName: 'deterministic',
  });

  const summary = describeSimulation(config, { nodes: [], currentPlayerId: 'red' });
  assert.match(summary, /2 players/);
  assert.match(summary, /current player: red/);
});

test('runGames aggregates deterministic results with a fixed seed', () => {
  const players = [
    { id: 'alpha', color: 'red' },
    { id: 'bravo', color: 'blue' },
    { id: 'charlie', color: 'yellow' },
    { id: 'delta', color: 'green' },
    { id: 'echo', color: 'purple' },
  ];
  const config = createSimulationConfig({
    players,
    policyFactory: () => createDeterministicPolicy(),
    policyName: 'deterministic',
  });
  const summaryA = runGames(config, { games: 2, seed: 7 });
  const summaryB = runGames(config, { games: 2, seed: 7 });

  assert.deepEqual(summaryA, summaryB);
  const totalWins = Object.values(summaryA.wins).reduce((sum, value) => sum + value, 0);
  assert.equal(totalWins + summaryA.draws, summaryA.games);
});

test('runCli produces a batch summary string', () => {
  const output = runCli(['node', 'script', '--games=1', '--seed=1']);
  const parsed = JSON.parse(output);
  assert.equal(parsed.games, 1);
  assert.equal(typeof parsed.wins, 'object');
});
