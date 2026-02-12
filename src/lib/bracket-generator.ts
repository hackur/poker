/**
 * Phase 12: Bracket Generator
 * Seating, pairing, and bracket management for tournaments
 */

export interface Player {
  id: string;
  name: string;
  elo?: number;
  chips?: number;
}

export interface TableAssignment {
  tableId: string;
  seat: number;
  playerId: string;
}

export interface BracketMatch {
  matchId: string;
  round: number;
  matchIndex: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  loserId: string | null;
  tableId: string | null;
  status: 'pending' | 'active' | 'complete';
}

export interface Bracket {
  type: 'single-elimination' | 'double-elimination' | 'round-robin';
  rounds: BracketMatch[][];
  losersRounds?: BracketMatch[][]; // double elimination only
}

// --- Seating Algorithms ---

/**
 * Snake seating: distribute players across tables in snake order
 * sorted by ELO to balance table strength.
 * E.g., 8 players, 2 tables: T1 gets #1,#4,#5,#8; T2 gets #2,#3,#6,#7
 */
export function snakeSeat(
  players: Player[],
  tableCount: number,
  maxPerTable: number = 9
): TableAssignment[] {
  const sorted = [...players].sort((a, b) => (b.elo ?? 1200) - (a.elo ?? 1200));
  const assignments: TableAssignment[] = [];
  const tableSeatCounters: number[] = new Array(tableCount).fill(0);

  for (let i = 0; i < sorted.length; i++) {
    const round = Math.floor(i / tableCount);
    const pos = i % tableCount;
    const tableIndex = round % 2 === 0 ? pos : tableCount - 1 - pos;

    if (tableSeatCounters[tableIndex] >= maxPerTable) continue;

    assignments.push({
      tableId: `table-${tableIndex + 1}`,
      seat: tableSeatCounters[tableIndex],
      playerId: sorted[i].id,
    });
    tableSeatCounters[tableIndex]++;
  }

  return assignments;
}

/**
 * Random seating with table balancing
 */
export function randomSeat(
  players: Player[],
  tableCount: number,
  maxPerTable: number = 9
): TableAssignment[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  return snakeSeatFromOrder(shuffled, tableCount, maxPerTable);
}

function snakeSeatFromOrder(
  ordered: Player[],
  tableCount: number,
  maxPerTable: number
): TableAssignment[] {
  const assignments: TableAssignment[] = [];
  const counters = new Array(tableCount).fill(0);

  for (let i = 0; i < ordered.length; i++) {
    const tableIndex = i % tableCount;
    if (counters[tableIndex] >= maxPerTable) continue;
    assignments.push({
      tableId: `table-${tableIndex + 1}`,
      seat: counters[tableIndex],
      playerId: ordered[i].id,
    });
    counters[tableIndex]++;
  }
  return assignments;
}

/**
 * Calculate optimal table count for a given number of players
 */
export function getOptimalTableCount(
  playerCount: number,
  minPerTable: number = 4,
  maxPerTable: number = 9
): number {
  if (playerCount <= maxPerTable) return 1;
  const ideal = Math.ceil(playerCount / maxPerTable);
  // Verify all tables have at least minPerTable
  const perTable = Math.floor(playerCount / ideal);
  if (perTable < minPerTable) return Math.max(1, Math.floor(playerCount / minPerTable));
  return ideal;
}

/**
 * Table consolidation: when players are eliminated, rebalance tables
 * Returns new assignments for moved players
 */
export function consolidateTables(
  currentAssignments: TableAssignment[],
  eliminatedPlayerIds: Set<string>,
  minPerTable: number = 4,
  maxPerTable: number = 9
): { newAssignments: TableAssignment[]; removedTableIds: string[] } {
  // Get active players per table
  const active = currentAssignments.filter((a) => !eliminatedPlayerIds.has(a.playerId));
  const tableMap = new Map<string, TableAssignment[]>();

  for (const a of active) {
    if (!tableMap.has(a.tableId)) tableMap.set(a.tableId, []);
    tableMap.get(a.tableId)!.push(a);
  }

  const totalPlayers = active.length;
  const neededTables = getOptimalTableCount(totalPlayers, minPerTable, maxPerTable);
  const currentTables = [...tableMap.entries()].sort((a, b) => a[1].length - b[1].length);

  if (currentTables.length <= neededTables) {
    return { newAssignments: active, removedTableIds: [] };
  }

  // Remove smallest tables first, redistribute players
  const removedTableIds: string[] = [];
  const playersToMove: TableAssignment[] = [];
  const keepTables = currentTables.slice(currentTables.length - neededTables);
  const removeTables = currentTables.slice(0, currentTables.length - neededTables);

  for (const [tableId, assignments] of removeTables) {
    removedTableIds.push(tableId);
    playersToMove.push(...assignments);
  }

  // Distribute moved players to kept tables (fill smallest first)
  const keptMap = new Map(keepTables);
  for (const player of playersToMove) {
    // Find table with fewest players
    let minTable = keepTables[0][0];
    let minCount = keptMap.get(minTable)!.length;
    for (const [tid, assigns] of keptMap) {
      if (assigns.length < minCount) {
        minTable = tid;
        minCount = assigns.length;
      }
    }
    const newAssignment: TableAssignment = {
      tableId: minTable,
      seat: keptMap.get(minTable)!.length,
      playerId: player.playerId,
    };
    keptMap.get(minTable)!.push(newAssignment);
  }

  const newAssignments: TableAssignment[] = [];
  for (const [, assigns] of keptMap) {
    newAssignments.push(...assigns);
  }

  return { newAssignments, removedTableIds };
}

