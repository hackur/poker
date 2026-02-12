/**
 * Phase 12: Tournament Tests
 */

import { describe, it, expect } from 'vitest';
import { TournamentManager, type TournamentConfig } from '../lib/tournament-manager';
import { BlindScheduleManager, STANDARD_SCHEDULE } from '../lib/blind-schedule';
import {
  snakeSeat,
  getOptimalTableCount,
  consolidateTables,
  generateSingleElimination,
  generateDoubleElimination,
  generateRoundRobin,
  type Player,
} from '../lib/bracket-generator';
import { calculatePayouts, calculateICMChop } from '../lib/payout-calculator';

// --- Blind Schedule Tests ---

describe('BlindScheduleManager', () => {
  it('starts at level 1', () => {
    const mgr = BlindScheduleManager.fromPreset('standard');
    mgr.start();
    const state = mgr.getState();
    expect(state.currentLevel.smallBlind).toBe(10);
    expect(state.currentLevel.bigBlind).toBe(20);
    expect(state.levelIndex).toBe(0);
  });

  it('advances levels', () => {
    const mgr = BlindScheduleManager.fromPreset('standard');
    mgr.start();
    const advanced = mgr.advanceLevel();
    expect(advanced).toBe(true);
    expect(mgr.getCurrentLevel().smallBlind).toBe(15);
  });

  it('pauses and resumes', () => {
    const mgr = BlindScheduleManager.fromPreset('turbo');
    mgr.start();
    mgr.pause();
    expect(mgr.getState().isPaused).toBe(true);
    mgr.resume();
    expect(mgr.getState().isPaused).toBe(false);
  });

  it('returns next level', () => {
    const mgr = BlindScheduleManager.fromPreset('standard');
    mgr.start();
    const next = mgr.getNextLevel();
    expect(next).not.toBeNull();
    expect(next!.smallBlind).toBe(15);
  });
});

// --- Seating Tests ---

describe('Snake Seating', () => {
  const players: Player[] = Array.from({ length: 18 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    elo: 1200 + (18 - i) * 10,
  }));

  it('distributes players across tables', () => {
    const assignments = snakeSeat(players, 2);
    const table1 = assignments.filter((a) => a.tableId === 'table-1');
    const table2 = assignments.filter((a) => a.tableId === 'table-2');
    expect(table1.length).toBe(9);
    expect(table2.length).toBe(9);
  });

  it('balances ELO via snake ordering', () => {
    const assignments = snakeSeat(players, 2);
    // Highest ELO player should be at table-1
    expect(assignments[0].tableId).toBe('table-1');
    // Second highest at table-2
    const p2Assignment = assignments.find((a) => a.playerId === 'p2');
    expect(p2Assignment?.tableId).toBe('table-2');
  });
});

describe('Table Count', () => {
  it('returns 1 for small groups', () => {
    expect(getOptimalTableCount(6)).toBe(1);
    expect(getOptimalTableCount(9)).toBe(1);
  });

  it('returns 2 for medium groups', () => {
    expect(getOptimalTableCount(14)).toBe(2);
  });

  it('returns correct count for large groups', () => {
    expect(getOptimalTableCount(27)).toBe(3);
  });
});

describe('Table Consolidation', () => {
  it('consolidates when tables get too small', () => {
    const assignments = [
      { tableId: 'table-1', seat: 0, playerId: 'p1' },
      { tableId: 'table-1', seat: 1, playerId: 'p2' },
      { tableId: 'table-1', seat: 2, playerId: 'p3' },
      { tableId: 'table-1', seat: 3, playerId: 'p4' },
      { tableId: 'table-2', seat: 0, playerId: 'p5' },
      { tableId: 'table-2', seat: 1, playerId: 'p6' },
    ];
    const eliminated = new Set(['p3', 'p4', 'p5']);
    const result = consolidateTables(assignments, eliminated, 2, 9);
    // Should consolidate to 1 table with 3 remaining players
    expect(result.newAssignments.length).toBe(3);
  });
});

// --- Bracket Tests ---

describe('Single Elimination', () => {
  it('generates correct rounds for 8 players', () => {
    const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      elo: 1200 + i * 50,
    }));
    const bracket = generateSingleElimination(players);
    expect(bracket.rounds.length).toBe(3); // 4 matches, 2 matches, 1 final
    expect(bracket.rounds[0].length).toBe(4);
    expect(bracket.rounds[1].length).toBe(2);
    expect(bracket.rounds[2].length).toBe(1);
  });

  it('handles byes for non-power-of-2', () => {
    const players: Player[] = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
    }));
    const bracket = generateSingleElimination(players);
    // Should pad to 8, giving 3 byes
    const byes = bracket.rounds[0].filter((m) => m.status === 'complete');
    expect(byes.length).toBe(3);
  });
});

describe('Double Elimination', () => {
  it('has losers bracket', () => {
    const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
    }));
    const bracket = generateDoubleElimination(players);
    expect(bracket.losersRounds).toBeDefined();
    expect(bracket.losersRounds!.length).toBeGreaterThan(0);
  });
});

describe('Round Robin', () => {
  it('generates correct number of rounds', () => {
    const players: Player[] = Array.from({ length: 4 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
    }));
    const bracket = generateRoundRobin(players);
    expect(bracket.rounds.length).toBe(3); // n-1 rounds
  });
});

// --- Payout Tests ---

