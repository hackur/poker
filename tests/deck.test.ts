/**
 * Deck & Shuffle Tests
 * Tests for deck creation, shuffling, and dealing functionality
 */

import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal } from '../src/lib/poker/deck';
import type { Card } from '../src/lib/poker/types';

describe('Deck Creation', () => {
  it('creates a standard 52-card deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('contains all 4 suits', () => {
    const deck = createDeck();
    const suits = new Set(deck.map(c => c.suit));
    expect(suits.size).toBe(4);
    expect(suits.has('h')).toBe(true);
    expect(suits.has('d')).toBe(true);
    expect(suits.has('c')).toBe(true);
    expect(suits.has('s')).toBe(true);
  });

  it('contains all 13 ranks', () => {
    const deck = createDeck();
    const ranks = new Set(deck.map(c => c.rank));
    expect(ranks.size).toBe(13);
    // Check 2-10
    for (let r = 2; r <= 10; r++) {
      expect(ranks.has(r as Card['rank'])).toBe(true);
    }
    // Check face cards (J=11, Q=12, K=13, A=14)
    expect(ranks.has(11)).toBe(true);
    expect(ranks.has(12)).toBe(true);
    expect(ranks.has(13)).toBe(true);
    expect(ranks.has(14)).toBe(true);
  });

  it('contains no duplicates', () => {
    const deck = createDeck();
    const cardStrings = deck.map(c => `${c.rank}${c.suit}`);
    const uniqueCards = new Set(cardStrings);
    expect(uniqueCards.size).toBe(52);
  });

  it('has 13 cards per suit', () => {
    const deck = createDeck();
    const hearts = deck.filter(c => c.suit === 'h');
    const diamonds = deck.filter(c => c.suit === 'd');
    const clubs = deck.filter(c => c.suit === 'c');
    const spades = deck.filter(c => c.suit === 's');
    expect(hearts).toHaveLength(13);
    expect(diamonds).toHaveLength(13);
    expect(clubs).toHaveLength(13);
    expect(spades).toHaveLength(13);
  });
});

describe('Shuffle', () => {
  it('returns a new array', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).not.toBe(deck);
  });

  it('does not modify original deck', () => {
    const deck = createDeck();
    const originalFirst = deck[0];
    const originalLast = deck[51];
    shuffle(deck);
    // Original should be unchanged
    expect(deck[0]).toBe(originalFirst);
    expect(deck[51]).toBe(originalLast);
  });

  it('maintains 52 cards', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(52);
  });

  it('contains same cards as original', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    
    const originalSet = new Set(deck.map(c => `${c.rank}${c.suit}`));
    const shuffledSet = new Set(shuffled.map(c => `${c.rank}${c.suit}`));
    
    expect(shuffledSet.size).toBe(52);
    for (const card of originalSet) {
      expect(shuffledSet.has(card)).toBe(true);
    }
  });

  it('actually shuffles (different order)', () => {
    const deck = createDeck();
    // Run multiple shuffles and check that at least one is different
    let foundDifferent = false;
    for (let i = 0; i < 10; i++) {
      const shuffled = shuffle(deck);
      // Check if at least one card is in a different position
      const samePosition = deck.filter((c, idx) => 
        shuffled[idx].rank === c.rank && shuffled[idx].suit === c.suit
      );
      if (samePosition.length < 52) {
        foundDifferent = true;
        break;
      }
    }
    expect(foundDifferent).toBe(true);
  });

  it('produces different results on consecutive calls', () => {
    const deck = createDeck();
    const shuffled1 = shuffle(deck);
    const shuffled2 = shuffle(deck);
    
    // Very unlikely to get identical shuffles
    const s1 = shuffled1.map(c => `${c.rank}${c.suit}`).join(',');
    const s2 = shuffled2.map(c => `${c.rank}${c.suit}`).join(',');
    expect(s1).not.toBe(s2);
  });
});

describe('Deal', () => {
  it('deals correct number of cards', () => {
    const deck = createDeck();
    const { cards, nextIndex } = deal(deck, 0, 2);
    expect(cards).toHaveLength(2);
    expect(nextIndex).toBe(2);
  });

  it('deals from correct starting position', () => {
    const deck = createDeck();
    const { cards: firstTwo } = deal(deck, 0, 2);
    const { cards: nextTwo } = deal(deck, 2, 2);
    
    expect(firstTwo[0]).toBe(deck[0]);
    expect(firstTwo[1]).toBe(deck[1]);
    expect(nextTwo[0]).toBe(deck[2]);
    expect(nextTwo[1]).toBe(deck[3]);
  });

  it('handles dealing entire deck', () => {
    const deck = createDeck();
    const { cards, nextIndex } = deal(deck, 0, 52);
    expect(cards).toHaveLength(52);
    expect(nextIndex).toBe(52);
  });

  it('deals hole cards for 6 players', () => {
    const deck = shuffle(createDeck());
    let idx = 0;
    const players: Card[][] = [];
    
    // Deal 2 cards to each of 6 players
    for (let i = 0; i < 6; i++) {
      const { cards, nextIndex } = deal(deck, idx, 2);
      players.push(cards);
      idx = nextIndex;
    }
    
    expect(players).toHaveLength(6);
    for (const hand of players) {
      expect(hand).toHaveLength(2);
    }
    expect(idx).toBe(12); // 6 players * 2 cards
  });

  it('deals community cards correctly', () => {
    const deck = shuffle(createDeck());
    let idx = 12; // After dealing to 6 players
    
    // Burn and deal flop (3)
    idx++; // burn
    const { cards: flop, nextIndex: afterFlop } = deal(deck, idx, 3);
    expect(flop).toHaveLength(3);
    idx = afterFlop;
    
    // Burn and deal turn (1)
    idx++; // burn
    const { cards: turn, nextIndex: afterTurn } = deal(deck, idx, 1);
    expect(turn).toHaveLength(1);
    idx = afterTurn;
    
    // Burn and deal river (1)
    idx++; // burn
    const { cards: river, nextIndex: afterRiver } = deal(deck, idx, 1);
    expect(river).toHaveLength(1);
    
    // Total: 12 (hole) + 1 (burn) + 3 (flop) + 1 (burn) + 1 (turn) + 1 (burn) + 1 (river) = 20
    expect(afterRiver).toBe(20);
  });

  it('returns empty array when dealing 0 cards', () => {
    const deck = createDeck();
    const { cards, nextIndex } = deal(deck, 0, 0);
    expect(cards).toHaveLength(0);
    expect(nextIndex).toBe(0);
  });

  it('handles dealing beyond deck length gracefully', () => {
    const deck = createDeck();
    const { cards } = deal(deck, 50, 5);
    // Should return only 2 cards (52 - 50)
    expect(cards).toHaveLength(2);
  });
});
