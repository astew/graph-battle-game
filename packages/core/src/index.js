/**
 * Placeholder types describing the shape of a Graph Battle match. These will be
 * replaced with concrete implementations in future iterations.
 */
const PLAYER_COLORS = ['red', 'green', 'yellow', 'blue', 'purple'];

function createEmptySnapshot(currentPlayer) {
  if (!PLAYER_COLORS.includes(currentPlayer)) {
    throw new Error(`Unsupported player color: ${currentPlayer}`);
  }

  return {
    nodes: [],
    currentPlayer,
  };
}

module.exports = {
  PLAYER_COLORS,
  createEmptySnapshot,
};
