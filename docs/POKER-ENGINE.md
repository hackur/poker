# Poker Engine Design

The poker engine is a **pure logic package** with zero side effects. No I/O, no network, no database. Just state in → state out.

## Location

```
src/lib/poker/
├── types.ts      # All type definitions (149 lines)
├── deck.ts       # Card, Deck, Shuffle (31 lines)
├── hand-eval.ts  # Hand ranking + comparison (173 lines)
├── game.ts       # Game state machine (530 lines)
├── bot.ts        # Bot decision engine (378 lines)
├── bot-drivers.ts # AI model integration (519 lines)
└── index.ts      # Re-exports
```

## State Machine

```
  ┌──────────┐
  │  WAITING │  (need 2+ players)
  └────┬─────┘
       ▼
  ┌──────────┐
  │  DEALING │  Post blinds, deal hole cards
  └────┬─────┘
       ▼
  ┌──────────┐
  │ PRE-FLOP │  First betting round
  └────┬─────┘
       ▼
  ┌──────────┐
  │   FLOP   │  3 community cards + betting
  └────┬─────┘
       ▼
  ┌──────────┐
  │   TURN   │  1 community card + betting
  └────┬─────┘
       ▼
  ┌──────────┐
  │   RIVER  │  1 community card + final betting
  └────┬─────┘
       ▼
  ┌──────────┐
  │ SHOWDOWN │  Evaluate hands, determine winners
  └────┬─────┘
       │ loop
       ▼
  ┌──────────┐
  │  DEALING │  (next hand)
  └──────────┘
```

## Hand Rankings

```typescript
enum HandRank {
  HIGH_CARD       = 1,
  ONE_PAIR        = 2,
  TWO_PAIR        = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT        = 5,
  FLUSH           = 6,
  FULL_HOUSE      = 7,
  FOUR_OF_A_KIND  = 8,
  STRAIGHT_FLUSH  = 9,
  ROYAL_FLUSH     = 10,
}
```

## Hand Evaluation

Best 5 from 7 cards (2 hole + 5 community) = 21 combinations.

```typescript
function evaluateHand(cards: Card[]): HandResult {
  // Generate all 21 5-card combinations
  // Evaluate each, return best
}

function compareHands(a: HandResult, b: HandResult): number {
  // Returns >0 if a wins, <0 if b wins, 0 if tie
  // Compares rank, then kickers
}
```

## Betting Logic

### Valid Actions

```typescript
function getValidActions(state: GameState, playerId: string): ValidAction[] {
  // Returns ONLY legal actions for this player
  // Includes min/max bet amounts
}
```

### Action Types
- `fold` — give up hand
- `check` — pass (only if no bet to call)
- `call` — match current bet
- `bet` — first bet of a round
- `raise` — increase a bet
- `all_in` — bet entire stack

### Side Pots

When a player goes all-in with less than the current bet:

```typescript
interface Pot {
  amount: number;
  eligible: string[];  // playerIds who can win this pot
}
```

## Heads-Up Rules

In 2-player games, the **dealer posts the small blind** (standard heads-up rules):

```typescript
function smallBlindSeat(state: GameState): number {
  if (state.players.length === 2) return state.dealerSeat;
  return nextActiveSeat(state, state.dealerSeat);
}
```

## Key Types

```typescript
interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pots: Pot[];
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  activePlayerIndex: number;
  phase: GamePhase;
  handNumber: number;
  // ... deck, blinds, etc.
}

interface PlayerGameView {
  // What a specific player is allowed to see
  // Hides opponent hole cards until showdown
  myCards: Card[];
  validActions: ValidAction[];
  // ... public info
}
```

## Server-Authoritative

The client **never** sees opponent hole cards until showdown. The server:
1. Validates every action against game state
2. Returns only the player's view (their cards + public info)
3. Reveals all cards only during showdown phase
