import { createBoardState, createNodeState } from '../domain/entities.js';

export class EmptyBoardGenerator {
  constructor({ nodeCount = 0 } = {}) {
    if (!Number.isInteger(nodeCount) || nodeCount < 0) {
      throw new Error('nodeCount must be a non-negative integer.');
    }

    this.nodeCount = nodeCount;
  }

  generate() {
    const nodes = [];
    for (let i = 0; i < this.nodeCount; i += 1) {
      nodes.push(createNodeState({ id: `node-${i + 1}` }));
    }

    return createBoardState({ nodes, edges: [] });
  }
}
