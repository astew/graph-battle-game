export function buildAdjacencyMap(edges = []) {
  if (!Array.isArray(edges)) {
    throw new Error('edges must be an array of [fromId, toId] tuples.');
  }

  const adjacency = new Map();
  for (const edge of edges) {
    if (!Array.isArray(edge) || edge.length !== 2) {
      throw new Error('edges must be tuples of [fromId, toId].');
    }

    const [fromId, toId] = edge;
    if (typeof fromId !== 'string' || fromId.length === 0) {
      throw new Error('Edge endpoints must be non-empty strings.');
    }
    if (typeof toId !== 'string' || toId.length === 0) {
      throw new Error('Edge endpoints must be non-empty strings.');
    }

    if (!adjacency.has(fromId)) {
      adjacency.set(fromId, new Set());
    }
    if (!adjacency.has(toId)) {
      adjacency.set(toId, new Set());
    }

    adjacency.get(fromId).add(toId);
    adjacency.get(toId).add(fromId);
  }

  return adjacency;
}

const graphUtils = Object.freeze({ buildAdjacencyMap });

export default graphUtils;
