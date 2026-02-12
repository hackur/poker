// ============================================================
// Game Manager V2 — Uses BotPlayer entities and Worker Pool
//
// This is the new game manager that integrates:
// - BotPlayer library for bot configurations
// - Worker pool for concurrent execution
// - Single-model mode for memory efficiency
// ============================================================

import {
  createGame, startHand, getPlayerView, getValidActions,
  executeAction, getActivePlayerId, canStartHand,
  type GameState, type PlayerGameView, type PlayerAction, type GameConfig,
} from './poker';
import { addHandRecord, type HandRecord, type HandAction } from './hand-history';
import { updateStatsFromHand } from './player-stats';
import { getSettings } from './game-config';
import { initModelSession, startKeepalive, getActiveModelId } from './model-session';
import { 
  getActiveBotPlayers, 
  getBotPlayerById, 
  getRandomBots,
  type BotPlayer 
} from './bot-player';
import {
  createWorker,
  getOrCreateWorker,
  requestDecision,
  getPoolStats,
  type BotWorker,
} from './bot-worker-pool';
import { uuid } from './uuid';

// ============================================================
// Types
// ============================================================

interface GameInstance {
  state: GameState;
  workers: Map<string, BotWorker>; // playerId → worker
  lastTickTime: number;
  showdownUntil: number;
  handStartStacks: Map<string, number>;
  handActions: HandAction[];
  lastRecordedHand: number;
}

// ============================================================
// Game Manager V2
// ============================================================

class GameManagerV2 {
  private games = new Map<string, GameInstance>();
  private healthChecked = false;

  // ============================================================
  // Game Creation
  // ============================================================

  /**
   * Create a new game with BotPlayers from the library
   */
  createGame(opts: {
    gameSlug: string;
    humanPlayerId: string;
    humanName?: string;
    botSlugs?: string[];      // Specific bots to use
    botCount?: number;         // Or random bots
    smallBlind?: number;
    bigBlind?: number;
    startingStack?: number;
  }): GameState {
    const {
      gameSlug,
      humanPlayerId,
      humanName = 'You',
      botSlugs,
      botCount = 5,
      smallBlind = 5,
      bigBlind = 10,
      startingStack = 1000,
    } = opts;

    // Check if game exists
    if (this.games.has(gameSlug)) {
      return this.games.get(gameSlug)!.state;
    }

    // Ensure model is ready
    this.ensureModelReady();

    // Select bots
    let bots: BotPlayer[];
    if (botSlugs && botSlugs.length > 0) {
      bots = botSlugs
        .map(slug => getActiveBotPlayers().find(b => b.slug === slug))
        .filter((b): b is BotPlayer => b !== undefined);
    } else {
      bots = getRandomBots(botCount);
    }

    if (bots.length === 0) {
      throw new Error('No bots available');
    }

    // Build player list
    const players: GameConfig['players'] = [
      { 
        id: humanPlayerId, 
        name: humanName, 
        stack: startingStack, 
        isBot: false 
      },
    ];

    // Create workers for each bot
    const workers = new Map<string, BotWorker>();
    
    for (let i = 0; i < bots.length; i++) {
      const bot = bots[i];
      const playerId = `bot-${i}`;
      
      const worker = createWorker(bot.id);
      workers.set(playerId, worker);
      
      players.push({
        id: playerId,
        name: bot.displayName,
        stack: startingStack,
        isBot: true,
        botModel: bot.displayName,
        sessionId: worker.sessionId,
      });
    }

    // Create game state
    const state = createGame({
      id: gameSlug,
      smallBlind,
      bigBlind,
      players,
    });

    // Store game instance
    const instance: GameInstance = {
      state,
      workers,
      lastTickTime: Date.now(),
      showdownUntil: 0,
      handStartStacks: new Map(),
      handActions: [],
      lastRecordedHand: 0,
    };

    this.games.set(gameSlug, instance);
    console.log(`[GameManagerV2] Created game ${gameSlug} with ${bots.length} bots`);

    return state;
  }

  /**
   * Get or create a game with default settings
   */
  getOrCreate(gameSlug: string, humanPlayerId: string): GameState {
    const existing = this.games.get(gameSlug);
    if (existing) return existing.state;

    return this.createGame({
      gameSlug,
      humanPlayerId,
      botCount: gameSlug.includes('heads-up') ? 1 : 5,
    });
  }

  // ============================================================
  // Game Access
  // ============================================================

  /**
   * Get game view (also advances game state)
   */
  getView(gameSlug: string, playerId: string): PlayerGameView | null {
    const instance = this.games.get(gameSlug);
    if (!instance) return null;

    this.tick(instance);
    return getPlayerView(instance.state, playerId);
  }

