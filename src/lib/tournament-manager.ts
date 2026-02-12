/**
 * Phase 12: Tournament Manager
 * Full tournament lifecycle management
 */

import {
  BlindScheduleManager,
  BlindLevel,
  STANDARD_SCHEDULE,
  TURBO_SCHEDULE,
  DEEP_STACK_SCHEDULE,
} from './blind-schedule';
import {
  Player,
  TableAssignment,
  Bracket,
  BracketMatch,
  snakeSeat,
  randomSeat,
  getOptimalTableCount,
  consolidateTables,
  generateSingleElimination,
  generateDoubleElimination,
  generateRoundRobin,
} from './bracket-generator';
import { calculatePayouts, PayoutEntry } from './payout-calculator';

export type TournamentType =
  | 'single-elimination'
  | 'double-elimination'
  | 'round-robin'
  | 'scheduled'
  | 'sit-and-go';

export type TournamentStatus = 'pending' | 'registering' | 'active' | 'paused' | 'complete' | 'cancelled';

export interface TournamentConfig {
  id: string;
  name: string;
  type: TournamentType;
  buyIn: number;
  maxPlayers: number;
  minPlayers: number;
  startingChips: number;
  blindSchedule: 'turbo' | 'standard' | 'deep-stack' | 'custom';
  customBlindLevels?: BlindLevel[];
  allowRebuys: boolean;
  rebuyLevelCutoff?: number; // Can't rebuy after this level
  rebuyCost?: number;
  rebuyChips?: number;
  allowAddOn: boolean;
  addOnCost?: number;
  addOnChips?: number;
  addOnAtLevel?: number; // Add-on available at break after this level
  scheduledStartTime?: number; // For scheduled tournaments
  seatingMethod: 'snake' | 'random';
  payoutStructure: 'standard' | 'top-heavy' | 'flat' | 'custom';
  customPayoutPercentages?: number[];
  maxPerTable?: number;
  minPerTable?: number;
}

export interface TournamentState {
  config: TournamentConfig;
  status: TournamentStatus;
  players: Player[];
  eliminatedPlayers: string[]; // ordered by elimination (last eliminated = highest place)
  tableAssignments: TableAssignment[];
  bracket: Bracket | null;
  blindManager: ReturnType<BlindScheduleManager['getState']> | null;
  currentLevel: number;
  prizePool: number;
  rebuyCount: number;
  addOnCount: number;
  startedAt: number | null;
  completedAt: number | null;
  payouts: PayoutEntry[];
  leaderboard: { playerId: string; place: number; payout: number }[];
}

export class TournamentManager {
  private config: TournamentConfig;
  private status: TournamentStatus = 'pending';
  private players: Player[] = [];
  private eliminatedPlayers: string[] = [];
  private tableAssignments: TableAssignment[] = [];
  private bracket: Bracket | null = null;
  private blindManager: BlindScheduleManager | null = null;
  private prizePool: number = 0;
  private rebuyCount: number = 0;
  private addOnCount: number = 0;
  private startedAt: number | null = null;
  private completedAt: number | null = null;

  constructor(config: TournamentConfig) {
    this.config = config;
  }

  // --- Registration ---

  register(player: Player): { success: boolean; error?: string } {
    if (this.status !== 'pending' && this.status !== 'registering') {
      return { success: false, error: 'Tournament is not accepting registrations' };
    }
    if (this.players.length >= this.config.maxPlayers) {
      return { success: false, error: 'Tournament is full' };
    }
    if (this.players.find((p) => p.id === player.id)) {
      return { success: false, error: 'Player already registered' };
    }

    this.players.push({ ...player, chips: this.config.startingChips });
    this.prizePool += this.config.buyIn;
    this.status = 'registering';

    // Sit & Go: auto-start when full
    if (this.config.type === 'sit-and-go' && this.players.length >= this.config.maxPlayers) {
      this.start();
    }

    return { success: true };
  }

  unregister(playerId: string): { success: boolean; error?: string } {
    if (this.status !== 'pending' && this.status !== 'registering') {
      return { success: false, error: 'Cannot unregister after tournament starts' };
    }
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return { success: false, error: 'Player not found' };

    this.players.splice(idx, 1);
    this.prizePool -= this.config.buyIn;
    return { success: true };
  }

  // --- Lifecycle ---

