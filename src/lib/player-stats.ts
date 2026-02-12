// ============================================================
// Player Statistics — Tracks per-player stats across hands
// Uses globalThis singleton to survive HMR and module boundaries
// ============================================================

export interface SessionRecord {
  gameId: string;
  handNumber: number;
  timestamp: number;
  result: number; // chips won/lost this hand
  handName?: string;
}

export interface PositionStats {
  hands: number;
  wins: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  handsPlayed: number;
  handsWon: number;
  biggestPot: number;
  totalChipsWon: number;
  totalChipsLost: number;
  positionStats: Record<string, PositionStats>; // 'dealer' | 'sb' | 'bb' | 'utg' | 'mp' | 'co'
  sessions: SessionRecord[];
  lastUpdated: number;
}

const KEY = '__pokerPlayerStats__';

function store(): Map<string, PlayerStats> {
  const g = globalThis as Record<string, unknown>;
  if (!(g[KEY] instanceof Map)) g[KEY] = new Map<string, PlayerStats>();
  return g[KEY] as Map<string, PlayerStats>;
}

export function getPlayerStats(playerId: string): PlayerStats | undefined {
  return store().get(playerId);
}

export function getAllPlayerStats(): PlayerStats[] {
  return Array.from(store().values());
}

function getOrCreateStats(playerId: string, playerName: string): PlayerStats {
  const s = store();
  let stats = s.get(playerId);
  if (!stats) {
    stats = {
      playerId,
      playerName,
      handsPlayed: 0,
      handsWon: 0,
      biggestPot: 0,
      totalChipsWon: 0,
      totalChipsLost: 0,
      positionStats: {},
      sessions: [],
      lastUpdated: Date.now(),
    };
    s.set(playerId, stats);
  }
  stats.playerName = playerName; // keep name fresh
  return stats;
}

function getPositionLabel(seat: number, dealerSeat: number, playerCount: number): string {
  const relative = (seat - dealerSeat + playerCount) % playerCount;
  if (relative === 0) return 'dealer';
  if (playerCount === 2) return relative === 1 ? 'bb' : 'sb'; // heads-up: dealer=sb
  if (relative === 1) return 'sb';
  if (relative === 2) return 'bb';
  if (relative === playerCount - 1) return 'co';
  if (relative === 3) return 'utg';
  return 'mp';
}

/**
 * Called after each hand completes (from recordHand in game-manager).
 * Mirrors the HandRecord structure.
 */
export function updateStatsFromHand(hand: {
  gameId: string;
  handNumber: number;
  timestamp: number;
  pot: number;
  dealerSeat: number;
  players: { seat: number; name: string; id?: string; isBot: boolean; startStack: number; endStack: number; isDealer: boolean }[];
  winners: { seat: number; name: string; amount: number; handName?: string }[];
}): void {
  const winnerSeats = new Set(hand.winners.map(w => w.seat));
  const playerCount = hand.players.length;

  for (const p of hand.players) {
    const id = p.id ?? `seat-${p.seat}`;
    const stats = getOrCreateStats(id, p.name);
    stats.handsPlayed++;

    const chipDelta = p.endStack - p.startStack;
    const won = winnerSeats.has(p.seat);

    if (won) {
      stats.handsWon++;
      const winEntry = hand.winners.find(w => w.seat === p.seat);
      if (winEntry && winEntry.amount > stats.biggestPot) {
        stats.biggestPot = winEntry.amount;
      }
    }

    if (chipDelta > 0) stats.totalChipsWon += chipDelta;
    else if (chipDelta < 0) stats.totalChipsLost += Math.abs(chipDelta);

    // Position tracking
    const pos = getPositionLabel(p.seat, hand.dealerSeat, playerCount);
    if (!stats.positionStats[pos]) stats.positionStats[pos] = { hands: 0, wins: 0 };
    stats.positionStats[pos].hands++;
    if (won) stats.positionStats[pos].wins++;

    // Session history (keep last 100)
    stats.sessions.unshift({
      gameId: hand.gameId,
      handNumber: hand.handNumber,
      timestamp: hand.timestamp,
      result: chipDelta,
      handName: won ? hand.winners.find(w => w.seat === p.seat)?.handName : undefined,
    });
    if (stats.sessions.length > 100) stats.sessions.length = 100;

    stats.lastUpdated = Date.now();
  }
}