  /**
   * Submit a player action
   */
  submitAction(gameSlug: string, playerId: string, action: PlayerAction): boolean {
    const instance = this.games.get(gameSlug);
    if (!instance) return false;

    const state = instance.state;
    const activeId = getActivePlayerId(state);
    if (activeId !== playerId) return false;

    const player = state.players.find(p => p.id === playerId);
    const street = state.phase;
    const success = executeAction(state, playerId, action);

    if (success) {
      instance.lastTickTime = Date.now();
      this.trackAction(instance, player?.seat ?? -1, player?.name ?? playerId, street, action);
    }

    return success;
  }

  /**
   * List all games
   */
  listGames(): { id: string; playerCount: number; handNumber: number; phase: string }[] {
    return Array.from(this.games.entries()).map(([id, inst]) => ({
      id,
      playerCount: inst.state.players.length,
      handNumber: inst.state.handNumber,
      phase: inst.state.phase,
    }));
  }

  /**
   * Reset a game
   */
  resetGame(gameSlug: string, humanPlayerId: string): void {
    const instance = this.games.get(gameSlug);
    
    // Clean up workers
    if (instance) {
      for (const [playerId, worker] of instance.workers) {
        // Workers are managed by the pool, just remove reference
        instance.workers.delete(playerId);
      }
    }

    this.games.delete(gameSlug);
    
    // Recreate
    this.getOrCreate(gameSlug, humanPlayerId);
  }

  // ============================================================
  // Tick Loop
  // ============================================================

  private async tick(instance: GameInstance): Promise<void> {
    const now = Date.now();
    const state = instance.state;
    const settings = getSettings();

    // Showdown hold
    if (now < instance.showdownUntil) return;

    // Start new hand if needed
    if (state.phase === 'showdown' || state.phase === 'waiting') {
      if (state.phase === 'showdown' && instance.lastRecordedHand < state.handNumber) {
        this.recordHand(instance);
        instance.lastRecordedHand = state.handNumber;
      }

      if (state.phase === 'showdown' && instance.showdownUntil === 0) {
        instance.showdownUntil = now + settings.showdownHoldMs;
        instance.lastTickTime = now;
        return;
      }

      // Rebuy busted players
      for (const p of state.players) {
        if (p.stack <= 0) p.stack = settings.rebuyStack;
      }

      if (canStartHand(state)) {
        // Capture starting stacks
        instance.handStartStacks.clear();
        for (const p of state.players) {
          instance.handStartStacks.set(p.id, p.stack);
        }
        instance.handActions = [];

        startHand(state);
        instance.lastTickTime = now;
        instance.showdownUntil = 0;
      }
      return;
    }

    // Check for bot turn
    const activeId = getActivePlayerId(state);
    if (!activeId) return;

    const player = state.players.find(p => p.id === activeId);
    if (!player?.isBot) return;

    // Get worker for this bot
    const worker = instance.workers.get(activeId);
    if (!worker) {
      // No worker — use fallback
      this.executeRuleBasedAction(instance, activeId, player);
      return;
    }

    // Check think time
    const elapsed = now - instance.lastTickTime;
    const bot = getBotPlayerById(worker.botPlayerId);
    const [minThink, maxThink] = bot?.personality.thinkTimeMs ?? [1000, 2500];
    const thinkTime = minThink + Math.random() * (maxThink - minThink);

    if (elapsed < thinkTime) return;

    // Request decision from worker
    try {
      const validActions = getValidActions(state, activeId);
      const gameContext = this.buildGameContext(state, activeId, validActions);

      const result = await requestDecision({
        workerId: worker.workerId,
        gameContext,
        validActions,
      });

      const success = executeAction(state, activeId, result.action as PlayerAction);
      if (success) {
        this.trackAction(instance, player.seat, player.name, state.phase, result.action as PlayerAction);
      } else {
        // Action invalid — fold
        executeAction(state, activeId, { type: 'fold' });
        this.trackAction(instance, player.seat, player.name, state.phase, { type: 'fold' });
      }

      instance.lastTickTime = Date.now();
    } catch (err) {
      console.error(`[GameManagerV2] Worker decision failed:`, err);
      this.executeRuleBasedAction(instance, activeId, player);
    }
  }

  private executeRuleBasedAction(
    instance: GameInstance, 
    playerId: string,
    player: { seat: number; name: string }
  ): void {
    const state = instance.state;
    const validActions = getValidActions(state, playerId);
    
    // Simple rule: check if free, otherwise fold
    let action: PlayerAction;
    if (validActions.some(a => a.type === 'check')) {
      action = { type: 'check' };
    } else {
      action = { type: 'fold' };
    }

    executeAction(state, playerId, action);
    this.trackAction(instance, player.seat, player.name, state.phase, action);
    instance.lastTickTime = Date.now();
  }