  start(): { success: boolean; error?: string } {
    if (this.status === 'active') return { success: false, error: 'Already started' };
    if (this.players.length < this.config.minPlayers) {
      return { success: false, error: `Need at least ${this.config.minPlayers} players` };
    }

    // Scheduled tournament check
    if (this.config.type === 'scheduled' && this.config.scheduledStartTime) {
      if (Date.now() < this.config.scheduledStartTime) {
        return { success: false, error: 'Scheduled start time not reached' };
      }
    }

    this.status = 'active';
    this.startedAt = Date.now();

    // Initialize blind schedule
    if (this.config.blindSchedule === 'custom' && this.config.customBlindLevels) {
      this.blindManager = BlindScheduleManager.custom(this.config.customBlindLevels);
    } else {
      this.blindManager = BlindScheduleManager.fromPreset(
        this.config.blindSchedule === 'custom' ? 'standard' : this.config.blindSchedule
      );
    }
    this.blindManager.start();

    // Seat players
    this.seatPlayers();

    // Generate bracket for elimination tournaments
    if (this.config.type === 'single-elimination') {
      this.bracket = generateSingleElimination(this.players);
    } else if (this.config.type === 'double-elimination') {
      this.bracket = generateDoubleElimination(this.players);
    } else if (this.config.type === 'round-robin') {
      this.bracket = generateRoundRobin(this.players);
    }

    return { success: true };
  }

  private seatPlayers(): void {
    const tableCount = getOptimalTableCount(
      this.players.length,
      this.config.minPerTable ?? 4,
      this.config.maxPerTable ?? 9
    );

    this.tableAssignments =
      this.config.seatingMethod === 'snake'
        ? snakeSeat(this.players, tableCount, this.config.maxPerTable ?? 9)
        : randomSeat(this.players, tableCount, this.config.maxPerTable ?? 9);
  }

  pause(): void {
    if (this.status !== 'active') return;
    this.status = 'paused';
    this.blindManager?.pause();
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'active';
    this.blindManager?.resume();
  }

  cancel(): void {
    this.status = 'cancelled';
    this.completedAt = Date.now();
  }

  // --- Gameplay ---

  eliminatePlayer(playerId: string): {
    success: boolean;
    consolidated?: boolean;
    removedTables?: string[];
  } {
    if (this.status !== 'active') return { success: false };
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { success: false };
    if (this.eliminatedPlayers.includes(playerId)) return { success: false };

    this.eliminatedPlayers.push(playerId);

    // Check table consolidation
    const eliminatedSet = new Set(this.eliminatedPlayers);
    const { newAssignments, removedTableIds } = consolidateTables(
      this.tableAssignments,
      eliminatedSet,
      this.config.minPerTable ?? 4,
      this.config.maxPerTable ?? 9
    );
    this.tableAssignments = newAssignments;

    // Check if tournament is over
    const activePlayers = this.players.length - this.eliminatedPlayers.length;
    if (activePlayers <= 1) {
      this.complete();
    }

    return {
      success: true,
      consolidated: removedTableIds.length > 0,
      removedTables: removedTableIds,
    };
  }

  rebuy(playerId: string): { success: boolean; error?: string } {
    if (!this.config.allowRebuys) return { success: false, error: 'Rebuys not allowed' };
    if (!this.blindManager) return { success: false, error: 'Tournament not started' };

    const levelIndex = this.blindManager.getLevelIndex();
    if (this.config.rebuyLevelCutoff && levelIndex >= this.config.rebuyLevelCutoff) {
      return { success: false, error: 'Rebuy period has ended' };
    }

    if (!this.eliminatedPlayers.includes(playerId)) {
      return { success: false, error: 'Player is not eliminated' };
    }

    // Remove from eliminated, add chips
    this.eliminatedPlayers = this.eliminatedPlayers.filter((id) => id !== playerId);
    const player = this.players.find((p) => p.id === playerId);
    if (player) {
      player.chips = this.config.rebuyChips ?? this.config.startingChips;
    }

    this.prizePool += this.config.rebuyCost ?? this.config.buyIn;
    this.rebuyCount++;

    return { success: true };
  }

  addOn(playerId: string): { success: boolean; error?: string } {
    if (!this.config.allowAddOn) return { success: false, error: 'Add-ons not allowed' };
    if (!this.blindManager) return { success: false, error: 'Tournament not started' };

    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    player.chips = (player.chips ?? 0) + (this.config.addOnChips ?? this.config.startingChips);
    this.prizePool += this.config.addOnCost ?? this.config.buyIn;
    this.addOnCount++;

    return { success: true };
  }

  /**
   * Tick the blind timer. Call periodically. Returns true if level advanced.
   */
  tickBlinds(): boolean {
    if (!this.blindManager || this.status !== 'active') return false;
    return this.blindManager.tick();
  }

  // --- Completion ---

  private complete(): void {
    this.status = 'complete';
    this.completedAt = Date.now();
  }

