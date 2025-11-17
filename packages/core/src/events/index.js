const EVENT_TYPES = Object.freeze({
  GAME_STARTED: 'core.event.gameStarted',
  TURN_STARTED: 'core.event.turnStarted',
  TURN_ENDED: 'core.event.turnEnded',
  ATTACK_RESOLVED: 'core.event.attackResolved',
  REINFORCEMENTS_AWARDED: 'core.event.reinforcementsAwarded',
});

class EventBus {
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

module.exports = {
  EVENT_TYPES,
  EventBus,
};
