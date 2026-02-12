/**
 * KV-Backed Game Manager
 * 
 * Persists game state to Cloudflare KV for edge runtime compatibility.
 * Falls back to in-memory storage for local development.
 * 
 * Key insight: Edge workers don't share memory between requests,
 * so we load state from KV at request start and save at request end.
 */

import {
  createGame,
  startHand,
  getPlayerView,
  getValidActions,
  executeAction,
  getActivePlayerId,
  canStartHand,
  type GameState,
  type PlayerGameView,
  type PlayerAction,
  type GameConfig,
} from './poker';
import { getGameStateKV, type KVNamespace } from './cf-context';

// ============================================================
// Types
// ============================================================

interface GameInstance {
  state: GameState;
  lastTickTime: number;
  showdownUntil: number;
}

// TTL for game state in KV (24 hours)
const GAME_STATE_TTL = 60 * 60 * 24;

// Settings
const SHOWDOWN_HOLD_MS = 3000;
const BOT_THINK_MIN_MS = 800;
const BOT_THINK_MAX_MS = 1500;
const REBUY_STACK = 1000;

// ============================================================
// In-Memory Fallback (Local Dev)
// ============================================================

const memoryStore = new Map<string, GameInstance>();

// ============================================================
// KV Game Manager
// ============================================================

export class KVGameManager {
  private kv: KVNamespace | null = null;

  constructor() {
    // KV will be initialized per-request
  }

  /**
   * Initialize KV for this request
   */
  private initKV(): void {
    if (!this.kv) {
      this.kv = getGameStateKV();
    }
  }

  /**
   * Load game instance from KV or memory
   */
  private async loadGame(gameId: string): Promise<GameInstance | null> {
    this.initKV();

    // Try memory first (for same-request caching)
    if (memoryStore.has(gameId)) {
      return memoryStore.get(gameId)!;
    }

    // Try KV if available
    if (this.kv) {
      try {
        const data = await this.kv.get(`game:${gameId}`, { type: 'json' });
        if (data) {
          const instance = data as unknown as GameInstance;
          memoryStore.set(gameId, instance); // Cache in memory
          return instance;
        }
      } catch (err) {
        console.error(`[KVGameManager] Failed to load ${gameId}:`, err);
      }
    }

    return null;
  }

  /**
   * Save game instance to KV and memory
   */
  private async saveGame(gameId: string, instance: GameInstance): Promise<void> {
    this.initKV();

    // Always update memory cache
    memoryStore.set(gameId, instance);

    // Save to KV if available
    if (this.kv) {
      try {
        await this.kv.put(
          `game:${gameId}`,
          JSON.stringify(instance),
          { expirationTtl: GAME_STATE_TTL }
        );
      } catch (err) {
        console.error(`[KVGameManager] Failed to save ${gameId}:`, err);
      }
    }
  }

  /**
   * Create a new demo game
   */
  async createDemo(humanPlayerId: string): Promise<GameState> {
    const gameId = 'demo';

    // Check if exists
    const existing = await this.loadGame(gameId);
    if (existing) return existing.state;

    // Create players
    const players: GameConfig['players'] = [
      { id: humanPlayerId, name: 'You', stack: 1000, isBot: false },
    ];

    // Add 5 bots with diverse names
    const botNames = ['Alex 🤖', 'Morgan 🤖', 'Jordan 🤖', 'Casey 🤖', 'Riley 🤖'];
    for (let i = 0; i < 5; i++) {
      players.push({
        id: `bot-${i}`,
        name: botNames[i],
        stack: 1000,
        isBot: true,
        botModel: 'Rule-Based',
      });
    }

    const state = createGame({
      id: gameId,
      smallBlind: 5,
      bigBlind: 10,
      players,
    });

    const instance: GameInstance = {
      state,
      lastTickTime: Date.now(),
      showdownUntil: 0,
    };

    await this.saveGame(gameId, instance);
    console.log(`[KVGameManager] Created demo game`);

    return state;
  }

  /**
   * Create a heads-up game against a specific bot
   */
  async createHeadsUp(humanPlayerId: string, botId?: string): Promise<GameState> {
    const gameId = `heads-up-${botId ?? 'default'}`;

    const existing = await this.loadGame(gameId);
    if (existing) return existing.state;

    const players: GameConfig['players'] = [
      { id: humanPlayerId, name: 'You', stack: 1000, isBot: false },
      { id: 'bot-0', name: 'Opponent 🤖', stack: 1000, isBot: true, botModel: 'Rule-Based' },
    ];

    const state = createGame({
      id: gameId,
      smallBlind: 5,
      bigBlind: 10,
      players,
    });

    const instance: GameInstance = {
      state,
      lastTickTime: Date.now(),
      showdownUntil: 0,
    };

    await this.saveGame(gameId, instance);
    return state;
  }

  /**
   * Get or create a game
   */
  async getOrCreate(gameId: string, humanPlayerId: string): Promise<GameState> {
    const existing = await this.loadGame(gameId);
    if (existing) return existing.state;

    if (gameId.startsWith('heads-up-')) {
      return this.createHeadsUp(humanPlayerId, gameId.replace('heads-up-', ''));
    }

    return this.createDemo(humanPlayerId);
  }

