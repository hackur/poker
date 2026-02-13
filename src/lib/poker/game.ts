import { createDeck, shuffle, deal } from './deck';
import { evaluateHand, compareHands } from './hand-eval';
import { uuid } from '../uuid';
import type {
  Card, Player, Pot, GameState, GamePhase, PlayerAction,
  ValidAction, PlayerGameView, PublicPlayerInfo, ActionType,
} from './types';

// ============================================================
// Game Creation
// ============================================================

export interface GameConfig {
  id: string;
  smallBlind: number;
  bigBlind: number;
  maxPlayers?: number;
  players: { 
    id: string; 
    name: string; 
    stack: number; 
    isBot: boolean; 
    botModel?: string;
    /** Bot session ID for conversation context (bots only) */
    sessionId?: string;
  }[];
}

export function createGame(config: GameConfig): GameState {
  return {
    id: config.id,
    gameId: uuid(),
    players: config.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      seat: i,
      stack: p.stack,
      holeCards: [],
      currentBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      isBot: p.isBot,
      botModel: p.botModel,
      sessionId: p.sessionId,
      hasActedThisRound: false,
    })),
    communityCards: [],
    pots: [{ amount: 0, eligible: [] }],
    currentBet: 0,
    minRaise: config.bigBlind,
    dealerSeat: 0,
    activePlayerIndex: -1,
    phase: 'waiting',
    handNumber: 0,
    handId: '', // Set when hand starts
    deck: [],
    deckIndex: 0,
    isActive: true,
    maxPlayers: config.maxPlayers ?? 6,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
  };
}

// ============================================================
// Hand Lifecycle
// ============================================================

export function startHand(state: GameState): void {
  state.handNumber++;
  state.handId = uuid();
  state.phase = 'dealing';
  state.communityCards = [];
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
  state.pots = [{ amount: 0, eligible: [] }];
  state.lastAction = undefined;
  state.winners = undefined;

  // Reset players
  for (const p of state.players) {
    p.holeCards = [];
    p.currentBet = 0;
    p.totalBet = 0;
    p.folded = false;
    p.allIn = false;
    p.hasActedThisRound = false;
  }

  // Shuffle and deal
  state.deck = shuffle(createDeck());
  state.deckIndex = 0;

  // Advance dealer
  if (state.handNumber > 1) {
    state.dealerSeat = nextActiveSeat(state, state.dealerSeat);
  }

  // Deal 2 hole cards to each player
  for (const p of state.players) {
    const { cards, nextIndex } = deal(state.deck, state.deckIndex, 2);
    p.holeCards = cards;
    state.deckIndex = nextIndex;
  }

  // Post blinds
  postBlinds(state);

  // Set active player (left of BB for preflop)
  state.phase = 'preflop';
  const bbSeat = nextActiveSeat(state, smallBlindSeat(state));
  state.activePlayerIndex = nextActiveIndex(state, seatToIndex(state, bbSeat));
}

function postBlinds(state: GameState): void {
  const sbSeat = smallBlindSeat(state);
  const bbSeat = nextActiveSeat(state, sbSeat);

  const sbPlayer = state.players.find((p) => p.seat === sbSeat)!;
  const bbPlayer = state.players.find((p) => p.seat === bbSeat)!;

  placeBet(state, sbPlayer, Math.min(state.smallBlind, sbPlayer.stack));
  placeBet(state, bbPlayer, Math.min(state.bigBlind, bbPlayer.stack));

  state.currentBet = state.bigBlind;
}

function smallBlindSeat(state: GameState): number {
  if (state.players.length === 2) return state.dealerSeat;
  return nextActiveSeat(state, state.dealerSeat);
}

// ============================================================
// Betting
// ============================================================

function placeBet(state: GameState, player: Player, amount: number): void {
  const actual = Math.min(amount, player.stack);
  player.stack -= actual;
  player.currentBet += actual;
  player.totalBet += actual;
  state.pots[0].amount += actual;

  if (player.stack === 0) player.allIn = true;
}