// --- Bracket Generation ---

/**
 * Generate single elimination bracket
 */
export function generateSingleElimination(players: Player[]): Bracket {
  const n = players.length;
  const rounds: BracketMatch[][] = [];

  // Pad to nearest power of 2 with byes
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const byeCount = bracketSize - n;

  // Seed players (highest ELO gets easiest path)
  const seeded = [...players].sort((a, b) => (b.elo ?? 1200) - (a.elo ?? 1200));

  // Round 1
  const round1: BracketMatch[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const p1Index = i;
    const p2Index = bracketSize - 1 - i;
    const p1 = p1Index < seeded.length ? seeded[p1Index].id : null;
    const p2 = p2Index < seeded.length ? seeded[p2Index].id : null;

    const match: BracketMatch = {
      matchId: `r1-m${i}`,
      round: 1,
      matchIndex: i,
      player1Id: p1,
      player2Id: p2,
      winnerId: (!p1 && p2) ? p2 : (!p2 && p1) ? p1 : null,
      loserId: null,
      tableId: null,
      status: (!p1 || !p2) ? 'complete' : 'pending',
    };
    round1.push(match);
  }
  rounds.push(round1);

  // Subsequent rounds
  let matchesInRound = bracketSize / 4;
  let roundNum = 2;
  while (matchesInRound >= 1) {
    const round: BracketMatch[] = [];
    for (let i = 0; i < matchesInRound; i++) {
      round.push({
        matchId: `r${roundNum}-m${i}`,
        round: roundNum,
        matchIndex: i,
        player1Id: null,
        player2Id: null,
        winnerId: null,
        loserId: null,
        tableId: null,
        status: 'pending',
      });
    }
    rounds.push(round);
    matchesInRound /= 2;
    roundNum++;
  }

  return { type: 'single-elimination', rounds };
}

/**
 * Generate double elimination bracket
 */
export function generateDoubleElimination(players: Player[]): Bracket {
  const winners = generateSingleElimination(players);
  const n = players.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));

  // Losers bracket has roughly 2x rounds - 1
  const losersRounds: BracketMatch[][] = [];
  let losersInRound = bracketSize / 2;
  let roundNum = 1;

  while (losersInRound >= 1) {
    const round: BracketMatch[] = [];
    for (let i = 0; i < losersInRound; i++) {
      round.push({
        matchId: `L-r${roundNum}-m${i}`,
        round: roundNum,
        matchIndex: i,
        player1Id: null,
        player2Id: null,
        winnerId: null,
        loserId: null,
        tableId: null,
        status: 'pending',
      });
    }
    losersRounds.push(round);
    // Losers bracket alternates between same-size and half-size rounds
    if (roundNum % 2 === 0) losersInRound /= 2;
    roundNum++;
    if (losersInRound < 1) break;
  }

  return {
    type: 'double-elimination',
    rounds: winners.rounds,
    losersRounds,
  };
}

/**
 * Generate round robin schedule
 */
export function generateRoundRobin(players: Player[]): Bracket {
  const n = players.length;
  const rounds: BracketMatch[][] = [];
  const list = [...players];

  // If odd number, add a bye
  if (n % 2 !== 0) {
    list.push({ id: 'BYE', name: 'BYE' });
  }

  const numRounds = list.length - 1;
  const halfSize = list.length / 2;

  for (let round = 0; round < numRounds; round++) {
    const matches: BracketMatch[] = [];
    for (let i = 0; i < halfSize; i++) {
      const p1 = list[i];
      const p2 = list[list.length - 1 - i];
      if (p1.id === 'BYE' || p2.id === 'BYE') continue;

      matches.push({
        matchId: `rr-r${round + 1}-m${i}`,
        round: round + 1,
        matchIndex: i,
        player1Id: p1.id,
        player2Id: p2.id,
        winnerId: null,
        loserId: null,
        tableId: null,
        status: 'pending',
      });
    }
    rounds.push(matches);

    // Rotate: fix first player, rotate the rest
    const last = list.pop()!;
    list.splice(1, 0, last);
  }

  return { type: 'round-robin', rounds };
}
