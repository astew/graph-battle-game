const REQUIRED_PLAYER_ID_MESSAGE = 'playerId is required to evaluate reinforcements.';

function assertBoard(board) {
  if (!board || typeof board !== 'object' || !(board.nodes instanceof Map)) {
    throw new Error('A valid board state is required to evaluate reinforcements.');
  }
}

function assertPlayerId(playerId) {
  if (typeof playerId !== 'string' || playerId.length === 0) {
    throw new Error(REQUIRED_PLAYER_ID_MESSAGE);
  }
}

function findLargestTerritory(board, playerId) {
  const visited = new Set();
  let largest = new Set();

  for (const node of board.nodes.values()) {
    if (node.ownerId !== playerId || visited.has(node.id)) {
      continue;
    }

    const component = new Set();
    const queue = [node.id];
    visited.add(node.id);

    while (queue.length > 0) {
      const currentId = queue.shift();
      component.add(currentId);
      const neighbors = board.adjacency.get(currentId) ?? new Set();
      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) {
          continue;
        }

        const neighbor = board.nodes.get(neighborId);
        if (!neighbor || neighbor.ownerId !== playerId) {
          continue;
        }

        visited.add(neighborId);
        queue.push(neighborId);
      }
    }

    if (component.size > largest.size) {
      largest = component;
    }
  }

  return largest;
}

function findEligibleBorderNodes(board, playerId, territoryNodeIds) {
  const eligible = [];
  for (const nodeId of territoryNodeIds) {
    const neighbors = board.adjacency.get(nodeId) ?? new Set();
    for (const neighborId of neighbors) {
      const neighbor = board.nodes.get(neighborId);
      if (!neighbor || neighbor.ownerId === playerId) {
        continue;
      }

      eligible.push(nodeId);
      break;
    }
  }

  return eligible;
}

function evaluateReinforcements(board, playerId) {
  assertBoard(board);
  assertPlayerId(playerId);

  const territory = findLargestTerritory(board, playerId);
  const territoryNodeIds = Array.from(territory.values());
  const total = territoryNodeIds.length;

  const eligibleNodeIds = total === 0 ? [] : findEligibleBorderNodes(board, playerId, territoryNodeIds);
  const eligibleCount = eligibleNodeIds.length;

  const baseAmount = eligibleCount > 0 ? Math.floor(total / eligibleCount) : 0;
  const remainder = eligibleCount > 0 ? total % eligibleCount : 0;

  return {
    playerId,
    total,
    territoryNodeIds,
    eligibleNodeIds,
    baseAmount,
    remainder,
  };
}

function shuffle(array, randomFn = Math.random) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const rand = randomFn();
    const j = Math.floor(rand * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function allocateReinforcements({ board, playerId, random }) {
  const summary = evaluateReinforcements(board, playerId);
  const { eligibleNodeIds, baseAmount, remainder } = summary;
  const allocations = [];

  if (summary.total === 0 || eligibleNodeIds.length === 0) {
    return { ...summary, allocations };
  }

  const totals = new Map();
  for (const nodeId of eligibleNodeIds) {
    totals.set(nodeId, baseAmount);
  }

  if (remainder > 0) {
    const order = [...eligibleNodeIds];
    shuffle(order, typeof random === 'function' ? random : Math.random);
    for (let i = 0; i < remainder; i += 1) {
      const targetId = order[i % order.length];
      totals.set(targetId, (totals.get(targetId) ?? 0) + 1);
    }
  }

  for (const [nodeId, amount] of totals.entries()) {
    if (amount > 0) {
      allocations.push({ nodeId, amount });
    }
  }

  return { ...summary, allocations };
}

module.exports = {
  evaluateReinforcements,
  allocateReinforcements,
};
