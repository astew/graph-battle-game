const test = require('node:test');
const assert = require('node:assert/strict');
const { GameEngine } = require('../src/engine/game-engine');
const { createEndTurnAction } = require('../src/actions');
const { EventBus, EVENT_TYPES } = require('../src/events');

const PLAYERS = [
  { id: 'p1' },
  { id: 'p2' },
];

test('GameEngine rejects out-of-turn end turn actions', () => {
  const engine = new GameEngine({ players: PLAYERS, eventBus: new EventBus() });
  const result = engine.applyAction(createEndTurnAction('p2'));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'core.error.outOfTurn');
});

test('GameEngine advances turn order and emits events', () => {
  const events = [];
  const eventBus = new EventBus();
  eventBus.subscribe(EVENT_TYPES.TURN_STARTED, (event) => events.push(event.type));
  eventBus.subscribe(EVENT_TYPES.TURN_ENDED, (event) => events.push(event.type));

  const engine = new GameEngine({ players: PLAYERS, eventBus });
  const result = engine.applyAction(createEndTurnAction('p1'));

  assert.equal(result.ok, true);
  assert.equal(engine.getState().turn.activePlayerId, 'p2');
  assert.equal(events.includes(EVENT_TYPES.TURN_ENDED), true);
  assert.equal(events.includes(EVENT_TYPES.TURN_STARTED), true);
});
