import type { Card, Suit, Rank } from './types';

const SUITS: Suit[] = ['h', 'd', 'c', 's'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** Create a standard 52-card deck */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle — returns a new array */
export function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Deal `count` cards from the deck starting at `index` */
export function deal(deck: Card[], index: number, count: number): { cards: Card[]; nextIndex: number } {
  const cards = deck.slice(index, index + count);
  return { cards, nextIndex: index + count };
}
