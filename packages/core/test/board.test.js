const test = require('node:test');
const assert = require('node:assert/strict');
const { EmptyBoardGenerator } = require('../src/board/empty-board-generator');

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