describe('Payout Calculator', () => {
  it('calculates standard payouts', () => {
    const payouts = calculatePayouts({
      totalPrizePool: 1000,
      playerCount: 20,
      structure: 'standard',
    });
    expect(payouts.length).toBe(3);
    expect(payouts[0].place).toBe(1);
    const total = payouts.reduce((s, p) => s + p.amount, 0);
    expect(Math.abs(total - 1000)).toBeLessThan(1); // rounding tolerance
  });

  it('gives 100% to winner in small tournament', () => {
    const payouts = calculatePayouts({
      totalPrizePool: 500,
      playerCount: 4,
    });
    expect(payouts.length).toBe(1);
    expect(payouts[0].amount).toBe(500);
  });

  it('respects custom percentages', () => {
    const payouts = calculatePayouts({
      totalPrizePool: 1000,
      playerCount: 10,
      customPercentages: [60, 30, 10],
    });
    expect(payouts[0].amount).toBe(600);
    expect(payouts[1].amount).toBe(300);
    expect(payouts[2].amount).toBe(100);
  });
});

describe('ICM Chop', () => {
  it('gives proportional equity', () => {
    const result = calculateICMChop(
      [
        { playerId: 'p1', chips: 5000 },
        { playerId: 'p2', chips: 5000 },
      ],
      1000,
      [60, 40]
    );
    // Equal chips should give equal ICM equity
    expect(Math.abs(result[0].amount - result[1].amount)).toBeLessThan(1);
  });
});

// --- Tournament Manager Tests ---

describe('TournamentManager', () => {
  const baseConfig: TournamentConfig = {
    id: 'test-1',
    name: 'Test Tournament',
    type: 'sit-and-go',
    buyIn: 100,
    maxPlayers: 9,
    minPlayers: 2,
    startingChips: 10000,
    blindSchedule: 'turbo',
    allowRebuys: false,
    allowAddOn: false,
    seatingMethod: 'snake',
    payoutStructure: 'standard',
  };

  it('registers players', () => {
    const tm = new TournamentManager(baseConfig);
    const result = tm.register({ id: 'p1', name: 'Alice' });
    expect(result.success).toBe(true);
    expect(tm.getPlayers().length).toBe(1);
  });

  it('prevents double registration', () => {
    const tm = new TournamentManager(baseConfig);
    tm.register({ id: 'p1', name: 'Alice' });
    const result = tm.register({ id: 'p1', name: 'Alice' });
    expect(result.success).toBe(false);
  });

  it('prevents registration when full', () => {
    const tm = new TournamentManager({ ...baseConfig, maxPlayers: 2 });
    tm.register({ id: 'p1', name: 'Alice' });
    tm.register({ id: 'p2', name: 'Bob' });
    const result = tm.register({ id: 'p3', name: 'Charlie' });
    expect(result.success).toBe(false);
  });

  it('starts tournament with enough players', () => {
    const tm = new TournamentManager(baseConfig);
    tm.register({ id: 'p1', name: 'Alice' });
    tm.register({ id: 'p2', name: 'Bob' });
    const result = tm.start();
    expect(result.success).toBe(true);
    expect(tm.getStatus()).toBe('active');
  });

  it('fails to start with too few players', () => {
    const tm = new TournamentManager(baseConfig);
    tm.register({ id: 'p1', name: 'Alice' });
    const result = tm.start();
    expect(result.success).toBe(false);
  });

  it('sit-and-go auto-starts when full', () => {
    const tm = new TournamentManager({ ...baseConfig, maxPlayers: 2 });
    tm.register({ id: 'p1', name: 'Alice' });
    tm.register({ id: 'p2', name: 'Bob' });
    expect(tm.getStatus()).toBe('active');
  });

  it('eliminates players and completes', () => {
    const tm = new TournamentManager({ ...baseConfig, maxPlayers: 2 });
    tm.register({ id: 'p1', name: 'Alice' });
    tm.register({ id: 'p2', name: 'Bob' });
    // Auto-started
    tm.eliminatePlayer('p2');
    expect(tm.getStatus()).toBe('complete');
  });

  it('seats players at tables', () => {
    const tm = new TournamentManager(baseConfig);
    for (let i = 0; i < 9; i++) {
      tm.register({ id: `p${i}`, name: `Player ${i}`, elo: 1200 + i * 10 });
    }
    tm.start();
    const assignments = tm.getTableAssignments();
    expect(assignments.length).toBe(9);
    expect(tm.getActiveTables().length).toBe(1);
  });

  it('generates payouts', () => {
    const tm = new TournamentManager(baseConfig);
    for (let i = 0; i < 9; i++) {
      tm.register({ id: `p${i}`, name: `Player ${i}` });
    }
    tm.start();
    const payouts = tm.getPayouts();
    expect(payouts.length).toBeGreaterThan(0);
    expect(payouts[0].amount).toBeGreaterThan(0);
  });

  it('generates leaderboard', () => {
    const tm = new TournamentManager({ ...baseConfig, maxPlayers: 3, minPlayers: 3 });
    tm.register({ id: 'p1', name: 'Alice' });
    tm.register({ id: 'p2', name: 'Bob' });
    tm.register({ id: 'p3', name: 'Charlie' });
    tm.start();
    tm.eliminatePlayer('p3');
    tm.eliminatePlayer('p2');
    const lb = tm.getLeaderboard();
    expect(lb[0].playerName).toBe('Alice');
    expect(lb[0].place).toBe(1);
    expect(lb[1].playerName).toBe('Bob');
    expect(lb[2].playerName).toBe('Charlie');
  });
});
