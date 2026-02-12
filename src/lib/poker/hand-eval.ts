import { type Card, type HandResult, HandRank, RANK_DISPLAY } from './types';

// ============================================================
// Hand Evaluation — Evaluate best 5 from 7 cards
// ============================================================

/** Get all C(n, k) combinations */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

/** Evaluate the best 5-card hand from 5-7 cards */
export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length < 5) throw new Error('Need at least 5 cards');
  if (cards.length === 5) return evaluate5(cards);

  const combos = combinations(cards, 5);
  let best: HandResult | null = null;

  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || compareHands(result, best) > 0) {
      best = result;
    }
  }

  return best!;
}

/** Compare two hand results. Returns >0 if a wins, <0 if b wins, 0 if tie */
export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank;

  for (let i = 0; i < Math.min(a.values.length, b.values.length); i++) {
    if (a.values[i] !== b.values[i]) return a.values[i] - b.values[i];
  }

  return 0;
}

/** Evaluate exactly 5 cards */
function evaluate5(cards: Card[]): HandResult {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  const uniqueRanks = [...new Set(ranks)];
  if (uniqueRanks.length === 5) {
    if (ranks[0] - ranks[4] === 4) {
      isStraight = true;
      straightHigh = ranks[0];
    }
    // Wheel: A-2-3-4-5
    if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Count rank frequencies, sorted by count desc then rank desc
  const freq = new Map<number, number>();
  for (const r of ranks) freq.set(r, (freq.get(r) ?? 0) + 1);

  const groups = [...freq.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // By count desc
    return b[0] - a[0]; // By rank desc
  });

  const counts = groups.map((g) => g[1]);
  const groupRanks = groups.map((g) => g[0]);
  const rankName = (r: number) => RANK_DISPLAY[r];

  // Straight flush / Royal flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return { rank: HandRank.ROYAL_FLUSH, values: [14], cards, name: 'Royal Flush' };
    }
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      values: [straightHigh],
      cards,
      name: `Straight Flush, ${rankName(straightHigh)} high`,
    };
  }

  // Four of a kind
  if (counts[0] === 4) {
    return {
      rank: HandRank.FOUR_OF_A_KIND,
      values: [groupRanks[0], groupRanks[1]],
      cards,
      name: `Four of a Kind, ${rankName(groupRanks[0])}s`,
    };
  }

  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    return {
      rank: HandRank.FULL_HOUSE,
      values: [groupRanks[0], groupRanks[1]],
      cards,
      name: `Full House, ${rankName(groupRanks[0])}s full of ${rankName(groupRanks[1])}s`,
    };
  }

  // Flush
  if (isFlush) {
    return {
      rank: HandRank.FLUSH,
      values: ranks,
      cards,
      name: `Flush, ${rankName(ranks[0])} high`,
    };
  }

  // Straight
  if (isStraight) {
    return {
      rank: HandRank.STRAIGHT,
      values: [straightHigh],
      cards,
      name: `Straight, ${rankName(straightHigh)} high`,
    };
  }

  // Three of a kind
  if (counts[0] === 3) {
    return {
      rank: HandRank.THREE_OF_A_KIND,
      values: [groupRanks[0], groupRanks[1], groupRanks[2]],
      cards,
      name: `Three of a Kind, ${rankName(groupRanks[0])}s`,
    };
  }

  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    return {
      rank: HandRank.TWO_PAIR,
      values: [groupRanks[0], groupRanks[1], groupRanks[2]],
      cards,
      name: `Two Pair, ${rankName(groupRanks[0])}s and ${rankName(groupRanks[1])}s`,
    };
  }

  // One pair
  if (counts[0] === 2) {
    return {
      rank: HandRank.ONE_PAIR,
      values: [groupRanks[0], groupRanks[1], groupRanks[2], groupRanks[3]],
      cards,
      name: `Pair of ${rankName(groupRanks[0])}s`,
    };
  }

  // High card
  return {
    rank: HandRank.HIGH_CARD,
    values: ranks,
    cards,
    name: `${rankName(ranks[0])} High`,
  };
}
