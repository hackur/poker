import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands } from '../src/lib/poker/hand-eval';
import { type Card, HandRank } from '../src/lib/poker/types';

// Helper to create cards
function card(rank: number, suit: 'h' | 'd' | 'c' | 's'): Card {
  return { rank: rank as Card['rank'], suit };
}

describe('Hand Evaluation', () => {
  describe('Royal Flush', () => {
    it('identifies royal flush', () => {
      const cards = [card(14, 'h'), card(13, 'h'), card(12, 'h'), card(11, 'h'), card(10, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.ROYAL_FLUSH);
      expect(result.name).toBe('Royal Flush');
    });

    it('finds royal flush from 7 cards', () => {
      const cards = [
        card(14, 'h'), card(13, 'h'), card(12, 'h'), card(11, 'h'), card(10, 'h'),
        card(2, 'd'), card(3, 'c'),
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.ROYAL_FLUSH);
    });
  });

  describe('Straight Flush', () => {
    it('identifies straight flush', () => {
      const cards = [card(9, 's'), card(8, 's'), card(7, 's'), card(6, 's'), card(5, 's')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.STRAIGHT_FLUSH);
      expect(result.values).toEqual([9]);
    });

    it('identifies steel wheel (A-2-3-4-5 suited)', () => {
      const cards = [card(14, 'd'), card(2, 'd'), card(3, 'd'), card(4, 'd'), card(5, 'd')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.STRAIGHT_FLUSH);
      expect(result.values).toEqual([5]); // 5-high straight flush
    });
  });

  describe('Four of a Kind', () => {
    it('identifies four of a kind', () => {
      const cards = [card(8, 'h'), card(8, 'd'), card(8, 'c'), card(8, 's'), card(3, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FOUR_OF_A_KIND);
      expect(result.values).toEqual([8, 3]);
    });

    it('uses highest kicker', () => {
      const cards = [
        card(8, 'h'), card(8, 'd'), card(8, 'c'), card(8, 's'),
        card(14, 'h'), card(2, 'd'), card(3, 'c'),
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FOUR_OF_A_KIND);
      expect(result.values).toEqual([8, 14]); // Ace kicker
    });
  });

  describe('Full House', () => {
    it('identifies full house', () => {
      const cards = [card(10, 'h'), card(10, 'd'), card(10, 'c'), card(4, 's'), card(4, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FULL_HOUSE);
      expect(result.values).toEqual([10, 4]);
    });

    it('picks best full house from 7 cards', () => {
      const cards = [
        card(10, 'h'), card(10, 'd'), card(10, 'c'),
        card(8, 's'), card(8, 'h'),
        card(4, 'd'), card(4, 'c'),
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FULL_HOUSE);
      expect(result.values).toEqual([10, 8]); // 10s full of 8s (not 4s)
    });
  });

  describe('Flush', () => {
    it('identifies flush', () => {
      const cards = [card(14, 'c'), card(9, 'c'), card(7, 'c'), card(5, 'c'), card(2, 'c')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FLUSH);
      expect(result.values).toEqual([14, 9, 7, 5, 2]);
    });

    it('picks highest flush from 7 cards', () => {
      const cards = [
        card(14, 'c'), card(9, 'c'), card(7, 'c'), card(5, 'c'), card(2, 'c'),
        card(13, 'c'), card(11, 'c'), // Two more clubs
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FLUSH);
      expect(result.values).toEqual([14, 13, 11, 9, 7]); // Best 5 clubs
    });
  });

  describe('Straight', () => {
    it('identifies straight', () => {
      const cards = [card(9, 'h'), card(8, 'd'), card(7, 'c'), card(6, 's'), card(5, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.STRAIGHT);
      expect(result.values).toEqual([9]);
    });

    it('identifies wheel (A-2-3-4-5)', () => {
      const cards = [card(14, 'h'), card(2, 'd'), card(3, 'c'), card(4, 's'), card(5, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.STRAIGHT);
      expect(result.values).toEqual([5]); // 5-high straight
    });

    it('identifies broadway (10-J-Q-K-A)', () => {
      const cards = [card(14, 'h'), card(13, 'd'), card(12, 'c'), card(11, 's'), card(10, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.STRAIGHT);
      expect(result.values).toEqual([14]);
    });
  });

  describe('Three of a Kind', () => {
    it('identifies three of a kind', () => {
      const cards = [card(7, 'h'), card(7, 'd'), card(7, 'c'), card(12, 's'), card(3, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.THREE_OF_A_KIND);
      expect(result.values).toEqual([7, 12, 3]);
    });
  });

  describe('Two Pair', () => {
    it('identifies two pair', () => {
      const cards = [card(11, 'h'), card(11, 'd'), card(4, 'c'), card(4, 's'), card(9, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.TWO_PAIR);
      expect(result.values).toEqual([11, 4, 9]);
    });

    it('picks best two pair from 7 cards', () => {
      const cards = [
        card(11, 'h'), card(11, 'd'),
        card(8, 'c'), card(8, 's'),
        card(4, 'h'), card(4, 'd'),
        card(2, 'c'),
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.TWO_PAIR);
      expect(result.values).toEqual([11, 8, 4]); // JJ and 88, 4 kicker
    });
  });

  describe('One Pair', () => {
    it('identifies one pair', () => {
      const cards = [card(6, 'h'), card(6, 'd'), card(14, 'c'), card(9, 's'), card(3, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.ONE_PAIR);
      expect(result.values).toEqual([6, 14, 9, 3]);
    });
  });

  describe('High Card', () => {
    it('identifies high card', () => {
      const cards = [card(14, 'h'), card(10, 'd'), card(7, 'c'), card(5, 's'), card(2, 'h')];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.HIGH_CARD);
      expect(result.values).toEqual([14, 10, 7, 5, 2]);
      expect(result.name).toBe('A High');
    });
  });

  describe('Best 5 from 7', () => {
    it('finds hidden straight', () => {
      // Hole cards: 9h, 8d; Board: 7c, 6s, 5h, Kd, 2c
      const cards = [
        card(9, 'h'), card(8, 'd'), // Hole
        card(7, 'c'), card(6, 's'), card(5, 'h'), card(13, 'd'), card(2, 'c'), // Board
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.STRAIGHT);
      expect(result.values).toEqual([9]);
    });

    it('finds hidden flush', () => {
      // Hole cards: Ah, 2h; Board: Kh, 9h, 4h, Jd, 3c
      const cards = [
        card(14, 'h'), card(2, 'h'), // Hole
        card(13, 'h'), card(9, 'h'), card(4, 'h'), card(11, 'd'), card(3, 'c'), // Board
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.FLUSH);
    });
  });
});

describe('Hand Comparison', () => {
  it('higher rank wins', () => {
    const flush = evaluateHand([card(14, 'c'), card(9, 'c'), card(7, 'c'), card(5, 'c'), card(2, 'c')]);
    const straight = evaluateHand([card(9, 'h'), card(8, 'd'), card(7, 'c'), card(6, 's'), card(5, 'h')]);
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
    expect(compareHands(straight, flush)).toBeLessThan(0);
  });

  it('same rank uses kickers', () => {
    const pairAces = evaluateHand([card(14, 'h'), card(14, 'd'), card(10, 'c'), card(5, 's'), card(2, 'h')]);
    const pairKings = evaluateHand([card(13, 'h'), card(13, 'd'), card(14, 'c'), card(5, 's'), card(2, 'h')]);
    expect(compareHands(pairAces, pairKings)).toBeGreaterThan(0);
  });

  it('identical hands tie', () => {
    const hand1 = evaluateHand([card(14, 'h'), card(13, 'd'), card(10, 'c'), card(5, 's'), card(2, 'h')]);
    const hand2 = evaluateHand([card(14, 's'), card(13, 'c'), card(10, 'h'), card(5, 'd'), card(2, 'c')]);
    expect(compareHands(hand1, hand2)).toBe(0);
  });

  it('kicker comparison for two pair', () => {
    // JJ44 with 9 kicker vs JJ44 with 8 kicker
    const better = evaluateHand([card(11, 'h'), card(11, 'd'), card(4, 'c'), card(4, 's'), card(9, 'h')]);
    const worse = evaluateHand([card(11, 's'), card(11, 'c'), card(4, 'h'), card(4, 'd'), card(8, 'c')]);
    expect(compareHands(better, worse)).toBeGreaterThan(0);
  });

  it('higher straight wins', () => {
    const broadway = evaluateHand([card(14, 'h'), card(13, 'd'), card(12, 'c'), card(11, 's'), card(10, 'h')]);
    const wheel = evaluateHand([card(14, 's'), card(2, 'd'), card(3, 'c'), card(4, 's'), card(5, 'h')]);
    expect(compareHands(broadway, wheel)).toBeGreaterThan(0);
  });
});

describe('Edge Cases', () => {
  it('throws on less than 5 cards', () => {
    expect(() => evaluateHand([card(14, 'h'), card(13, 'd'), card(12, 'c'), card(11, 's')])).toThrow();
  });

  it('handles exactly 5 cards', () => {
    const cards = [card(14, 'h'), card(13, 'd'), card(12, 'c'), card(11, 's'), card(10, 'h')];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HandRank.STRAIGHT);
  });

  it('handles exactly 7 cards', () => {
    const cards = [
      card(14, 'h'), card(14, 'd'), card(14, 'c'), card(14, 's'),
      card(13, 'h'), card(12, 'd'), card(11, 'c'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HandRank.FOUR_OF_A_KIND);
  });
});
