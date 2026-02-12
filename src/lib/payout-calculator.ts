/**
 * Phase 12: Payout Calculator
 * Prize distribution for tournaments
 */

export interface PayoutEntry {
  place: number;
  percentage: number;
  amount: number;
}

export interface PayoutConfig {
  totalPrizePool: number;
  playerCount: number;
  structure?: 'standard' | 'top-heavy' | 'flat' | 'custom';
  customPercentages?: number[];
}

// Payout structures by number of paid places
const STANDARD_PAYOUTS: Record<number, number[]> = {
  1: [100],
  2: [65, 35],
  3: [50, 30, 20],
  4: [45, 25, 18, 12],
  5: [40, 23, 16, 12, 9],
  6: [35, 22, 16, 12, 9, 6],
  7: [32, 20, 15, 11, 9, 7, 6],
  8: [30, 19, 14, 10, 8, 7, 6, 6],
  9: [28, 18, 13, 10, 8, 7, 6, 5, 5],
  10: [26, 17, 12, 10, 8, 7, 6, 5, 5, 4],
};

const TOP_HEAVY_PAYOUTS: Record<number, number[]> = {
  1: [100],
  2: [75, 25],
  3: [60, 25, 15],
  4: [55, 22, 14, 9],
  5: [50, 20, 14, 9, 7],
  6: [45, 20, 14, 9, 7, 5],
};

const FLAT_PAYOUTS: Record<number, number[]> = {
  1: [100],
  2: [55, 45],
  3: [40, 32, 28],
  4: [32, 27, 22, 19],
  5: [28, 23, 20, 16, 13],
  6: [25, 21, 18, 15, 12, 9],
};

function getPaidPlaces(playerCount: number): number {
  if (playerCount <= 6) return 1;
  if (playerCount <= 10) return 2;
  if (playerCount <= 18) return 3;
  if (playerCount <= 27) return Math.min(4, Math.floor(playerCount * 0.15));
  if (playerCount <= 45) return Math.min(6, Math.floor(playerCount * 0.15));
  if (playerCount <= 90) return Math.min(8, Math.floor(playerCount * 0.15));
  return Math.min(10, Math.floor(playerCount * 0.12));
}

function getPercentages(
  paidPlaces: number,
  structure: 'standard' | 'top-heavy' | 'flat'
): number[] {
  const table = {
    standard: STANDARD_PAYOUTS,
    'top-heavy': TOP_HEAVY_PAYOUTS,
    flat: FLAT_PAYOUTS,
  }[structure];

  const clamped = Math.min(paidPlaces, Math.max(...Object.keys(table).map(Number)));
  return table[clamped] || table[Math.max(...Object.keys(table).map(Number))];
}

export function calculatePayouts(config: PayoutConfig): PayoutEntry[] {
  const { totalPrizePool, playerCount, structure = 'standard', customPercentages } = config;

  let percentages: number[];

  if (customPercentages && customPercentages.length > 0) {
    percentages = customPercentages;
  } else {
    const paidPlaces = getPaidPlaces(playerCount);
    percentages = getPercentages(paidPlaces, structure);
  }

  // Normalize percentages to sum to 100
  const sum = percentages.reduce((a, b) => a + b, 0);
  const normalized = percentages.map((p) => (p / sum) * 100);

  return normalized.map((pct, i) => ({
    place: i + 1,
    percentage: Math.round(pct * 100) / 100,
    amount: Math.round((pct / 100) * totalPrizePool * 100) / 100,
  }));
}

/**
 * ICM (Independent Chip Model) based chip chop calculation
 */
export function calculateICMChop(
  chipCounts: { playerId: string; chips: number }[],
  totalPrizePool: number,
  payoutPercentages: number[]
): { playerId: string; amount: number }[] {
  const totalChips = chipCounts.reduce((sum, p) => sum + p.chips, 0);
  const payouts = payoutPercentages.map((pct) => (pct / 100) * totalPrizePool);
  const n = chipCounts.length;

  // Simple ICM approximation using Malmuth-Harville
  const equities: Record<string, number> = {};
  for (const player of chipCounts) {
    equities[player.playerId] = 0;
  }

  function icmRecurse(
    remaining: { playerId: string; chips: number }[],
    place: number,
    probability: number
  ) {
    if (place >= payouts.length || remaining.length === 0) return;

    const remTotal = remaining.reduce((s, p) => s + p.chips, 0);
    for (let i = 0; i < remaining.length; i++) {
      const player = remaining[i];
      const prob = (player.chips / remTotal) * probability;
      equities[player.playerId] += prob * payouts[place];

      if (place + 1 < payouts.length) {
        const next = remaining.filter((_, j) => j !== i);
        icmRecurse(next, place + 1, prob);
      }
    }
  }

  // For performance, limit ICM to 6 players max (factorial complexity)
  if (n <= 6) {
    icmRecurse(chipCounts, 0, 1);
  } else {
    // Fallback: proportional to chip count weighted by payout structure
    const avgPayout = payouts.reduce((a, b) => a + b, 0) / n;
    for (const player of chipCounts) {
      equities[player.playerId] = (player.chips / totalChips) * totalPrizePool;
    }
  }

  return chipCounts.map((p) => ({
    playerId: p.playerId,
    amount: Math.round(equities[p.playerId] * 100) / 100,
  }));
}

/**
 * Get payout summary string for display
 */
export function formatPayoutSummary(payouts: PayoutEntry[]): string {
  return payouts
    .map((p) => `${p.place}${getOrdinalSuffix(p.place)}: $${p.amount.toFixed(2)} (${p.percentage}%)`)
    .join('\n');
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
