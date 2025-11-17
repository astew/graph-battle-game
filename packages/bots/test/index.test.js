import test from 'node:test';
import assert from 'node:assert/strict';

import { createDoNothingBot, createBotContext } from '../src/index.js';

test('createDoNothingBot generates a color-coded name and passive action', () => {
  const bot = createDoNothingBot('green');
  assert.ok(bot.name.includes('green'));

  const context = createBotContext('green');
  const decision = bot.selectAction(context);
  assert.equal(decision.attackerNodeId, null);
  assert.equal(decision.targetNodeId, null);
  assert.deepEqual(decision.snapshot, context.snapshot);
});