export function getValidActions(state: GameState, playerId: string): ValidAction[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.folded || player.allIn) return [];
  if (state.players[state.activePlayerIndex]?.id !== playerId) return [];

  const actions: ValidAction[] = [{ type: 'fold' }];
  const toCall = state.currentBet - player.currentBet;

  if (toCall === 0) {
    actions.push({ type: 'check' });
  } else {
    if (toCall >= player.stack) {
      actions.push({ type: 'all_in', minAmount: player.stack, maxAmount: player.stack });
    } else {
      actions.push({ type: 'call', minAmount: toCall, maxAmount: toCall });
    }
  }

  // Bet or raise
  const minRaiseTotal = state.currentBet + state.minRaise;
  const minRaiseAmount = minRaiseTotal - player.currentBet;

  if (player.stack > toCall) {
    if (state.currentBet === 0) {
      actions.push({
        type: 'bet',
        minAmount: Math.min(state.bigBlind, player.stack),
        maxAmount: player.stack,
      });
    } else if (player.stack >= minRaiseAmount) {
      actions.push({
        type: 'raise',
        minAmount: Math.min(minRaiseAmount, player.stack),
        maxAmount: player.stack,
      });
    }
    // All-in is always available if they can't min-raise but have chips
    if (player.stack > toCall && player.stack < minRaiseAmount) {
      actions.push({ type: 'all_in', minAmount: player.stack, maxAmount: player.stack });
    }
  }

  return actions;
}

export function executeAction(state: GameState, playerId: string, action: PlayerAction): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;
  if (state.players[state.activePlayerIndex]?.id !== playerId) return false;

  const toCall = state.currentBet - player.currentBet;

  switch (action.type) {
    case 'fold':
      player.folded = true;
      break;

    case 'check':
      if (toCall > 0) return false;
      break;

    case 'call': {
      const callAmount = Math.min(toCall, player.stack);
      placeBet(state, player, callAmount);
      break;
    }

    case 'bet': {
      if (state.currentBet > 0) return false;
      const betAmount = action.amount ?? state.bigBlind;
      if (betAmount < state.bigBlind && betAmount < player.stack) return false;
      placeBet(state, player, Math.min(betAmount, player.stack));
      state.currentBet = player.currentBet;
      state.minRaise = betAmount;
      resetActedFlags(state, player.id);
      break;
    }

    case 'raise': {
      const raiseAmount = action.amount ?? (state.currentBet + state.minRaise - player.currentBet);
      placeBet(state, player, Math.min(raiseAmount, player.stack));
      const raiseSize = player.currentBet - state.currentBet;
      if (raiseSize > 0) state.minRaise = Math.max(state.minRaise, raiseSize);
      state.currentBet = player.currentBet;
      resetActedFlags(state, player.id);
      break;
    }

    case 'all_in': {
      const allInAmount = player.stack;
      placeBet(state, player, allInAmount);
      if (player.currentBet > state.currentBet) {
        const raiseSize = player.currentBet - state.currentBet;
        if (raiseSize >= state.minRaise) state.minRaise = raiseSize;
        state.currentBet = player.currentBet;
        resetActedFlags(state, player.id);
      }
      break;
    }

    default:
      return false;
  }

  player.hasActedThisRound = true;
  state.lastAction = { seat: player.seat, action: action.type, amount: action.amount };

  advanceAction(state);
  return true;
}

function resetActedFlags(state: GameState, exceptPlayerId: string): void {
  for (const p of state.players) {
    if (p.id !== exceptPlayerId && !p.folded && !p.allIn) {
      p.hasActedThisRound = false;
    }
  }
}

function advanceAction(state: GameState): void {
  // Check if hand is over (only 1 non-folded player)
  const nonFolded = state.players.filter((p) => !p.folded);
  if (nonFolded.length <= 1) {
    settleHand(state);
    return;
  }

  // Check if betting round is complete
  const canAct = state.players.filter((p) => !p.folded && !p.allIn);
  const allActed = canAct.every((p) => p.hasActedThisRound);
  const allMatchedBet = canAct.every((p) => p.currentBet === state.currentBet);

  if (canAct.length === 0 || (allActed && allMatchedBet)) {
    advanceStreet(state);
    return;
  }

  // Move to next player
  state.activePlayerIndex = nextActiveIndex(state, state.activePlayerIndex);
}