  getPayouts(): PayoutEntry[] {
    return calculatePayouts({
      totalPrizePool: this.prizePool,
      playerCount: this.players.length,
      structure: this.config.payoutStructure === 'custom' ? 'standard' : this.config.payoutStructure,
      customPercentages: this.config.customPayoutPercentages,
    });
  }

  getLeaderboard(): { playerId: string; playerName: string; place: number; payout: number }[] {
    const payouts = this.getPayouts();
    const activePlayers = this.players.filter(
      (p) => !this.eliminatedPlayers.includes(p.id)
    );
    const placedPlayers = [
      ...activePlayers.map((p) => p.id),
      ...[...this.eliminatedPlayers].reverse(),
    ];

    return placedPlayers.map((pid, i) => {
      const player = this.players.find((p) => p.id === pid)!;
      const place = i + 1;
      const payout = payouts.find((p) => p.place === place);
      return {
        playerId: pid,
        playerName: player?.name ?? 'Unknown',
        place,
        payout: payout?.amount ?? 0,
      };
    });
  }

  // --- Match Management (for bracket tournaments) ---

  reportMatchResult(matchId: string, winnerId: string): { success: boolean } {
    if (!this.bracket) return { success: false };

    for (const round of this.bracket.rounds) {
      const match = round.find((m) => m.matchId === matchId);
      if (match) {
        match.winnerId = winnerId;
        match.loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
        match.status = 'complete';
        this.propagateWinner(match);
        return { success: true };
      }
    }

    if (this.bracket.losersRounds) {
      for (const round of this.bracket.losersRounds) {
        const match = round.find((m) => m.matchId === matchId);
        if (match) {
          match.winnerId = winnerId;
          match.loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
          match.status = 'complete';
          return { success: true };
        }
      }
    }

    return { success: false };
  }

  private propagateWinner(match: BracketMatch): void {
    if (!this.bracket) return;
    const nextRoundIdx = match.round; // rounds are 0-indexed in array, match.round is 1-indexed
    if (nextRoundIdx >= this.bracket.rounds.length) return;

    const nextMatchIdx = Math.floor(match.matchIndex / 2);
    const nextMatch = this.bracket.rounds[nextRoundIdx]?.[nextMatchIdx];
    if (!nextMatch) return;

    if (match.matchIndex % 2 === 0) {
      nextMatch.player1Id = match.winnerId;
    } else {
      nextMatch.player2Id = match.winnerId;
    }

    // If both players set, mark as pending (ready to play)
    if (nextMatch.player1Id && nextMatch.player2Id) {
      nextMatch.status = 'pending';
    }
  }

  // --- State ---

  getState(): TournamentState {
    return {
      config: this.config,
      status: this.status,
      players: [...this.players],
      eliminatedPlayers: [...this.eliminatedPlayers],
      tableAssignments: [...this.tableAssignments],
      bracket: this.bracket,
      blindManager: this.blindManager?.getState() ?? null,
      currentLevel: this.blindManager?.getLevelIndex() ?? 0,
      prizePool: this.prizePool,
      rebuyCount: this.rebuyCount,
      addOnCount: this.addOnCount,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      payouts: this.getPayouts(),
      leaderboard: this.getLeaderboard(),
    };
  }

  getStatus(): TournamentStatus {
    return this.status;
  }

  getConfig(): TournamentConfig {
    return this.config;
  }

  getPlayers(): Player[] {
    return [...this.players];
  }

  getTableAssignments(): TableAssignment[] {
    return [...this.tableAssignments];
  }

  getBracket(): Bracket | null {
    return this.bracket;
  }

  getActiveTables(): string[] {
    const eliminatedSet = new Set(this.eliminatedPlayers);
    const active = this.tableAssignments.filter((a) => !eliminatedSet.has(a.playerId));
    return [...new Set(active.map((a) => a.tableId))];
  }

  getPlayersAtTable(tableId: string): TableAssignment[] {
    const eliminatedSet = new Set(this.eliminatedPlayers);
    return this.tableAssignments.filter(
      (a) => a.tableId === tableId && !eliminatedSet.has(a.playerId)
    );
  }
}

// --- Tournament Store (in-memory, edge-compatible) ---

const tournaments = new Map<string, TournamentManager>();

export function createTournament(config: TournamentConfig): TournamentManager {
  const manager = new TournamentManager(config);
  tournaments.set(config.id, manager);
  return manager;
}

export function getTournament(id: string): TournamentManager | undefined {
  return tournaments.get(id);
}

export function listTournaments(): TournamentState[] {
  return [...tournaments.values()].map((t) => t.getState());
}

export function deleteTournament(id: string): boolean {
  return tournaments.delete(id);
}