  // ============================================================
  // Context Building
  // ============================================================

  private buildGameContext(
    state: GameState,
    playerId: string,
    validActions: { type: string; minAmount?: number; maxAmount?: number }[]
  ) {
    const player = state.players.find(p => p.id === playerId)!;
    const dealerIdx = state.players.findIndex(p => p.seat === state.dealerSeat);
    const myIdx = state.players.findIndex(p => p.id === playerId);

    let position = 'middle';
    const relPos = (myIdx - dealerIdx + state.players.length) % state.players.length;
    if (relPos === 0) position = 'dealer (BTN)';
    else if (relPos === 1) position = 'small blind (SB)';
    else if (relPos === 2) position = 'big blind (BB)';
    else if (relPos <= 3) position = 'early position (EP)';
    else if (relPos >= state.players.length - 2) position = 'late position (LP)';

    return {
      holeCards: player.holeCards,
      communityCards: state.communityCards,
      pot: state.pots.reduce((s, p) => s + p.amount, 0),
      currentBet: state.currentBet,
      myBet: player.currentBet,
      myStack: player.stack,
      phase: state.phase,
      position,
      players: state.players.map(p => ({
        name: p.name,
        stack: p.stack,
        bet: p.currentBet,
        folded: p.folded,
        allIn: p.allIn,
        isBot: p.isBot,
      })),
      validActions,
      handNumber: state.handNumber,
      blinds: { small: state.smallBlind, big: state.bigBlind },
    };
  }

  // ============================================================
  // History Tracking
  // ============================================================

  private trackAction(
    instance: GameInstance,
    seat: number,
    name: string,
    street: string,
    action: PlayerAction
  ): void {
    instance.handActions.push({
      seat,
      name,
      street,
      action: action.type,
      amount: action.amount,
      timestamp: Date.now(),
    });
  }

  private recordHand(instance: GameInstance): void {
    const state = instance.state;

    const record: HandRecord = {
      gameId: state.id,
      gameUuid: state.gameId,
      handUuid: state.handId,
      handNumber: state.handNumber,
      timestamp: Date.now(),
      blinds: { small: state.smallBlind, big: state.bigBlind },
      players: state.players.map(p => ({
        seat: p.seat,
        name: p.name,
        isBot: p.isBot,
        botModel: p.botModel,
        startStack: instance.handStartStacks.get(p.id) ?? p.stack,
        endStack: p.stack,
        holeCards: p.holeCards.length > 0 ? p.holeCards : undefined,
        isDealer: p.seat === state.dealerSeat,
      })),
      actions: instance.handActions,
      communityCards: state.communityCards,
      winners: (state.winners ?? []).map(w => {
        const p = state.players.find(pl => pl.seat === w.seat);
        return { seat: w.seat, name: p?.name ?? '?', amount: w.amount, handName: w.handName };
      }),
      pot: state.pots.reduce((s, p) => s + p.amount, 0) || 
           (state.winners ?? []).reduce((s, w) => s + w.amount, 0),
    };

    addHandRecord(record);

    // Update player statistics
    updateStatsFromHand({
      gameId: record.gameId,
      handNumber: record.handNumber,
      timestamp: record.timestamp,
      pot: record.pot,
      dealerSeat: state.dealerSeat,
      players: state.players.map(p => ({
        seat: p.seat,
        name: p.name,
        id: p.id,
        isBot: p.isBot,
        startStack: instance.handStartStacks.get(p.id) ?? p.stack,
        endStack: p.stack,
        isDealer: p.seat === state.dealerSeat,
      })),
      winners: record.winners,
    });

    console.log(`[GameManagerV2] Recorded hand #${record.handNumber}`);
  }

  // ============================================================
  // Health Check
  // ============================================================

  private async ensureModelReady(): Promise<void> {
    if (this.healthChecked) return;
    this.healthChecked = true;

    const activeModel = await initModelSession();
    if (activeModel) {
      console.log(`[GameManagerV2] Active model: ${activeModel}`);
      startKeepalive();
    } else {
      console.warn('[GameManagerV2] No model detected — bots will use fallback');
    }
  }

  /**
   * Get pool stats
   */
  getStats() {
    return getPoolStats();
  }
}

// ============================================================
// Singleton (globalThis for HMR)
// ============================================================

const MANAGER_KEY = '__gameManagerV2__';

export function getGameManagerV2(): GameManagerV2 {
  const g = globalThis as Record<string, unknown>;
  if (!g[MANAGER_KEY]) {
    g[MANAGER_KEY] = new GameManagerV2();
  }
  return g[MANAGER_KEY] as GameManagerV2;
}

export const gameManagerV2 = getGameManagerV2();