function advanceStreet(state: GameState): void {
  // Build side pots before moving on
  buildPots(state);

  // Reset street bets
  for (const p of state.players) {
    p.currentBet = 0;
    p.hasActedThisRound = false;
  }
  state.currentBet = 0;
  state.minRaise = state.bigBlind;

  const canAct = state.players.filter((p) => !p.folded && !p.allIn);

  switch (state.phase) {
    case 'preflop':
      state.phase = 'flop';
      dealCommunity(state, 3);
      break;
    case 'flop':
      state.phase = 'turn';
      dealCommunity(state, 1);
      break;
    case 'turn':
      state.phase = 'river';
      dealCommunity(state, 1);
      break;
    case 'river':
      showdown(state);
      return;
    default:
      return;
  }

  // If no one can act (all-in), just keep advancing
  if (canAct.length <= 1) {
    advanceStreet(state);
    return;
  }

  // Set first to act: first active player left of dealer
  const firstSeat = nextActiveSeat(state, state.dealerSeat);
  state.activePlayerIndex = state.players.findIndex((p) => p.seat === firstSeat);
}

function dealCommunity(state: GameState, count: number): void {
  // Burn one card
  state.deckIndex++;
  const { cards, nextIndex } = deal(state.deck, state.deckIndex, count);
  state.communityCards.push(...cards);
  state.deckIndex = nextIndex;
}

// ============================================================
// Pot Building (handles side pots)
// ============================================================

function buildPots(state: GameState): void {
  const activePlayers = state.players.filter((p) => !p.folded);
  if (activePlayers.length === 0) return;

  // Collect all bets into a flat structure
  const contributions = activePlayers
    .map((p) => ({ id: p.id, amount: p.totalBet }))
    .sort((a, b) => a.amount - b.amount);

  const pots: Pot[] = [];
  let prevAmount = 0;

  for (let i = 0; i < contributions.length; i++) {
    const level = contributions[i].amount;
    if (level <= prevAmount) continue;

    const increment = level - prevAmount;
    const eligible = contributions.filter((c) => c.amount >= level).map((c) => c.id);
    // Include players who contributed at least this level
    const potAmount = increment * contributions.filter((c) => c.amount >= level).length;

    // Also add fold contributions at this level
    const foldedContrib = state.players
      .filter((p) => p.folded && p.totalBet > prevAmount)
      .reduce((sum, p) => sum + Math.min(p.totalBet - prevAmount, increment), 0);

    pots.push({ amount: potAmount + foldedContrib, eligible });
    prevAmount = level;
  }

  if (pots.length > 0) {
    state.pots = pots;
  }
}

// ============================================================
// Showdown & Settlement
// ============================================================

function showdown(state: GameState): void {
  state.phase = 'showdown';
  buildPots(state);

  const activePlayers = state.players.filter((p) => !p.folded);
  const results = activePlayers.map((p) => ({
    player: p,
    hand: evaluateHand([...p.holeCards, ...state.communityCards]),
  }));

  const winners: { seat: number; amount: number; handName?: string }[] = [];

  for (const pot of state.pots) {
    const eligible = results.filter((r) => pot.eligible.includes(r.player.id));
    if (eligible.length === 0) continue;

    // Find best hand(s)
    eligible.sort((a, b) => compareHands(b.hand, a.hand));
    const bestHand = eligible[0].hand;
    const potWinners = eligible.filter((r) => compareHands(r.hand, bestHand) === 0);

    const share = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount - share * potWinners.length;

    for (let i = 0; i < potWinners.length; i++) {
      const winAmount = share + (i === 0 ? remainder : 0);
      potWinners[i].player.stack += winAmount;
      const existing = winners.find((w) => w.seat === potWinners[i].player.seat);
      if (existing) {
        existing.amount += winAmount;
      } else {
        winners.push({
          seat: potWinners[i].player.seat,
          amount: winAmount,
          handName: potWinners[i].hand.name,
        });
      }
    }
  }

  state.winners = winners;
}

