// ============================================================
// Core Poker Types
// ============================================================

export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
}

export enum HandRank {
  HIGH_CARD = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10,
}

export interface HandResult {
  rank: HandRank;
  values: number[]; // Tiebreaker values in order of significance
  cards: Card[];    // Best 5-card hand
  name: string;     // Human-readable description
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

export interface PlayerAction {
  type: ActionType;
  amount?: number;
}

export interface ValidAction {
  type: ActionType;
  minAmount?: number;
  maxAmount?: number;
}

export interface Player {
  id: string;
  name: string;
  seat: number;
  stack: number;
  holeCards: Card[];
  currentBet: number;  // Amount bet this street
  totalBet: number;    // Amount bet this hand
  folded: boolean;
  allIn: boolean;
  isBot: boolean;
  botModel?: string;
  /** Bot session ID for conversation context (bots only) */
  sessionId?: string;
  hasActedThisRound: boolean;
}

export interface Pot {
  amount: number;
  eligible: string[]; // Player IDs eligible to win
}

export type GamePhase =
  | 'waiting'
  | 'dealing'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown';

export interface GameState {
  id: string;
  /** UUID for this game instance */
  gameId: string;
  players: Player[];
  communityCards: Card[];
  pots: Pot[];
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  activePlayerIndex: number;
  phase: GamePhase;
  handNumber: number;
  /** UUID for the current hand */
  handId: string;
  deck: Card[];
  deckIndex: number;
  isActive: boolean;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  lastAction?: { seat: number; action: ActionType; amount?: number };
  winners?: { seat: number; amount: number; handName?: string }[];
}

/** What a specific player is allowed to see */
export interface PlayerGameView {
  id: string;
  /** UUID for this game instance */
  gameId: string;
  /** UUID for the current hand */
  handId: string;
  phase: GamePhase;
  players: PublicPlayerInfo[];
  communityCards: Card[];
  pots: Pot[];
  currentBet: number;
  dealerSeat: number;
  activePlayerSeat: number | null;
  myCards: Card[];
  mySeat: number;
  myStack: number;
  validActions: ValidAction[];
  maxPlayers: number;
  handNumber: number;
  smallBlind: number;
  bigBlind: number;
  lastAction?: { seat: number; action: ActionType; amount?: number };
  winners?: { seat: number; amount: number; handName?: string }[];
  showdownHands?: { seat: number; cards: Card[]; handName: string }[];
}

export interface PublicPlayerInfo {
  id: string;
  name: string;
  seat: number;
  stack: number;
  currentBet: number;
  folded: boolean;
  allIn: boolean;
  isBot: boolean;
  botModel?: string;
  hasCards: boolean;     // Whether they have hole cards (not folded)
  isActive: boolean;     // Whether it's their turn
  showCards?: Card[];    // Only set during showdown reveal
}

export const RANK_DISPLAY: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
  9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const SUIT_DISPLAY: Record<string, string> = {
  h: '♥', d: '♦', c: '♣', s: '♠',
};

export const SUIT_COLOR: Record<string, 'red' | 'black'> = {
  h: 'red', d: 'red', c: 'black', s: 'black',
};

export function cardToString(card: Card): string {
  return `${RANK_DISPLAY[card.rank]}${SUIT_DISPLAY[card.suit]}`;
}