  /**
   * Get player view (and tick the game forward)
   */
  async getView(gameId: string, playerId: string): Promise<PlayerGameView | null> {
    const instance = await this.loadGame(gameId);
    if (!instance) return null;

    // Tick the game (advance state, process bot actions)
    await this.tick(gameId, instance);

    return getPlayerView(instance.state, playerId);
  }

  /**
   * Submit a player action
   */
  async submitAction(gameId: string, playerId: string, action: PlayerAction): Promise<boolean> {
    const instance = await this.loadGame(gameId);
    if (!instance) return false;

    const state = instance.state;
    const activeId = getActivePlayerId(state);
    if (activeId !== playerId) return false;

    const success = executeAction(state, playerId, action);
    if (success) {
      instance.lastTickTime = Date.now();
      await this.saveGame(gameId, instance);
    }

    return success;
  }

  /**
   * Reset a game
   */
  async resetGame(gameId: string, humanPlayerId: string): Promise<void> {
    this.initKV();

    // Delete from memory
    memoryStore.delete(gameId);

    // Delete from KV
    if (this.kv) {
      try {
        await this.kv.delete(`game:${gameId}`);
      } catch (err) {
        console.error(`[KVGameManager] Failed to delete ${gameId}:`, err);
      }
    }

    // Recreate
    await this.getOrCreate(gameId, humanPlayerId);
  }

  /**
   * Game tick - advance state, handle bots, manage phases
   */
  private async tick(gameId: string, instance: GameInstance): Promise<void> {
    const now = Date.now();
    const state = instance.state;

    // Showdown hold
    if (now < instance.showdownUntil) return;

    // Start new hand if needed
    if (state.phase === 'showdown' || state.phase === 'waiting') {
      if (state.phase === 'showdown' && instance.showdownUntil === 0) {
        instance.showdownUntil = now + SHOWDOWN_HOLD_MS;
        instance.lastTickTime = now;
        await this.saveGame(gameId, instance);
        return;
      }

      // Rebuy busted players
      for (const p of state.players) {
        if (p.stack <= 0) p.stack = REBUY_STACK;
      }

      if (canStartHand(state)) {
        startHand(state);
        instance.lastTickTime = now;
        instance.showdownUntil = 0;
        await this.saveGame(gameId, instance);
      }
      return;
    }

    // Check for bot turn
    const activeId = getActivePlayerId(state);
    if (!activeId) return;

    const player = state.players.find(p => p.id === activeId);
    if (!player?.isBot) return;

    // Bot think time
    const elapsed = now - instance.lastTickTime;
    const thinkTime = BOT_THINK_MIN_MS + Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS);

    if (elapsed < thinkTime) return;

    // Execute bot action (rule-based)
    const action = this.computeBotAction(state, activeId);
    executeAction(state, activeId, action);
    instance.lastTickTime = Date.now();

    await this.saveGame(gameId, instance);
  }

  /**
   * Compute bot action using simple rules
   * (AI integration can be added later)
   */
  private computeBotAction(state: GameState, playerId: string): PlayerAction {
    const validActions = getValidActions(state, playerId);
    const player = state.players.find(p => p.id === playerId);
    if (!player) return { type: 'fold' };

    // Simple strategy:
    // - Always check if free
    // - Call small bets (< 20% of stack)
    // - Fold to large bets
    // - Occasionally raise with good position

    const checkAction = validActions.find(a => a.type === 'check');
    if (checkAction) return { type: 'check' };

    const callAction = validActions.find(a => a.type === 'call');
    if (callAction) {
      const toCall = state.currentBet - player.currentBet;
      const callRatio = toCall / player.stack;

      // Call if bet is small relative to stack
      if (callRatio < 0.2) {
        return { type: 'call' };
      }

      // 30% chance to call medium bets
      if (callRatio < 0.4 && Math.random() < 0.3) {
        return { type: 'call' };
      }

      // Fold to large bets most of the time
      return { type: 'fold' };
    }

    // If no check or call, fold
    return { type: 'fold' };
  }

  /**
   * List all games
   */
  async listGames(): Promise<{ id: string; playerCount: number; handNumber: number; phase: string }[]> {
    this.initKV();

    const games: { id: string; playerCount: number; handNumber: number; phase: string }[] = [];

    // From memory
    for (const [id, inst] of memoryStore) {
      games.push({
        id,
        playerCount: inst.state.players.length,
        handNumber: inst.state.handNumber,
        phase: inst.state.phase,
      });
    }

    // From KV (if available and memory is empty)
    if (this.kv && games.length === 0) {
      try {
        const result = await this.kv.list({ prefix: 'game:' });
        for (const key of result.keys) {
          const gameId = key.name.replace('game:', '');
          if (!memoryStore.has(gameId)) {
            const data = await this.kv.get(key.name, { type: 'json' });
            if (data) {
              const inst = data as unknown as GameInstance;
              games.push({
                id: gameId,
                playerCount: inst.state.players.length,
                handNumber: inst.state.handNumber,
                phase: inst.state.phase,
              });
            }
          }
        }
      } catch (err) {
        console.error('[KVGameManager] Failed to list games:', err);
      }
    }

    return games;
  }
}

// ============================================================
// Singleton Export
// ============================================================

// Create a new instance per request (for KV context)
export function getKVGameManager(): KVGameManager {
  return new KVGameManager();
}
