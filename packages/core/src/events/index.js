export const EVENT_TYPES = Object.freeze({
  GAME_STARTED: 'core.event.gameStarted',
  TURN_STARTED: 'core.event.turnStarted',
  TURN_ENDED: 'core.event.turnEnded',
  TURN_SKIPPED: 'core.event.turnSkipped',
  ATTACK_ITERATION: 'core.event.attackIteration',
  ATTACK_RESOLVED: 'core.event.attackResolved',
  REINFORCEMENT_STEP: 'core.event.reinforcementStep',
  REINFORCEMENTS_AWARDED: 'core.event.reinforcementsAwarded',
  REINFORCEMENTS_COMPLETE: 'core.event.reinforcementsComplete',
  GAME_WON: 'core.event.gameWon',
});

export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  subscribe(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function.');
    }

    const handlers = this.handlers.get(eventType) ?? new Set();
    handlers.add(handler);
    this.handlers.set(eventType, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  publish(event) {
    if (!event || typeof event !== 'object') {
      throw new Error('event must be an object.');
    }

    const handlers = this.handlers.get(event.type);
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(event);
    }
  }
}
