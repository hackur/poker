import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGame,
  startHand,
  executeAction,
  getValidActions,
  getPlayerView,
  isHandComplete,
  getActivePlayerId,
  canStartHand,
  type GameConfig,
} from '../src/lib/poker/game';
import type { GameState, ValidAction } from '../src/lib/poker/types';

// ============================================================
// Test Helpers
// ============================================================

function createTestGame(playerCount = 6, stackSize = 1000): GameState {
  const config: GameConfig = {
    id: 'test-game',
    smallBlind: 5,
    bigBlind: 10,
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i}`,
      name: `Player ${i}`,
      stack: stackSize,
      isBot: i > 0,
    })),
  };
  return createGame(config);
}

function createHeadsUpGame(stack1 = 1000, stack2 = 1000): GameState {
  const config: GameConfig = {
    id: 'heads-up',
    smallBlind: 5,
    bigBlind: 10,
    players: [
      { id: 'player-0', name: 'Hero', stack: stack1, isBot: false },
      { id: 'player-1', name: 'Villain', stack: stack2, isBot: true },
    ],
  };
  return createGame(config);
}

function hasActionType(actions: ValidAction[], type: string): boolean {
  return actions.some((a) => a.type === type);
}

function getActionByType(actions: ValidAction[], type: string): ValidAction | undefined {
  return actions.find((a) => a.type === type);
}

// ============================================================
// Game Creation
// ============================================================

describe('Game Creation', () => {
  it('creates game with correct initial state', () => {
    const state = createTestGame();
    expect(state.id).toBe('test-game');
    expect(state.players).toHaveLength(6);
    expect(state.phase).toBe('waiting');
    expect(state.handNumber).toBe(0);
    expect(state.smallBlind).toBe(5);
    expect(state.bigBlind).toBe(10);
  });

  it('initializes player stacks correctly', () => {
    const state = createTestGame(3, 500);
    for (const p of state.players) {
      expect(p.stack).toBe(500);
      expect(p.holeCards).toHaveLength(0);
      expect(p.folded).toBe(false);
    }
  });
});

// ============================================================
// Hand Start
// ============================================================

describe('Hand Start', () => {
  it('deals hole cards to all players', () => {
    const state = createTestGame();
    startHand(state);

    for (const p of state.players) {
      expect(p.holeCards).toHaveLength(2);
    }
  });

  it('posts blinds correctly (6-max)', () => {
    const state = createTestGame();
    startHand(state);

    // Dealer seat 0, SB seat 1, BB seat 2
    const sb = state.players.find((p) => p.seat === 1)!;
    const bb = state.players.find((p) => p.seat === 2)!;

    expect(sb.currentBet).toBe(5);
    expect(sb.stack).toBe(995);
    expect(bb.currentBet).toBe(10);
    expect(bb.stack).toBe(990);
  });

  it('sets phase to preflop', () => {
    const state = createTestGame();
    startHand(state);
    expect(state.phase).toBe('preflop');
  });

  it('increments hand number', () => {
    const state = createTestGame();
    expect(state.handNumber).toBe(0);
    startHand(state);
    expect(state.handNumber).toBe(1);
    // Simulate hand completion and restart
    state.phase = 'waiting';
    startHand(state);
    expect(state.handNumber).toBe(2);
  });
});

// ============================================================
// Heads-Up Blinds
// ============================================================

describe('Heads-Up Blinds', () => {
  it('dealer posts small blind in heads-up', () => {
    const state = createHeadsUpGame();
    startHand(state);

    // In heads-up, dealer (seat 0) posts SB
    const dealer = state.players.find((p) => p.seat === state.dealerSeat)!;
    const other = state.players.find((p) => p.seat !== state.dealerSeat)!;

    expect(dealer.currentBet).toBe(5); // SB
    expect(other.currentBet).toBe(10); // BB
  });
});

// ============================================================
// Valid Actions
// ============================================================

describe('Valid Actions', () => {
  it('returns empty for non-active player', () => {
    const state = createTestGame();
    startHand(state);

    // Get a player who is NOT active
    const activeId = getActivePlayerId(state);
    const inactivePlayer = state.players.find((p) => p.id !== activeId)!;

    expect(getValidActions(state, inactivePlayer.id)).toHaveLength(0);
  });

  it('returns fold, call, raise for preflop action', () => {
    const state = createTestGame();
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    const actions = getValidActions(state, activeId);

    expect(hasActionType(actions, 'fold')).toBe(true);
    expect(hasActionType(actions, 'call')).toBe(true);
    expect(hasActionType(actions, 'raise')).toBe(true);
  });

  it('calculates min raise correctly', () => {
    const state = createTestGame();
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    const actions = getValidActions(state, activeId);
    const raiseAction = getActionByType(actions, 'raise')!;

    // currentBet is 10 (BB), min raise is +10, so total 20
    // Player needs to put in 20 - 0 = 20 to min-raise
    expect(raiseAction.minAmount).toBe(20);
  });

  it('allows check when no bet to call', () => {
    const state = createHeadsUpGame();
    startHand(state);

    // Skip to flop where checks are possible
    const activeId = getActivePlayerId(state)!;
    // Call BB
    executeAction(state, activeId, { type: 'call' });
    // BB checks
    const bbId = getActivePlayerId(state)!;
    const actions = getValidActions(state, bbId);

    expect(hasActionType(actions, 'check')).toBe(true);
  });

  it('all-in available when stack < min raise', () => {
    // Stack of 18: post SB (5) = 13 left
    // To call BB: 5 more = 8 left
    // Min raise: 10 more = need 15, but only have 8 after call
    // So all-in (8 remaining) should be available
    const state = createHeadsUpGame(18, 1000);
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    const actions = getValidActions(state, activeId);

    // Can call (5) and should have all-in option since can't min-raise
    expect(hasActionType(actions, 'call')).toBe(true);
    expect(hasActionType(actions, 'all_in')).toBe(true);
    expect(hasActionType(actions, 'raise')).toBe(false); // Can't min-raise
  });
});

// ============================================================
// Action Execution
// ============================================================

describe('Action Execution', () => {
  it('fold removes player from hand', () => {
    const state = createTestGame();
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    executeAction(state, activeId, { type: 'fold' });

    const player = state.players.find((p) => p.id === activeId)!;
    expect(player.folded).toBe(true);
  });

  it('call matches current bet', () => {
    const state = createTestGame();
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    const player = state.players.find((p) => p.id === activeId)!;
    const initialStack = player.stack;

    executeAction(state, activeId, { type: 'call' });

    expect(player.currentBet).toBe(10); // Matched BB
    expect(player.stack).toBe(initialStack - 10);
  });

  it('raise increases current bet', () => {
    const state = createTestGame();
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    executeAction(state, activeId, { type: 'raise', amount: 30 });

    const player = state.players.find((p) => p.id === activeId)!;
    expect(player.currentBet).toBe(30);
    expect(state.currentBet).toBe(30);
  });

  it('check works when no bet to call', () => {
    const state = createHeadsUpGame();
    startHand(state);

    // Call to complete preflop
    executeAction(state, getActivePlayerId(state)!, { type: 'call' });
    // BB can check
    const bbId = getActivePlayerId(state)!;
    const result = executeAction(state, bbId, { type: 'check' });

    expect(result).toBe(true);
    expect(state.phase).toBe('flop');
  });

  it('all-in puts all chips in pot', () => {
    const state = createHeadsUpGame(100, 1000);
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    const player = state.players.find((p) => p.id === activeId)!;

    executeAction(state, activeId, { type: 'all_in' });

    expect(player.stack).toBe(0);
    expect(player.allIn).toBe(true);
  });

  it('rejects invalid action', () => {
    const state = createTestGame();
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    // Can't check when facing a bet
    const result = executeAction(state, activeId, { type: 'check' });

    expect(result).toBe(false);
  });
});

// ============================================================
// Street Progression
// ============================================================

describe('Street Progression', () => {
  it('advances to flop after preflop betting', () => {
    const state = createHeadsUpGame();
    startHand(state);

    executeAction(state, getActivePlayerId(state)!, { type: 'call' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });

    expect(state.phase).toBe('flop');
    expect(state.communityCards).toHaveLength(3);
  });

  it('advances to turn after flop betting', () => {
    const state = createHeadsUpGame();
    startHand(state);

    // Preflop
    executeAction(state, getActivePlayerId(state)!, { type: 'call' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    // Flop
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });

    expect(state.phase).toBe('turn');
    expect(state.communityCards).toHaveLength(4);
  });

  it('advances to river after turn betting', () => {
    const state = createHeadsUpGame();
    startHand(state);

    // Preflop
    executeAction(state, getActivePlayerId(state)!, { type: 'call' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    // Flop
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    // Turn
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });

    expect(state.phase).toBe('river');
    expect(state.communityCards).toHaveLength(5);
  });

  it('advances to showdown after river betting', () => {
    const state = createHeadsUpGame();
    startHand(state);

    // Preflop
    executeAction(state, getActivePlayerId(state)!, { type: 'call' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    // Flop
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    // Turn
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    // River
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });

    expect(state.phase).toBe('showdown');
    expect(isHandComplete(state)).toBe(true);
  });

  it('resets bets each street', () => {
    const state = createHeadsUpGame();
    startHand(state);

    executeAction(state, getActivePlayerId(state)!, { type: 'call' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });

    // After advancing to flop, current bets should be 0
    for (const p of state.players) {
      expect(p.currentBet).toBe(0);
    }
    expect(state.currentBet).toBe(0);
  });
});

// ============================================================
// Fold to Win
// ============================================================

describe('Fold to Win', () => {
  it('awards pot when everyone folds', () => {
    const state = createHeadsUpGame();
    startHand(state);

    const folderId = getActivePlayerId(state)!;
    const winnerId = state.players.find((p) => p.id !== folderId)!.id;

    executeAction(state, folderId, { type: 'fold' });

    expect(isHandComplete(state)).toBe(true);
    const winner = state.players.find((p) => p.id === winnerId)!;
    // Winner gets SB + BB = 15
    expect(winner.stack).toBe(1000 - 10 + 15); // 1005
  });

  it('settles hand immediately on all-fold', () => {
    const state = createTestGame(4);
    startHand(state);

    // All but one fold
    while (state.phase !== 'showdown') {
      const activeId = getActivePlayerId(state);
      if (!activeId) break;
      executeAction(state, activeId, { type: 'fold' });
    }

    expect(state.phase).toBe('showdown');
    expect(state.winners).toBeDefined();
    expect(state.winners).toHaveLength(1);
  });
});

// ============================================================
// Side Pots
// ============================================================

describe('Side Pots', () => {
  it('creates side pot when player is all-in', () => {
    // Player 0 has 50, Player 1 has 1000
    const state = createHeadsUpGame(50, 1000);
    startHand(state);

    // Player 0 (dealer/SB) goes all-in
    executeAction(state, getActivePlayerId(state)!, { type: 'all_in' });
    // Player 1 calls
    executeAction(state, getActivePlayerId(state)!, { type: 'call' });

    // With 50 each contributed, pot should be 100
    const totalPot = state.pots.reduce((sum, pot) => sum + pot.amount, 0);
    expect(totalPot).toBe(100);
  });

  it('runs all-in to showdown automatically', () => {
    const state = createHeadsUpGame(50, 1000);
    startHand(state);

    // Both all-in preflop
    executeAction(state, getActivePlayerId(state)!, { type: 'all_in' });
    executeAction(state, getActivePlayerId(state)!, { type: 'call' });

    // Should run to showdown (no more actions needed)
    expect(state.phase).toBe('showdown');
    expect(state.communityCards).toHaveLength(5);
  });
});

// ============================================================
// Player View
// ============================================================

describe('Player View', () => {
  it('hides opponent hole cards', () => {
    const state = createHeadsUpGame();
    startHand(state);

    const view = getPlayerView(state, 'player-0');

    // My cards should be visible
    expect(view.myCards).toHaveLength(2);

    // Opponent cards should be hidden (showCards undefined during play)
    const opponent = view.players.find((p) => p.id === 'player-1')!;
    expect(opponent.showCards).toBeUndefined();
  });

  it('reveals cards at showdown', () => {
    const state = createHeadsUpGame();
    startHand(state);

    // Play to showdown
    executeAction(state, getActivePlayerId(state)!, { type: 'call' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });
    executeAction(state, getActivePlayerId(state)!, { type: 'check' });

    const view = getPlayerView(state, 'player-0');

    // Now showdownHands should have both players' cards
    expect(view.showdownHands).toBeDefined();
    expect(view.showdownHands).toHaveLength(2);
  });

  it('includes valid actions for active player', () => {
    const state = createTestGame();
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    const view = getPlayerView(state, activeId);

    expect(view.validActions.length).toBeGreaterThan(0);
  });

  it('returns empty valid actions for inactive player', () => {
    const state = createTestGame();
    startHand(state);

    const activeId = getActivePlayerId(state)!;
    const inactiveId = state.players.find((p) => p.id !== activeId)!.id;
    const view = getPlayerView(state, inactiveId);

    expect(view.validActions).toHaveLength(0);
  });
});

// ============================================================
// Utility Functions
// ============================================================

describe('Utility Functions', () => {
  it('canStartHand requires 2+ players with chips', () => {
    const state = createTestGame(2);
    expect(canStartHand(state)).toBe(true);

    // Zero out one player
    state.players[0].stack = 0;
    expect(canStartHand(state)).toBe(false);
  });

  it('isHandComplete is true only at showdown', () => {
    const state = createTestGame();
    expect(isHandComplete(state)).toBe(false);

    startHand(state);
    expect(isHandComplete(state)).toBe(false);

    // Force showdown
    state.phase = 'showdown';
    expect(isHandComplete(state)).toBe(true);
  });
});
