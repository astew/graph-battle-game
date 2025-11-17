const test = require('node:test');
const assert = require('node:assert/strict');
const { EmptyBoardGenerator } = require('../src/board/empty-board-generator');
const { StandardBoardGenerator } = require('../src/board/standard-board-generator');
const { createMulberry32 } = require('../src/rng/mulberry32');

const PLAYERS = [
  { id: 'p1' },
  { id: 'p2' },
];

test('EmptyBoardGenerator returns the expected number of nodes', () => {
  const generator = new EmptyBoardGenerator({ nodeCount: 3 });
  const board = generator.generate({ players: PLAYERS });
  assert.equal(board.nodes.size, 3);
  assert.equal(board.adjacency.get('node-1') instanceof Set, true);
});

const STANDARD_PLAYERS = [
  { id: 'red' },
  { id: 'green' },
  { id: 'yellow' },
  { id: 'blue' },
  { id: 'purple' },
];

test('StandardBoardGenerator creates a connected 6x8 board with balanced ownership', () => {
  const generator = new StandardBoardGenerator();
  const rng = createMulberry32(123);
  const board = generator.generate({ players: STANDARD_PLAYERS, rng });

  assert.equal(board.nodes.size, 30);
  const ownershipCounts = new Map();
  for (const node of board.nodes.values()) {
    assert.ok(node.position, 'node should have coordinates');
    ownershipCounts.set(node.ownerId, (ownershipCounts.get(node.ownerId) ?? 0) + 1);
    assert.ok(node.strength >= 1, 'node strength must be at least 1');
  }

  for (const player of STANDARD_PLAYERS) {
    assert.equal(ownershipCounts.get(player.id), 6);
    const strengthTotal = Array.from(board.nodes.values())
      .filter((node) => node.ownerId === player.id)
      .reduce((sum, node) => sum + node.strength, 0);
    assert.equal(strengthTotal, 12);
  }

  const visited = new Set();
  const [firstNodeId] = board.nodes.keys();
  const queue = [firstNodeId];
  visited.add(firstNodeId);

  while (queue.length > 0) {
    const current = queue.shift();
    for (const neighbor of board.adjacency.get(current)) {
      if (visited.has(neighbor)) {
        continue;
      }

      visited.add(neighbor);
      queue.push(neighbor);
    }
  }

  assert.equal(visited.size, board.nodes.size, 'Board must remain connected');
});
