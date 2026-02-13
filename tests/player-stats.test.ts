/**
 * Player Statistics Tests
 * Tests for player tracking, win rates, position stats, and session history
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPlayerStats,
  getAllPlayerStats,
  updateStatsFromHand,
  type PlayerStats,
} from '../src/lib/player-stats';

// Reset the store before each test
beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  g['__pokerPlayerStats__'] = new Map();
});

describe('Player Stats Initialization', () => {
  it('returns undefined for unknown player', () => {
    expect(getPlayerStats('unknown-player')).toBeUndefined();
  });

  it('returns empty array when no stats exist', () => {
    const all = getAllPlayerStats();
    expect(all).toHaveLength(0);
  });
});

describe('Stats Update from Hand', () => {
  const basicHand = {
    gameId: 'game-1',
    handNumber: 1,
    timestamp: Date.now(),
    pot: 100,
    dealerSeat: 0,
    players: [
      { seat: 0, name: 'Alice', id: 'alice-1', isBot: false, startStack: 1000, endStack: 1050, isDealer: true },
      { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 950, isDealer: false },
    ],
    winners: [{ seat: 0, name: 'Alice', amount: 100, handName: 'Two Pair' }],
  };

  it('creates stats for new players', () => {
    updateStatsFromHand(basicHand);
    
    const alice = getPlayerStats('alice-1');
    expect(alice).toBeDefined();
    expect(alice!.playerName).toBe('Alice');
    expect(alice!.handsPlayed).toBe(1);
  });

  it('tracks hands played', () => {
    updateStatsFromHand(basicHand);
    updateStatsFromHand({ ...basicHand, handNumber: 2 });
    updateStatsFromHand({ ...basicHand, handNumber: 3 });
    
    const alice = getPlayerStats('alice-1');
    expect(alice!.handsPlayed).toBe(3);
  });

  it('tracks hands won correctly', () => {
    updateStatsFromHand(basicHand);
    
    const alice = getPlayerStats('alice-1');
    const bob = getPlayerStats('bob-1');
    
    expect(alice!.handsWon).toBe(1);
    expect(bob!.handsWon).toBe(0);
  });

  it('tracks biggest pot', () => {
    updateStatsFromHand(basicHand);
    
    const alice = getPlayerStats('alice-1');
    expect(alice!.biggestPot).toBe(100);
    
    // Win a bigger pot
    const biggerPotHand = {
      ...basicHand,
      handNumber: 2,
      pot: 500,
      winners: [{ seat: 0, name: 'Alice', amount: 500, handName: 'Full House' }],
    };
    updateStatsFromHand(biggerPotHand);
    
    const aliceUpdated = getPlayerStats('alice-1');
    expect(aliceUpdated!.biggestPot).toBe(500);
  });

  it('does not overwrite biggest pot with smaller wins', () => {
    const bigWin = {
      ...basicHand,
      pot: 1000,
      winners: [{ seat: 0, name: 'Alice', amount: 1000, handName: 'Straight' }],
    };
    updateStatsFromHand(bigWin);
    
    const smallWin = {
      ...basicHand,
      handNumber: 2,
      pot: 50,
      winners: [{ seat: 0, name: 'Alice', amount: 50, handName: 'Pair' }],
    };
    updateStatsFromHand(smallWin);
    
    const alice = getPlayerStats('alice-1');
    expect(alice!.biggestPot).toBe(1000);
  });

  it('tracks total chips won and lost', () => {
    updateStatsFromHand(basicHand);
    
    const alice = getPlayerStats('alice-1');
    const bob = getPlayerStats('bob-1');
    
    expect(alice!.totalChipsWon).toBe(50);
    expect(alice!.totalChipsLost).toBe(0);
    expect(bob!.totalChipsWon).toBe(0);
    expect(bob!.totalChipsLost).toBe(50);
  });
});

describe('Position Stats', () => {
  const createHandWithDealer = (dealerSeat: number) => ({
    gameId: 'game-1',
    handNumber: 1,
    timestamp: Date.now(),
    pot: 100,
    dealerSeat,
    players: [
      { seat: 0, name: 'Alice', id: 'alice-1', isBot: false, startStack: 1000, endStack: 1000, isDealer: dealerSeat === 0 },
      { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 1000, isDealer: dealerSeat === 1 },
      { seat: 2, name: 'Charlie', id: 'charlie-1', isBot: true, startStack: 1000, endStack: 1000, isDealer: dealerSeat === 2 },
    ],
    winners: [{ seat: 0, name: 'Alice', amount: 100 }],
  });

  it('tracks dealer position', () => {
    updateStatsFromHand(createHandWithDealer(0));
    
    const alice = getPlayerStats('alice-1');
    expect(alice!.positionStats['dealer']).toBeDefined();
    expect(alice!.positionStats['dealer'].hands).toBe(1);
    expect(alice!.positionStats['dealer'].wins).toBe(1);
  });

  it('tracks small blind position', () => {
    updateStatsFromHand(createHandWithDealer(0));
    
    const bob = getPlayerStats('bob-1');
    expect(bob!.positionStats['sb']).toBeDefined();
    expect(bob!.positionStats['sb'].hands).toBe(1);
  });

  it('tracks big blind position', () => {
    updateStatsFromHand(createHandWithDealer(0));
    
    const charlie = getPlayerStats('charlie-1');
    expect(charlie!.positionStats['bb']).toBeDefined();
    expect(charlie!.positionStats['bb'].hands).toBe(1);
  });

  it('handles heads-up position assignment', () => {
    const headsUpHand = {
      gameId: 'game-1',
      handNumber: 1,
      timestamp: Date.now(),
      pot: 50,
      dealerSeat: 0,
      players: [
        { seat: 0, name: 'Alice', id: 'alice-1', isBot: false, startStack: 1000, endStack: 1025, isDealer: true },
        { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 975, isDealer: false },
      ],
      winners: [{ seat: 0, name: 'Alice', amount: 50 }],
    };
    
    updateStatsFromHand(headsUpHand);
    
    const alice = getPlayerStats('alice-1');
    const bob = getPlayerStats('bob-1');
    
    // In heads-up, dealer is SB (but we label by relative position)
    expect(alice!.positionStats['dealer']).toBeDefined();
    expect(bob!.positionStats['bb']).toBeDefined();
  });
});

describe('Session History', () => {
  const basicHand = {
    gameId: 'game-1',
    handNumber: 1,
    timestamp: Date.now(),
    pot: 100,
    dealerSeat: 0,
    players: [
      { seat: 0, name: 'Alice', id: 'alice-1', isBot: false, startStack: 1000, endStack: 1050, isDealer: true },
      { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 950, isDealer: false },
    ],
    winners: [{ seat: 0, name: 'Alice', amount: 100, handName: 'Flush' }],
  };

  it('records session history', () => {
    updateStatsFromHand(basicHand);
    
    const alice = getPlayerStats('alice-1');
    expect(alice!.sessions).toHaveLength(1);
    expect(alice!.sessions[0].gameId).toBe('game-1');
    expect(alice!.sessions[0].handNumber).toBe(1);
    expect(alice!.sessions[0].result).toBe(50);
  });

  it('records hand name for winners', () => {
    updateStatsFromHand(basicHand);
    
    const alice = getPlayerStats('alice-1');
    expect(alice!.sessions[0].handName).toBe('Flush');
    
    const bob = getPlayerStats('bob-1');
    expect(bob!.sessions[0].handName).toBeUndefined();
  });

  it('adds new sessions to the front', () => {
    updateStatsFromHand(basicHand);
    updateStatsFromHand({ ...basicHand, handNumber: 2, timestamp: Date.now() + 1000 });
    
    const alice = getPlayerStats('alice-1');
    expect(alice!.sessions).toHaveLength(2);
    expect(alice!.sessions[0].handNumber).toBe(2);
    expect(alice!.sessions[1].handNumber).toBe(1);
  });

  it('limits session history to 100 entries', () => {
    // Create 105 hands
    for (let i = 1; i <= 105; i++) {
      updateStatsFromHand({
        ...basicHand,
        handNumber: i,
        timestamp: Date.now() + i,
      });
    }
    
    const alice = getPlayerStats('alice-1');
    expect(alice!.sessions).toHaveLength(100);
    // Most recent should be first
    expect(alice!.sessions[0].handNumber).toBe(105);
    // Oldest should be 6 (not 1-5)
    expect(alice!.sessions[99].handNumber).toBe(6);
  });
});

describe('Win Rate Calculations', () => {
  it('calculates correct win rate', () => {
    const hand = {
      gameId: 'game-1',
      handNumber: 1,
      timestamp: Date.now(),
      pot: 100,
      dealerSeat: 0,
      players: [
        { seat: 0, name: 'Alice', id: 'alice-1', isBot: false, startStack: 1000, endStack: 1050, isDealer: true },
        { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 950, isDealer: false },
      ],
      winners: [{ seat: 0, name: 'Alice', amount: 100 }],
    };
    
    // Alice wins first 3 hands
    for (let i = 1; i <= 3; i++) {
      updateStatsFromHand({ ...hand, handNumber: i });
    }
    
    // Bob wins next 2 hands
    const bobWins = {
      ...hand,
      players: [
        { seat: 0, name: 'Alice', id: 'alice-1', isBot: false, startStack: 1000, endStack: 950, isDealer: true },
        { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 1050, isDealer: false },
      ],
      winners: [{ seat: 1, name: 'Bob', amount: 100 }],
    };
    for (let i = 4; i <= 5; i++) {
      updateStatsFromHand({ ...bobWins, handNumber: i });
    }
    
    const alice = getPlayerStats('alice-1');
    const bob = getPlayerStats('bob-1');
    
    expect(alice!.handsPlayed).toBe(5);
    expect(alice!.handsWon).toBe(3);
    // Win rate: 3/5 = 0.6 = 60%
    const aliceWinRate = alice!.handsWon / alice!.handsPlayed;
    expect(aliceWinRate).toBeCloseTo(0.6);
    
    expect(bob!.handsPlayed).toBe(5);
    expect(bob!.handsWon).toBe(2);
    // Win rate: 2/5 = 0.4 = 40%
    const bobWinRate = bob!.handsWon / bob!.handsPlayed;
    expect(bobWinRate).toBeCloseTo(0.4);
  });
});

describe('Multi-way Pots and Split Pots', () => {
  it('tracks stats for multiple winners (split pot)', () => {
    const splitPot = {
      gameId: 'game-1',
      handNumber: 1,
      timestamp: Date.now(),
      pot: 200,
      dealerSeat: 0,
      players: [
        { seat: 0, name: 'Alice', id: 'alice-1', isBot: false, startStack: 1000, endStack: 1050, isDealer: true },
        { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 1050, isDealer: false },
        { seat: 2, name: 'Charlie', id: 'charlie-1', isBot: true, startStack: 1000, endStack: 900, isDealer: false },
      ],
      winners: [
        { seat: 0, name: 'Alice', amount: 100, handName: 'Straight' },
        { seat: 1, name: 'Bob', amount: 100, handName: 'Straight' },
      ],
    };
    
    updateStatsFromHand(splitPot);
    
    const alice = getPlayerStats('alice-1');
    const bob = getPlayerStats('bob-1');
    const charlie = getPlayerStats('charlie-1');
    
    expect(alice!.handsWon).toBe(1);
    expect(bob!.handsWon).toBe(1);
    expect(charlie!.handsWon).toBe(0);
  });

  it('handles side pots correctly', () => {
    // Alice all-in short stack, Bob and Charlie continue
    const sidePot = {
      gameId: 'game-1',
      handNumber: 1,
      timestamp: Date.now(),
      pot: 500,
      dealerSeat: 0,
      players: [
        { seat: 0, name: 'Alice', id: 'alice-1', isBot: false, startStack: 100, endStack: 300, isDealer: true },
        { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 700, isDealer: false },
        { seat: 2, name: 'Charlie', id: 'charlie-1', isBot: true, startStack: 1000, endStack: 1500, isDealer: false },
      ],
      winners: [
        { seat: 0, name: 'Alice', amount: 300, handName: 'Full House' }, // Main pot
        { seat: 2, name: 'Charlie', amount: 200, handName: 'Two Pair' }, // Side pot
      ],
    };
    
    updateStatsFromHand(sidePot);
    
    const alice = getPlayerStats('alice-1');
    const charlie = getPlayerStats('charlie-1');
    
    expect(alice!.handsWon).toBe(1);
    expect(charlie!.handsWon).toBe(1);
    expect(alice!.totalChipsWon).toBe(200); // 300 - 100 = 200 profit
    expect(charlie!.totalChipsWon).toBe(500); // 1500 - 1000 = 500 profit
  });
});

describe('Name Updates', () => {
  it('updates player name when changed', () => {
    const hand1 = {
      gameId: 'game-1',
      handNumber: 1,
      timestamp: Date.now(),
      pot: 100,
      dealerSeat: 0,
      players: [
        { seat: 0, name: 'OldName', id: 'player-1', isBot: false, startStack: 1000, endStack: 1050, isDealer: true },
        { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 950, isDealer: false },
      ],
      winners: [{ seat: 0, name: 'OldName', amount: 100 }],
    };
    
    updateStatsFromHand(hand1);
    expect(getPlayerStats('player-1')!.playerName).toBe('OldName');
    
    // Same player, new name
    const hand2 = {
      ...hand1,
      handNumber: 2,
      players: [
        { seat: 0, name: 'NewName', id: 'player-1', isBot: false, startStack: 1000, endStack: 1050, isDealer: true },
        { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 950, isDealer: false },
      ],
      winners: [{ seat: 0, name: 'NewName', amount: 100 }],
    };
    
    updateStatsFromHand(hand2);
    expect(getPlayerStats('player-1')!.playerName).toBe('NewName');
  });
});

describe('getAllPlayerStats', () => {
  it('returns all tracked players', () => {
    const hand = {
      gameId: 'game-1',
      handNumber: 1,
      timestamp: Date.now(),
      pot: 100,
      dealerSeat: 0,
      players: [
        { seat: 0, name: 'Alice', id: 'alice-1', isBot: false, startStack: 1000, endStack: 1050, isDealer: true },
        { seat: 1, name: 'Bob', id: 'bob-1', isBot: true, startStack: 1000, endStack: 950, isDealer: false },
        { seat: 2, name: 'Charlie', id: 'charlie-1', isBot: true, startStack: 1000, endStack: 1000, isDealer: false },
      ],
      winners: [{ seat: 0, name: 'Alice', amount: 100 }],
    };
    
    updateStatsFromHand(hand);
    
    const all = getAllPlayerStats();
    expect(all).toHaveLength(3);
    expect(all.map(s => s.playerId).sort()).toEqual(['alice-1', 'bob-1', 'charlie-1']);
  });
});
