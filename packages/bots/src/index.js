import {
  buildAdjacencyMap,
  createAttackAction,
  createEndTurnAction,
} from '@graph-battle/core';

function normalizePlayerId(player) {
  if (typeof player === 'string' && player.length > 0) {
    return player;
  }

  if (player && typeof player.id === 'string' && player.id.length > 0) {
    return player.id;
  }

  throw new Error('A player id is required to create a bot context.');
}

function normalizeRandom(random) {
  if (typeof random === 'function') {
    return random;
  }

  return () => Math.random();
}

export function createEmptySnapshot(currentPlayerId) {
  return Object.freeze({
    nodes: [],
    turnNumber: 1,
    currentPlayerId,
    // Maintain backwards compatibility with older helpers that relied on
    // `currentPlayer` instead of the new `currentPlayerId` name.
    currentPlayer: currentPlayerId,
  });
}

export function createDoNothingBot(color) {
  const name = `${color}-idle-bot`;
  return {
    name,
    selectAction(context) {
      return {
        attackerId: null,
        defenderId: null,
        snapshot: context.snapshot,
      };
    },
  };
}

export function createDeterministicBot({ name = 'deterministic-bot' } = {}) {
  return {
    name,
    selectAttack({ legalAttacks }) {
      if (!Array.isArray(legalAttacks) || legalAttacks.length === 0) {
        return null;
      }

      const sorted = [...legalAttacks].sort((a, b) => {
        if (a.attackerId === b.attackerId) {
          return a.defenderId.localeCompare(b.defenderId);
        }
        return a.attackerId.localeCompare(b.attackerId);
      });

      return sorted[0];
    },
  };
}

export function createRandomBot({ name = 'random-bot', random } = {}) {
  const randomFn = normalizeRandom(random);
  return {
    name,
    selectAttack({ legalAttacks }) {
      if (!Array.isArray(legalAttacks) || legalAttacks.length === 0) {
        return null;
      }

      const index = Math.floor(randomFn() * legalAttacks.length);
      return legalAttacks[index];
    },
  };
}

export function enumerateLegalAttacks(view) {
  if (!view || typeof view !== 'object') {
    throw new Error('view is required to enumerate attacks.');
  }

  const { nodes = [], edges = [], currentPlayerId } = view;
  if (typeof currentPlayerId !== 'string' || currentPlayerId.length === 0) {
    return [];
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = buildAdjacencyMap(edges);
  const attacks = [];

  for (const node of nodes) {
    if (node.ownerId !== currentPlayerId || node.strength < 2) {
      continue;
    }

    const neighbors = adjacency.get(node.id);
    if (!neighbors) {
      continue;
    }

    for (const neighborId of neighbors) {
      const neighbor = nodesById.get(neighborId);
      if (!neighbor || neighbor.ownerId === currentPlayerId || !neighbor.ownerId) {
        continue;
      }

      attacks.push({ attackerId: node.id, defenderId: neighborId });
    }
  }

  return attacks;
}

export function executeBotTurn(engine, bot) {
  if (!engine || typeof engine.getView !== 'function') {
    throw new Error('engine with getView/applyAction is required.');
  }
  if (!bot || typeof bot.selectAttack !== 'function') {
    throw new Error('bot must implement selectAttack(viewContext).');
  }

  while (true) {
    const view = engine.getView();
    const legalAttacks = enumerateLegalAttacks(view);
    const selection = bot.selectAttack({ view, legalAttacks });
    if (!selection || legalAttacks.length === 0) {
      const endTurn = createEndTurnAction(view.currentPlayerId);
      const result = engine.applyAction(endTurn);
      if (!result.ok) {
        throw result.error ?? new Error('Failed to end turn.');
      }
      return result;
    }

    const isLegal = legalAttacks.some(
      (candidate) =>
        candidate.attackerId === selection.attackerId &&
        candidate.defenderId === selection.defenderId
    );
    if (!isLegal) {
      throw new Error('Bot selected an illegal attack.');
    }

    const attackAction = createAttackAction({
      playerId: view.currentPlayerId,
      attackerId: selection.attackerId,
      defenderId: selection.defenderId,
    });
    const result = engine.applyAction(attackAction);
    if (!result.ok) {
      throw result.error ?? new Error('Bot attack failed to execute.');
    }
  }
}

export function createBotContext(currentPlayer) {
  const playerId = normalizePlayerId(currentPlayer);
  return {
    snapshot: createEmptySnapshot(playerId),
  };
}

const botsApi = Object.freeze({
  createDoNothingBot,
  createBotContext,
  createEmptySnapshot,
  createDeterministicBot,
  createRandomBot,
  enumerateLegalAttacks,
  executeBotTurn,
});

export default botsApi;
