import * as domain from './domain/entities.js';
import * as actions from './actions.js';
import { GameEngine, ERROR_CODES } from './engine/game-engine.js';
import * as combat from './engine/combat.js';
import { EmptyBoardGenerator } from './board/empty-board-generator.js';
import { StandardBoardGenerator } from './board/standard-board-generator.js';
import { buildAdjacencyMap } from './board/graph-utils.js';
import { createMulberry32 } from './rng/mulberry32.js';
import * as events from './events/index.js';

export * from './domain/entities.js';
export * from './actions.js';
export * from './engine/combat.js';
export * from './events/index.js';
export { GameEngine, ERROR_CODES } from './engine/game-engine.js';
export { EmptyBoardGenerator } from './board/empty-board-generator.js';
export { StandardBoardGenerator } from './board/standard-board-generator.js';
export { buildAdjacencyMap } from './board/graph-utils.js';
export { createMulberry32 } from './rng/mulberry32.js';

const coreApi = {
  ...domain,
  ...actions,
  ...combat,
  GameEngine,
  ERROR_CODES,
  EmptyBoardGenerator,
  StandardBoardGenerator,
  buildAdjacencyMap,
  createMulberry32,
  ...events,
};

export default coreApi;
