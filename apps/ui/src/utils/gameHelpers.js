import core from '@graph-battle/core';

const { EVENT_TYPES } = core;

const DEFAULT_PLAYERS = [
  { id: 'player-red', name: 'Red', color: '#f94144' },
  { id: 'player-blue', name: 'Blue', color: '#525ea3ff' },
  { id: 'player-yellow', name: 'Yellow', color: '#ceb421ff' },
  { id: 'player-green', name: 'Green', color: '#189934ff' },
  { id: 'player-purple', name: 'Purple', color: '#9b5de5' },
];

function buildAdjacencyMap(edges = []) {
  const map = new Map();
  for (const [a, b] of edges) {
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a).add(b);
    map.get(b).add(a);
  }
  return map;
}

function formatEventLogEntry(event, playersById) {
  const resolvePlayer = (playerId) => playersById.get(playerId)?.name ?? playerId;
  switch (event.type) {
    case EVENT_TYPES.GAME_STARTED:
      return `Match initialized for ${event.payload.players.length} players.`;
    case EVENT_TYPES.TURN_STARTED:
      return `${resolvePlayer(event.payload.turn.activePlayerId)} began turn ${event.payload.turn.number}.`;
    case EVENT_TYPES.TURN_ENDED:
      return `${resolvePlayer(event.payload.turn.activePlayerId)} ended turn ${event.payload.turn.number}.`;
    case EVENT_TYPES.TURN_SKIPPED:
      return `${resolvePlayer(event.payload.turn.activePlayerId)} was skipped (no territory remaining).`;
    case EVENT_TYPES.ATTACK_RESOLVED:
      return `${resolvePlayer(event.payload.playerId)} attacked ${event.payload.defenderId} from ${event.payload.attackerId} (${event.payload.success ? 'victory' : 'defeat'}).`;
    case EVENT_TYPES.REINFORCEMENTS_AWARDED:
      return `${resolvePlayer(event.payload.playerId)} received ${event.payload.total} reinforcements.`;
    case EVENT_TYPES.GAME_WON:
      return `${resolvePlayer(event.payload.winnerId)} conquered the board.`;
    default:
      return '';
  }
}

export { DEFAULT_PLAYERS, buildAdjacencyMap, formatEventLogEntry };
