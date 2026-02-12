// ============================================================
// Leaderboard Store — Phase 11
// Rankings by period (all-time, weekly) and stake level
// ============================================================

import { getAllRankings, type PlayerRankingData } from './elo-system';

export type Period = 'all-time' | 'weekly';
export type StakeLevel = 'all' | 'micro' | 'low' | 'mid' | 'high';

interface WeeklySnapshot {
  weekStart: number; // timestamp of Monday 00:00 UTC
  ratings: Map<string, number>; // playerId -> rating at week start
}

const WEEKLY_KEY = '__pokerWeeklySnapshot__';

function weeklyStore(): WeeklySnapshot {
  const g = globalThis as Record<string, unknown>;
  if (!g[WEEKLY_KEY]) {
    g[WEEKLY_KEY] = { weekStart: getWeekStart(), ratings: new Map() } as WeeklySnapshot;
  }
  const snap = g[WEEKLY_KEY] as WeeklySnapshot;
  // Check if week rolled over
  const currentWeekStart = getWeekStart();
  if (snap.weekStart < currentWeekStart) {
    // New week — snapshot current ratings as baseline
    const rankings = getAllRankings();
    snap.ratings = new Map(rankings.map(r => [r.playerId, r.elo.rating]));
    snap.weekStart = currentWeekStart;
  }
  return snap;
}

function getWeekStart(): number {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.getTime();
}

/** Classify a big blind value into a stake level */
export function classifyStake(bigBlind: number): StakeLevel {
  if (bigBlind <= 10) return 'micro';
  if (bigBlind <= 50) return 'low';
  if (bigBlind <= 200) return 'mid';
  return 'high';
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  rating: number;
  weeklyChange?: number;
  totalWins: number;
  totalWinnings: number;
  badgeCount: number;
}

export function getLeaderboard(opts: {
  period?: Period;
  stake?: StakeLevel;
  limit?: number;
  offset?: number;
} = {}): { entries: LeaderboardEntry[]; total: number } {
  const { period = 'all-time', limit = 50, offset = 0 } = opts;
  
  let rankings = getAllRankings();
  
  // Sort by ELO descending
  rankings.sort((a, b) => b.elo.rating - a.elo.rating);

  const weekly = weeklyStore();

  let entries: LeaderboardEntry[] = rankings.map((r, i) => {
    const weeklyBaseline = weekly.ratings.get(r.playerId) ?? r.elo.rating;
    return {
      rank: i + 1,
      playerId: r.playerId,
      playerName: r.playerName,
      rating: r.elo.rating,
      weeklyChange: r.elo.rating - weeklyBaseline,
      totalWins: r.totalWins,
      totalWinnings: r.totalWinnings,
      badgeCount: r.badges.length,
    };
  });

  if (period === 'weekly') {
    // Sort by weekly change instead
    entries.sort((a, b) => (b.weeklyChange ?? 0) - (a.weeklyChange ?? 0));
    entries = entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }

  const total = entries.length;
  return { entries: entries.slice(offset, offset + limit), total };
}
