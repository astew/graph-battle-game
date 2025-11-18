import { createBoardState, createNodeState } from '../domain/entities.js';

const GRID_ROWS = 8;
const GRID_COLUMNS = 6;
const TARGET_NODE_COUNT = 30;
const REQUIRED_PLAYER_COUNT = 5;
const STRENGTH_PER_PLAYER = 12;
const MIN_STRENGTH_PER_NODE = 1;

function clampIndex(value, max) {
  const normalized = Math.max(0, Math.min(value, max - 1));
  return normalized;
}

export class StandardBoardGenerator {
  constructor({ rows = GRID_ROWS, columns = GRID_COLUMNS, targetNodeCount = TARGET_NODE_COUNT } = {}) {
    if (!Number.isInteger(rows) || rows <= 0) {
      throw new Error('rows must be a positive integer.');
    }

    if (!Number.isInteger(columns) || columns <= 0) {
      throw new Error('columns must be a positive integer.');
    }

    const maxNodes = rows * columns;
    if (!Number.isInteger(targetNodeCount) || targetNodeCount <= 0 || targetNodeCount > maxNodes) {
      throw new Error('targetNodeCount must be a positive integer not exceeding rows * columns.');
    }

    if (targetNodeCount % REQUIRED_PLAYER_COUNT !== 0) {
      throw new Error('targetNodeCount must be divisible by the number of standard players.');
    }

    this.rows = rows;
    this.columns = columns;
    this.targetNodeCount = targetNodeCount;
    this.nodesPerPlayer = targetNodeCount / REQUIRED_PLAYER_COUNT;
  }

  generate({ players, rng } = {}) {
    if (!Array.isArray(players) || players.length !== REQUIRED_PLAYER_COUNT) {
      throw new Error('StandardBoardGenerator requires exactly five players.');
    }

    const random = this.#normalizeRandom(rng);
    const selectedCells = this.#selectCells(random);
    const nodes = selectedCells.map((position, index) => ({
      id: `node-${index + 1}`,
      position,
    }));

    const nodeStates = this.#assignOwnership(nodes, players, random);
    const edges = this.#buildEdges(selectedCells, nodeStates);

    return createBoardState({
      nodes: nodeStates,
      edges,
      dimensions: { rows: this.rows, columns: this.columns },
    });
  }

  #normalizeRandom(rng) {
    if (rng && typeof rng.next === 'function') {
      return rng;
    }

    return {
      next() {
        return Math.random();
      },
    };
  }

  #shuffle(array, rng) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  #coordinatesKey(position) {
    return `${position.row},${position.column}`;
  }

  #generateTraversalOrder(rng) {
    const allCells = [];
    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        allCells.push({ row, column });
      }
    }

    const startIndex = Math.floor(rng.next() * allCells.length);
    const start = allCells[startIndex];
    const queue = [start];
    const visited = new Set([this.#coordinatesKey(start)]);
    const order = [];

    while (queue.length > 0) {
      const current = queue.shift();
      order.push(current);

      const neighbors = this.#neighbors(current);
      this.#shuffle(neighbors, rng);
      for (const neighbor of neighbors) {
        const key = this.#coordinatesKey(neighbor);
        if (visited.has(key)) {
          continue;
        }

        visited.add(key);
        queue.push(neighbor);
      }
    }

    return order;
  }

  #selectCells(rng) {
    const allCells = [];
    for (let row = 0; row < this.rows; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        allCells.push({ row, column });
      }
    }

    const cellMap = new Map(allCells.map((cell) => [this.#coordinatesKey(cell), cell]));
    const activeKeys = new Set(cellMap.keys());
    const targetSize = this.targetNodeCount;
    const maxAttempts = 50;
    let attempt = 0;

    while (activeKeys.size > targetSize && attempt < maxAttempts) {
      const removalOrder = Array.from(activeKeys);
      this.#shuffle(removalOrder, rng);

      for (const key of removalOrder) {
        if (activeKeys.size <= targetSize) {
          break;
        }

        activeKeys.delete(key);
        if (!this.#isConnectedSet(activeKeys, cellMap)) {
          activeKeys.add(key);
        }
      }

      attempt += 1;
    }

    if (activeKeys.size !== targetSize) {
      const traversalOrder = this.#generateTraversalOrder(rng);
      return traversalOrder.slice(0, targetSize);
    }

    return Array.from(activeKeys).map((key) => cellMap.get(key));
  }

  #isConnectedSet(activeKeys, cellMap) {
    if (activeKeys.size === 0) {
      return true;
    }

    const iterator = activeKeys.values().next();
    const startKey = iterator.value;
    const queue = [cellMap.get(startKey)];
    const visited = new Set([startKey]);

    while (queue.length > 0) {
      const current = queue.shift();
      for (const neighbor of this.#neighbors(current)) {
        const neighborKey = this.#coordinatesKey(neighbor);
        if (!activeKeys.has(neighborKey) || visited.has(neighborKey)) {
          continue;
        }

        visited.add(neighborKey);
        queue.push(cellMap.get(neighborKey));
      }
    }

    return visited.size === activeKeys.size;
  }

  #neighbors({ row, column }) {
    const results = [];
    for (let dRow = -1; dRow <= 1; dRow += 1) {
      for (let dColumn = -1; dColumn <= 1; dColumn += 1) {
        if (dRow === 0 && dColumn === 0) {
          continue;
        }

        const nextRow = clampIndex(row + dRow, this.rows);
        const nextColumn = clampIndex(column + dColumn, this.columns);
        if (nextRow === row + dRow && nextColumn === column + dColumn) {
          results.push({ row: nextRow, column: nextColumn });
        }
      }
    }

    return results;
  }

  #assignOwnership(nodes, players, rng) {
    const shuffled = [...nodes];
    this.#shuffle(shuffled, rng);

    const assigned = [];
    let cursor = 0;

    for (const player of players) {
      const strengthBuckets = this.#distributeStrength(rng, this.nodesPerPlayer);
      for (let i = 0; i < this.nodesPerPlayer; i += 1) {
        const node = shuffled[cursor];
        cursor += 1;
        assigned.push(
          createNodeState({
            id: node.id,
            ownerId: player.id,
            strength: strengthBuckets[i],
            position: node.position,
          })
        );
      }
    }

    return assigned;
  }

  #distributeStrength(rng, slotCount) {
    const strengths = new Array(slotCount).fill(MIN_STRENGTH_PER_NODE);
    let remaining = STRENGTH_PER_PLAYER - MIN_STRENGTH_PER_NODE * slotCount;

    while (remaining > 0) {
      const index = Math.floor(rng.next() * slotCount);
      strengths[index] += 1;
      remaining -= 1;
    }

    return strengths;
  }

  #buildEdges(selectedCells, nodeStates) {
    const byPosition = new Map();
    for (const node of nodeStates) {
      byPosition.set(this.#coordinatesKey(node.position), node.id);
    }

    const seen = new Set();
    const edges = [];

    for (const cell of selectedCells) {
      const originId = byPosition.get(this.#coordinatesKey(cell));
      if (!originId) {
        continue;
      }

      for (const neighbor of this.#neighbors(cell)) {
        const neighborId = byPosition.get(this.#coordinatesKey(neighbor));
        if (!neighborId) {
          continue;
        }

        const edgeKey = originId < neighborId ? `${originId}::${neighborId}` : `${neighborId}::${originId}`;
        if (seen.has(edgeKey)) {
          continue;
        }

        seen.add(edgeKey);
        edges.push([originId, neighborId]);
      }
    }

    return edges;
  }
}
