import { describe, it, expect, beforeEach } from 'vitest';
import { expectedScore, eloDelta, updateEloAfterHand, getOrCreateRanking, updateBadgeProgress, getAllRankings } from '../src/lib/elo-system';

// Reset store between tests
beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g['__pokerEloSystem__'];
});

describe('ELO calculations', () => {
  it('expectedScore returns 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it('expectedScore is higher for stronger player', () => {
    const score = expectedScore(1400, 1200);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(1);
  });

  it('eloDelta is positive for a win', () => {
    const delta = eloDelta(1200, 1200, 1);
    expect(delta).toBe(16); // K=32, expected=0.5, delta=32*(1-0.5)=16
  });

  it('eloDelta is negative for a loss', () => {
    const delta = eloDelta(1200, 1200, 0);
    expect(delta).toBe(-16);
  });

  it('eloDelta is 0 for a draw at equal ratings', () => {
    const delta = eloDelta(1200, 1200, 0.5);
    expect(delta).toBe(0);
  });

  it('win against stronger opponent gives bigger delta', () => {
    const deltaVsStrong = eloDelta(1200, 1600, 1);
    const deltaVsEqual = eloDelta(1200, 1200, 1);
    expect(deltaVsStrong).toBeGreaterThan(deltaVsEqual);
  });

  it('loss against weaker opponent gives bigger penalty', () => {
    const deltaVsWeak = eloDelta(1600, 1200, 0);
    const deltaVsEqual = eloDelta(1200, 1200, 0);
    expect(deltaVsWeak).toBeLessThan(deltaVsEqual);
  });
});

describe('updateEloAfterHand', () => {
  it('updates ratings for winners and losers', () => {
    getOrCreateRanking('p1', 'Alice');
    getOrCreateRanking('p2', 'Bob');

    updateEloAfterHand({
      handId: 'h1',
      players: [
        { id: 'p1', name: 'Alice', won: true },
        { id: 'p2', name: 'Bob', won: false },
      ],
    });

    const p1 = getOrCreateRanking('p1', 'Alice');
    const p2 = getOrCreateRanking('p2', 'Bob');
    expect(p1.elo.rating).toBeGreaterThan(1200);
    expect(p2.elo.rating).toBeLessThan(1200);
    expect(p1.elo.history.length).toBe(1);
    expect(p2.elo.history.length).toBe(1);
  });

  it('creates players on the fly', () => {
    updateEloAfterHand({
      players: [
        { id: 'new1', name: 'New1', won: true },
        { id: 'new2', name: 'New2', won: false },
      ],
    });
    expect(getAllRankings().length).toBe(2);
  });
});

describe('Badge system', () => {
  it('awards first_win badge', () => {
    const badges = updateBadgeProgress('p1', 'Alice', { won: true, chipsWon: 50 });
    expect(badges.some(b => b.id === 'first_win')).toBe(true);
  });

  it('awards five_wins badge after 5 wins', () => {
    for (let i = 0; i < 4; i++) {
      updateBadgeProgress('p1', 'Alice', { won: true, chipsWon: 10 });
    }
    const badges = updateBadgeProgress('p1', 'Alice', { won: true, chipsWon: 10 });
    expect(badges.some(b => b.id === 'five_wins')).toBe(true);
  });

  it('awards winnings_100 badge', () => {
    updateBadgeProgress('p1', 'Alice', { won: true, chipsWon: 150 });
    const d = getOrCreateRanking('p1', 'Alice');
    expect(d.badges.some(b => b.id === 'winnings_100')).toBe(true);
  });

  it('does not duplicate badges', () => {
    updateBadgeProgress('p1', 'Alice', { won: true, chipsWon: 50 });
    updateBadgeProgress('p1', 'Alice', { won: true, chipsWon: 50 });
    const d = getOrCreateRanking('p1', 'Alice');
    const firstWinBadges = d.badges.filter(b => b.id === 'first_win');
    expect(firstWinBadges.length).toBe(1);
  });

  it('tracks win streak', () => {
    for (let i = 0; i < 10; i++) {
      updateBadgeProgress('p1', 'Alice', { won: true });
    }
    const d = getOrCreateRanking('p1', 'Alice');
    expect(d.longestWinStreak).toBe(10);
    expect(d.badges.some(b => b.id === 'streak_10')).toBe(true);
  });

  it('resets win streak on loss', () => {
    for (let i = 0; i < 5; i++) {
      updateBadgeProgress('p1', 'Alice', { won: true });
    }
    updateBadgeProgress('p1', 'Alice', { won: false });
    const d = getOrCreateRanking('p1', 'Alice');
    expect(d.currentWinStreak).toBe(0);
    expect(d.longestWinStreak).toBe(5);
  });

  it('awards risk_taker badge', () => {
    for (let i = 0; i < 5; i++) {
      updateBadgeProgress('p1', 'Alice', { won: false, wentAllIn: true });
    }
    const d = getOrCreateRanking('p1', 'Alice');
    expect(d.badges.some(b => b.id === 'risk_taker')).toBe(true);
  });
});
