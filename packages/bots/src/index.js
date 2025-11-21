import {
  ACTION_TYPES,
  buildAdjacencyMap,
  createAttackAction,
  createEndTurnAction,
} from '@graph-battle/core';

function normalizeRng(rng) {
  if (rng && typeof rng.next === 'function') {
    return rng;
  }

  return { next: () => Math.random() };
}

function normalizePlayerId(player) {
  if (typeof player === 'string' && player.length > 0) {
    return player;
  }

  if (player && typeof player.id === 'string' && player.id.length > 0) {
    return player.id;
  }

  throw new Error('A player id is required to create a bot context.');
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

      attacks.push({
        attackerId: node.id,
        defenderId: neighborId,
        attackerStrength: node.strength,
        defenderStrength: neighbor.strength,
      });
    }
  }

  return attacks;
}

export function enumerateAttackCommands(view) {
  if (!view || typeof view.currentPlayerId !== 'string' || view.currentPlayerId.length === 0) {
    return [];
  }

  const attacks = enumerateLegalAttacks(view);
  if (attacks.length === 0) {
    return [];
  }

  return attacks.map((attack) =>
    createAttackAction({
      playerId: view.currentPlayerId,
      attackerId: attack.attackerId,
      defenderId: attack.defenderId,
    })
  );
}

export function createDeterministicPolicy() {
  return (view) => {
    if (!view || typeof view.currentPlayerId !== 'string') {
      return null;
    }

    const attacks = enumerateLegalAttacks(view);
    if (attacks.length === 0) {
      return null;
    }

    const [first] = attacks.sort((a, b) => {
      if (a.attackerId === b.attackerId) {
        return a.defenderId.localeCompare(b.defenderId);
      }
      return a.attackerId.localeCompare(b.attackerId);
    });

    return createAttackAction({
      playerId: view.currentPlayerId,
      attackerId: first.attackerId,
      defenderId: first.defenderId,
    });
  };
}

export function createRandomPolicy() {
  return (view, rng) => {
    if (!view || typeof view.currentPlayerId !== 'string') {
      return null;
    }

    const attacks = enumerateLegalAttacks(view);
    if (attacks.length === 0) {
      return null;
    }

    const random = normalizeRng(rng);
    const index = Math.floor(random.next() * attacks.length);
    const pick = attacks[index];

    return createAttackAction({
      playerId: view.currentPlayerId,
      attackerId: pick.attackerId,
      defenderId: pick.defenderId,
    });
  };
}

export function createSimplePolicy() {
  return (view) => {
    if (!view || typeof view.currentPlayerId !== 'string') {
      return null;
    }

    const attacks = enumerateLegalAttacks(view).filter(
      (attack) => attack.attackerStrength > attack.defenderStrength
    );

    if (attacks.length === 0) {
      return null;
    }

    const strongestStrength = Math.max(...attacks.map((attack) => attack.attackerStrength));
    const strongestAttackers = attacks.filter(
      (attack) => attack.attackerStrength === strongestStrength
    );
    const weakestTargetStrength = Math.min(
      ...strongestAttackers.map((attack) => attack.defenderStrength)
    );
    const candidates = strongestAttackers
      .filter((attack) => attack.defenderStrength === weakestTargetStrength)
      .sort((a, b) => {
        if (a.attackerId === b.attackerId) {
          return a.defenderId.localeCompare(b.defenderId);
        }
        return a.attackerId.localeCompare(b.attackerId);
      });

    const choice = candidates[0];
    return createAttackAction({
      playerId: view.currentPlayerId,
      attackerId: choice.attackerId,
      defenderId: choice.defenderId,
    });
  };
}

function adaptLegacyBot(bot) {
  return (view) => {
    const legalAttacks = enumerateLegalAttacks(view);
    if (legalAttacks.length === 0) {
      return null;
    }

    const selection = bot.selectAttack({ view, legalAttacks });
    if (!selection) {
      return null;
    }

    const isLegal = legalAttacks.some(
      (candidate) =>
        candidate.attackerId === selection.attackerId &&
        candidate.defenderId === selection.defenderId
    );
    if (!isLegal) {
      throw new Error('Bot selected an illegal attack.');
    }

    return createAttackAction({
      playerId: view.currentPlayerId,
      attackerId: selection.attackerId,
      defenderId: selection.defenderId,
    });
  };
}

export function executePolicyTurn(engine, policy, { rng } = {}) {
  if (!engine || typeof engine.getView !== 'function' || typeof engine.applyAction !== 'function') {
    throw new Error('engine with getView/applyAction is required.');
  }

  const policyFn =
    typeof policy === 'function'
      ? policy
      : policy && typeof policy.selectAttack === 'function'
        ? adaptLegacyBot(policy)
        : null;

  if (!policyFn) {
    throw new Error('policy must be a BotPolicy function or legacy bot with selectAttack.');
  }

  const random = normalizeRng(rng);

  while (true) {
    const view = engine.getView();

    if (view.status === 'complete') {
      return { ok: true, state: engine.getState() };
    }

    const command = policyFn(view, random);

    if (!command) {
      const endTurn = createEndTurnAction(view.currentPlayerId);
      const result = engine.applyAction(endTurn);
      if (!result.ok) {
        throw result.error ?? new Error('Failed to end turn.');
      }
      return result;
    }

    const result = engine.applyAction(command);
    if (!result.ok) {
      throw result.error ?? new Error('Bot command failed to execute.');
    }

    if (command.type === ACTION_TYPES.END_TURN) {
      return result;
    }
  }
}

export function executeBotTurn(engine, bot, options = {}) {
  return executePolicyTurn(engine, bot, options);
}

export function createBotContext(currentPlayer) {
  const playerId = normalizePlayerId(currentPlayer);
  return {
    snapshot: createEmptySnapshot(playerId),
  };
}

const botsApi = Object.freeze({
  createBotContext,
  createEmptySnapshot,
  enumerateLegalAttacks,
  enumerateAttackCommands,
  createDeterministicPolicy,
  createRandomPolicy,
  createSimplePolicy,
  executePolicyTurn,
  executeBotTurn,
});

export default botsApi;
