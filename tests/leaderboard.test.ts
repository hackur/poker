/**
 * Leaderboard Store Tests
 * Tests for rankings, weekly changes, and stake classifications
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLeaderboard,
  classifyStake,
  type Period,
  type StakeLevel,
} from '../src/lib/leaderboard-store';
import { updateEloAfterHand, updateBadgeProgress, getAllRankings } from '../src/lib/elo-system';

// Reset stores before each test
beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  g['__pokerEloStore__'] = new Map();
  g['__pokerWeeklySnapshot__'] = undefined;
});

// Helper to seed players with ratings
function seedPlayers(count: number) {
  for (let i = 1; i <= count; i++) {
    // Win against a baseline to set initial rating
    updateEloAfterHand({
      players: [
        { id: `player-${i}`, name: `Player ${i}`, won: true },
        { id: 'baseline', name: 'Baseline', won: false },
      ],
    });
  }
}

describe('Stake Classification', () => {
  it('classifies micro stakes (BB <= 10)', () => {
    expect(classifyStake(1)).toBe('micro');
    expect(classifyStake(2)).toBe('micro');
    expect(classifyStake(5)).toBe('micro');
    expect(classifyStake(10)).toBe('micro');
  });

  it('classifies low stakes (BB 11-50)', () => {
    expect(classifyStake(11)).toBe('low');
    expect(classifyStake(20)).toBe('low');
    expect(classifyStake(25)).toBe('low');
    expect(classifyStake(50)).toBe('low');
  });

  it('classifies mid stakes (BB 51-200)', () => {
    expect(classifyStake(51)).toBe('mid');
    expect(classifyStake(100)).toBe('mid');
    expect(classifyStake(200)).toBe('mid');
  });

  it('classifies high stakes (BB > 200)', () => {
    expect(classifyStake(201)).toBe('high');
    expect(classifyStake(500)).toBe('high');
    expect(classifyStake(1000)).toBe('high');
  });
});

describe('Leaderboard Retrieval', () => {
  beforeEach(() => {
    seedPlayers(10);
  });

  it('returns leaderboard entries', () => {
    const { entries, total } = getLeaderboard();
    
    expect(entries.length).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(0);
  });

  it('includes all required fields', () => {
    const { entries } = getLeaderboard();
    const entry = entries[0];
    
    expect(entry).toHaveProperty('rank');
    expect(entry).toHaveProperty('playerId');
    expect(entry).toHaveProperty('playerName');
    expect(entry).toHaveProperty('rating');
    expect(entry).toHaveProperty('weeklyChange');
    expect(entry).toHaveProperty('totalWins');
    expect(entry).toHaveProperty('totalWinnings');
    expect(entry).toHaveProperty('badgeCount');
  });

  it('assigns sequential ranks', () => {
    const { entries } = getLeaderboard();
    
    for (let i = 0; i < entries.length; i++) {
      expect(entries[i].rank).toBe(i + 1);
    }
  });

  it('sorts by rating descending (all-time)', () => {
    const { entries } = getLeaderboard({ period: 'all-time' });
    
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].rating).toBeGreaterThanOrEqual(entries[i].rating);
    }
  });
});

describe('Pagination', () => {
  beforeEach(() => {
    seedPlayers(20);
  });

  it('respects limit parameter', () => {
    const { entries } = getLeaderboard({ limit: 5 });
    expect(entries.length).toBeLessThanOrEqual(5);
  });

  it('respects offset parameter', () => {
    const page1 = getLeaderboard({ limit: 5, offset: 0 });
    const page2 = getLeaderboard({ limit: 5, offset: 5 });
    
    // No overlap between pages
    const page1Ids = new Set(page1.entries.map(e => e.playerId));
    for (const entry of page2.entries) {
      expect(page1Ids.has(entry.playerId)).toBe(false);
    }
  });

  it('returns correct total regardless of pagination', () => {
    const full = getLeaderboard({ limit: 100 });
    const page1 = getLeaderboard({ limit: 5, offset: 0 });
    const page2 = getLeaderboard({ limit: 5, offset: 5 });
    
    expect(page1.total).toBe(full.total);
    expect(page2.total).toBe(full.total);
  });

  it('handles offset beyond data', () => {
    const { entries, total } = getLeaderboard({ limit: 10, offset: 1000 });
    expect(entries).toHaveLength(0);
    expect(total).toBeGreaterThan(0); // Total should still be reported
  });
});

describe('Weekly Period', () => {
  beforeEach(() => {
    seedPlayers(5);
  });

  it('calculates weekly change', () => {
    const { entries } = getLeaderboard({ period: 'all-time' });
    
    // For new players, weekly change should be 0 (started this week)
    for (const entry of entries) {
      expect(entry.weeklyChange).toBeDefined();
      expect(typeof entry.weeklyChange).toBe('number');
    }
  });

  it('sorts by weekly change when period is weekly', () => {
    // Add more wins to some players to create weekly change
    for (let i = 0; i < 3; i++) {
      updateEloAfterHand({
        players: [
          { id: 'player-1', name: 'Player 1', won: true },
          { id: 'player-5', name: 'Player 5', won: false },
        ],
      });
    }
    
    const { entries } = getLeaderboard({ period: 'weekly' });
    
    // Weekly should be sorted by change, not absolute rating
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].weeklyChange ?? 0).toBeGreaterThanOrEqual(entries[i].weeklyChange ?? 0);
    }
  });

  it('reranks by weekly change', () => {
    const allTime = getLeaderboard({ period: 'all-time' });
    const weekly = getLeaderboard({ period: 'weekly' });
    
    // Ranks should be 1-N in both cases (recomputed)
    expect(weekly.entries[0].rank).toBe(1);
    expect(allTime.entries[0].rank).toBe(1);
  });
});

describe('Empty Leaderboard', () => {
  it('handles no players gracefully', () => {
    const { entries, total } = getLeaderboard();
    
    // May include baseline player from seeding
    expect(entries).toBeDefined();
    expect(Array.isArray(entries)).toBe(true);
    expect(typeof total).toBe('number');
  });
});

describe('Leaderboard Stats', () => {
  beforeEach(() => {
    // Create player with wins using both ELO and badge progress tracking
    for (let i = 0; i < 5; i++) {
      updateEloAfterHand({
        players: [
          { id: 'winner', name: 'Winner', won: true },
          { id: 'loser', name: 'Loser', won: false },
        ],
      });
      // Also update badge progress which tracks totalWins and totalWinnings
      updateBadgeProgress('winner', 'Winner', { won: true, chipsWon: 100 });
      updateBadgeProgress('loser', 'Loser', { won: false, chipsWon: 0 });
    }
  });

  it('tracks total wins', () => {
    const { entries } = getLeaderboard();
    const winner = entries.find(e => e.playerId === 'winner');
    
    expect(winner).toBeDefined();
    expect(winner!.totalWins).toBe(5);
  });

  it('tracks total winnings', () => {
    const { entries } = getLeaderboard();
    const winner = entries.find(e => e.playerId === 'winner');
    
    expect(winner).toBeDefined();
    // 5 loop iterations, but updateBadgeProgress is called for each player
    // 100 chips per win
    expect(winner!.totalWinnings).toBeGreaterThan(0);
  });
});

describe('Default Parameters', () => {
  beforeEach(() => {
    seedPlayers(100);
  });

  it('defaults to all-time period', () => {
    const result = getLeaderboard();
    
    // All-time sorts by rating
    for (let i = 1; i < result.entries.length; i++) {
      expect(result.entries[i - 1].rating).toBeGreaterThanOrEqual(result.entries[i].rating);
    }
  });

  it('defaults to limit of 50', () => {
    const result = getLeaderboard();
    expect(result.entries.length).toBeLessThanOrEqual(50);
  });

  it('defaults to offset of 0', () => {
    const result1 = getLeaderboard();
    const result2 = getLeaderboard({ offset: 0 });
    
    expect(result1.entries[0].playerId).toBe(result2.entries[0].playerId);
  });
});