function settleHand(state: GameState): void {
  state.phase = 'showdown';
  const nonFolded = state.players.filter((p) => !p.folded);

  if (nonFolded.length === 1) {
    const winner = nonFolded[0];
    const totalPot = state.players.reduce((sum, p) => sum + p.totalBet, 0);
    winner.stack += totalPot;
    state.winners = [{ seat: winner.seat, amount: totalPot }];
  } else {
    showdown(state);
  }

  state.pots = [{ amount: 0, eligible: [] }];
}

// ============================================================
// Player View (hides opponent hole cards)
// ============================================================

export function getPlayerView(state: GameState, playerId: string): PlayerGameView {
  const me = state.players.find((p) => p.id === playerId);
  const isShowdown = state.phase === 'showdown';

  const players: PublicPlayerInfo[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    seat: p.seat,
    stack: p.stack,
    currentBet: p.currentBet,
    folded: p.folded,
    allIn: p.allIn,
    isBot: p.isBot,
    botModel: p.botModel,
    hasCards: p.holeCards.length > 0 && !p.folded,
    isActive: state.players[state.activePlayerIndex]?.id === p.id,
    showCards: isShowdown && !p.folded ? p.holeCards : undefined,
  }));

  const showdownHands = isShowdown
    ? state.players
        .filter((p) => !p.folded && p.holeCards.length > 0)
        .map((p) => {
          const allCards = [...p.holeCards, ...state.communityCards];
          return {
            seat: p.seat,
            cards: p.holeCards,
            handName: allCards.length >= 5 ? evaluateHand(allCards).name : 'Winner (opponent folded)',
          };
        })
    : undefined;

  return {
    id: state.id,
    gameId: state.gameId,
    handId: state.handId,
    phase: state.phase,
    players,
    communityCards: state.communityCards,
    pots: state.pots,
    currentBet: state.currentBet,
    dealerSeat: state.dealerSeat,
    activePlayerSeat: state.players[state.activePlayerIndex]?.seat ?? null,
    myCards: me?.holeCards ?? [],
    mySeat: me?.seat ?? -1,
    myStack: me?.stack ?? 0,
    validActions: me ? getValidActions(state, playerId) : [],
    maxPlayers: state.maxPlayers,
    handNumber: state.handNumber,
    smallBlind: state.smallBlind,
    bigBlind: state.bigBlind,
    lastAction: state.lastAction,
    winners: state.winners,
    showdownHands,
  };
}

// ============================================================
// Seat Navigation Helpers
// ============================================================

function nextActiveSeat(state: GameState, currentSeat: number): number {
  const seats = state.players.filter((p) => !p.folded).map((p) => p.seat).sort((a, b) => a - b);
  if (seats.length === 0) return currentSeat;

  for (const seat of seats) {
    if (seat > currentSeat) return seat;
  }
  return seats[0]; // Wrap around
}

function nextActiveIndex(state: GameState, currentIndex: number): number {
  const len = state.players.length;
  for (let i = 1; i <= len; i++) {
    const idx = (currentIndex + i) % len;
    const p = state.players[idx];
    if (!p.folded && !p.allIn) return idx;
  }
  return currentIndex;
}

function seatToIndex(state: GameState, seat: number): number {
  return state.players.findIndex((p) => p.seat === seat);
}

// ============================================================
// Query Helpers
// ============================================================

export function isHandComplete(state: GameState): boolean {
  return state.phase === 'showdown';
}

export function getActivePlayerId(state: GameState): string | null {
  return state.players[state.activePlayerIndex]?.id ?? null;
}

export function canStartHand(state: GameState): boolean {
  const playersWithChips = state.players.filter((p) => p.stack > 0);
  return playersWithChips.length >= 2;
}
