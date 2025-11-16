const test = require('node:test');
const assert = require('node:assert/strict');
const { createDoNothingBot, createBotContext } = require('../src/index');

test('createDoNothingBot generates a color-coded name and passive action', () => {
  const bot = createDoNothingBot('green');
  assert.ok(bot.name.includes('green'));

  const context = createBotContext('green');
  const decision = bot.selectAction(context);
  assert.equal(decision.attackerNodeId, null);
  assert.equal(decision.targetNodeId, null);
  assert.deepEqual(decision.snapshot, context.snapshot);
});
