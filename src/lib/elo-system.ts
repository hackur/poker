// ============================================================
// ELO Rating System & Achievement Badges — Phase 11
// ============================================================

export interface EloRecord {
  rating: number;
  history: { timestamp: number; rating: number; delta: number; handId?: string }[];
  peakRating: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

export interface PlayerRankingData {
  playerId: string;
  playerName: string;
  elo: EloRecord;
  badges: Badge[];
  // Career stats for badge checks
  totalWins: number;
  totalWinnings: number;
  currentWinStreak: number;
  longestWinStreak: number;
  allInCountThisSession: number;
  sessionStartStack: number;
  sessionLowStack: number;
  hasComeback: boolean;
}

const KEY = '__pokerEloSystem__';

function store(): Map<string, PlayerRankingData> {
  const g = globalThis as Record<string, unknown>;
  if (!(g[KEY] instanceof Map)) g[KEY] = new Map<string, PlayerRankingData>();
  return g[KEY] as Map<string, PlayerRankingData>;
}

// ── ELO Calculation ──

const K = 32;
const DEFAULT_RATING = 1200;

/** Standard ELO expected score */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/** Calculate ELO delta for player A. score: 1=win, 0.5=draw, 0=loss */
export function eloDelta(ratingA: number, ratingB: number, score: number): number {
  const expected = expectedScore(ratingA, ratingB);
  return Math.round(K * (score - expected));
}

// ── Badge Definitions ──

export const BADGE_DEFS: { id: string; name: string; description: string; icon: string; check: (d: PlayerRankingData) => boolean }[] = [
  { id: 'first_win', name: 'First Win', description: 'Win your first hand', icon: '🏆', check: d => d.totalWins >= 1 },
  { id: 'five_wins', name: 'First 5 Wins', description: 'Win 5 hands', icon: '⭐', check: d => d.totalWins >= 5 },
  { id: 'fifty_club', name: '50-Win Club', description: 'Win 50 hands', icon: '💎', check: d => d.totalWins >= 50 },
  { id: 'winnings_100', name: '$100 Winnings', description: 'Accumulate 100 in winnings', icon: '💰', check: d => d.totalWinnings >= 100 },
  { id: 'winnings_1k', name: '$1K Winnings', description: 'Accumulate 1,000 in winnings', icon: '💵', check: d => d.totalWinnings >= 1000 },
  { id: 'winnings_10k', name: '$10K Winnings', description: 'Accumulate 10,000 in winnings', icon: '🤑', check: d => d.totalWinnings >= 10000 },
  { id: 'streak_10', name: '10-Win Streak', description: 'Win 10 hands in a row', icon: '🔥', check: d => d.longestWinStreak >= 10 },
  { id: 'comeback', name: 'Comeback Kid', description: 'Win after being down 50%', icon: '🦅', check: d => d.hasComeback },
  { id: 'risk_taker', name: 'Risk Taker', description: 'Go all-in 5+ times in a session', icon: '🎲', check: d => d.allInCountThisSession >= 5 },
];

// ── Core Functions ──

export function getOrCreateRanking(playerId: string, playerName: string): PlayerRankingData {
  const s = store();
  let data = s.get(playerId);
  if (!data) {
    data = {
      playerId,
      playerName,
      elo: { rating: DEFAULT_RATING, history: [], peakRating: DEFAULT_RATING },
      badges: [],
      totalWins: 0,
      totalWinnings: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      allInCountThisSession: 0,
      sessionStartStack: 0,
      sessionLowStack: 0,
      hasComeback: false,
    };
    s.set(playerId, data);
  }
  data.playerName = playerName;
  return data;
}

export function getRanking(playerId: string): PlayerRankingData | undefined {
  return store().get(playerId);
}

export function getAllRankings(): PlayerRankingData[] {
  return Array.from(store().values());
}

/** Update ELO after a hand. Players who won get score=1 vs each loser, losers get 0. */
export function updateEloAfterHand(hand: {
  handId?: string;
  players: { id: string; name: string; won: boolean }[];
}): void {
  const winners = hand.players.filter(p => p.won);
  const losers = hand.players.filter(p => !p.won);
  const now = Date.now();

  // Each winner vs each loser pair
  for (const w of winners) {
    const wd = getOrCreateRanking(w.id, w.name);
    let totalDelta = 0;
    for (const l of losers) {
      const ld = getOrCreateRanking(l.id, l.name);
      totalDelta += eloDelta(wd.elo.rating, ld.elo.rating, 1);
    }
    if (losers.length > 0) {
      const avgDelta = Math.round(totalDelta / losers.length);
      wd.elo.rating += avgDelta;
      wd.elo.history.push({ timestamp: now, rating: wd.elo.rating, delta: avgDelta, handId: hand.handId });
      if (wd.elo.rating > wd.elo.peakRating) wd.elo.peakRating = wd.elo.rating;
      if (wd.elo.history.length > 200) wd.elo.history.shift();
    }
  }

  for (const l of losers) {
    const ld = getOrCreateRanking(l.id, l.name);
    let totalDelta = 0;
    for (const w of winners) {
      const wd = getOrCreateRanking(w.id, w.name);
      // Use pre-update rating approximation (close enough)
      totalDelta += eloDelta(ld.elo.rating, wd.elo.rating - (losers.length > 0 ? K / 2 : 0), 0);
    }
    if (winners.length > 0) {
      const avgDelta = Math.round(totalDelta / winners.length);
      ld.elo.rating += avgDelta;
      ld.elo.history.push({ timestamp: now, rating: ld.elo.rating, delta: avgDelta, handId: hand.handId });
      if (ld.elo.history.length > 200) ld.elo.history.shift();
    }
  }
}

/** Update win streaks, winnings, all-in count, and check badges */
export function updateBadgeProgress(
  playerId: string,
  playerName: string,
  opts: { won: boolean; chipsWon?: number; wentAllIn?: boolean; currentStack?: number; startStack?: number }
): Badge[] {
  const d = getOrCreateRanking(playerId, playerName);
  const newBadges: Badge[] = [];

  if (opts.won) {
    d.totalWins++;
    d.currentWinStreak++;
    if (d.currentWinStreak > d.longestWinStreak) d.longestWinStreak = d.currentWinStreak;
  } else {
    d.currentWinStreak = 0;
  }

  if (opts.chipsWon && opts.chipsWon > 0) d.totalWinnings += opts.chipsWon;
  if (opts.wentAllIn) d.allInCountThisSession++;

  // Comeback tracking
  if (opts.currentStack !== undefined && opts.startStack !== undefined && opts.startStack > 0) {
    if (d.sessionStartStack === 0) d.sessionStartStack = opts.startStack;
    if (opts.currentStack < d.sessionLowStack || d.sessionLowStack === 0) {
      d.sessionLowStack = opts.currentStack;
    }
    if (d.sessionLowStack <= d.sessionStartStack * 0.5 && opts.won) {
      d.hasComeback = true;
    }
  }

  // Check all badge defs
  const now = Date.now();
  const existing = new Set(d.badges.map(b => b.id));
  for (const def of BADGE_DEFS) {
    if (!existing.has(def.id) && def.check(d)) {
      const badge: Badge = { id: def.id, name: def.name, description: def.description, icon: def.icon, unlockedAt: now };
      d.badges.push(badge);
      newBadges.push(badge);
    }
  }

  return newBadges;
}

export function getPlayerBadges(playerId: string): Badge[] {
  return store().get(playerId)?.badges ?? [];
}

export function resetSessionStats(playerId: string): void {
  const d = store().get(playerId);
  if (d) {
    d.allInCountThisSession = 0;
    d.sessionStartStack = 0;
    d.sessionLowStack = 0;
    d.hasComeback = false;
  }
}
