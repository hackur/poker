import {
  createGame, startHand, getPlayerView, getValidActions,
  executeAction, isHandComplete, getActivePlayerId, canStartHand,
  type GameState, type PlayerGameView, type PlayerAction, type GameConfig,
} from './poker';
import { computeBotAction, BOT_PROFILES } from './poker/bot';

// ============================================================
// Game Manager — Tick-based: game advances on each poll request
// No background loops, no timers. Just pure state transitions.
// ============================================================

class GameManager {
  private games = new Map<string, GameState>();
  private botProfiles = new Map<string, (typeof BOT_PROFILES)[0]>();
  private pendingHumanAction: PlayerAction | null = null;
  private lastTickTime = new Map<string, number>();
  private showdownUntil = new Map<string, number>(); // Hold showdown display

  /** Create or get a demo game */
  getOrCreateDemo(humanPlayerId: string): GameState {
    const existing = this.games.get('demo');
    if (existing) return existing;

    const players: GameConfig['players'] = [
      { id: humanPlayerId, name: 'You', stack: 1000, isBot: false },
    ];

    for (let i = 0; i < 5; i++) {
      const profile = BOT_PROFILES[i];
      const botId = `bot-${i}`;
      players.push({
        id: botId,
        name: profile.name,
        stack: 1000,
        isBot: true,
        botModel: profile.model,
      });
      this.botProfiles.set(botId, profile);
    }

    const state = createGame({ id: 'demo', smallBlind: 5, bigBlind: 10, players });
    this.games.set('demo', state);
    return state;
  }

  /** Get view — also ticks the game forward */
  getView(gameId: string, playerId: string): PlayerGameView | null {
    const state = this.games.get(gameId);
    if (!state) return null;

    this.tick(gameId, state);
    return getPlayerView(state, playerId);
  }

  /** Submit a human action */
  submitAction(gameId: string, playerId: string, action: PlayerAction): boolean {
    const state = this.games.get(gameId);
    if (!state) return false;

    const activeId = getActivePlayerId(state);
    if (activeId !== playerId) return false;

    const success = executeAction(state, playerId, action);
    if (success) {
      this.lastTickTime.set(gameId, Date.now());
    }
    return success;
  }

  /** Reset the game — fresh stacks, hand 0 */
  resetGame(gameId: string, humanPlayerId: string): void {
    this.games.delete(gameId);
    this.lastTickTime.delete(gameId);
    this.showdownUntil.delete(gameId);
    this.getOrCreateDemo(humanPlayerId);
  }

  /** Update a bot's model or play style */
  updateBot(gameId: string, botId: string, field: string, value: string | number): void {
    const state = this.games.get(gameId);
    if (!state) return;

    const player = state.players.find((p) => p.id === botId);
    if (!player || !player.isBot) return;

    if (field === 'model') {
      player.botModel = String(value);
      // Update the profile aggression/tightness based on model
      const profile = this.botProfiles.get(botId);
      if (profile) {
        profile.model = String(value);
        // Adjust play style heuristics per model
        const styleMap: Record<string, Partial<typeof profile>> = {
          'Claude Sonnet 4': { aggression: 0.6, tightness: 0.7, bluffFreq: 0.15 },
          'Claude Haiku': { aggression: 0.5, tightness: 0.5, bluffFreq: 0.1 },
          'GPT-4o': { aggression: 0.8, tightness: 0.4, bluffFreq: 0.25 },
          'GPT-4o-mini': { aggression: 0.6, tightness: 0.5, bluffFreq: 0.2 },
          'Gemini 2.5 Flash': { aggression: 0.3, tightness: 0.8, bluffFreq: 0.05 },
          'Gemini 2.5 Pro': { aggression: 0.5, tightness: 0.7, bluffFreq: 0.1 },
          'Llama 3.3 70B': { aggression: 0.5, tightness: 0.3, bluffFreq: 0.1 },
          'Llama 3.3 8B': { aggression: 0.4, tightness: 0.2, bluffFreq: 0.15 },
          'Mistral Large': { aggression: 0.65, tightness: 0.6, bluffFreq: 0.18 },
          'Random Bot': { aggression: 0.5, tightness: 0.1, bluffFreq: 0.5 },
        };
        Object.assign(profile, styleMap[String(value)] ?? {});
      }
    } else if (field === 'playStyle') {
      const profile = this.botProfiles.get(botId);
      if (profile) {
        const styleParams: Record<string, { aggression: number; tightness: number }> = {
          tight: { aggression: 0.3, tightness: 0.9 },
          loose: { aggression: 0.5, tightness: 0.2 },
          aggressive: { aggression: 0.9, tightness: 0.5 },
          passive: { aggression: 0.2, tightness: 0.5 },
          balanced: { aggression: 0.5, tightness: 0.5 },
        };
        Object.assign(profile, styleParams[String(value)] ?? {});
      }
    }
  }

  // ============================================================
  // Tick — advance game state one step at a time
  // Called on every poll. Uses time-gating to simulate bot think time.
  // ============================================================

  private tick(gameId: string, state: GameState): void {
    const now = Date.now();
    const lastTick = this.lastTickTime.get(gameId) ?? 0;
    const elapsed = now - lastTick;

    // If showing showdown results, wait before starting next hand
    const showdownEnd = this.showdownUntil.get(gameId) ?? 0;
    if (now < showdownEnd) return;

    // If hand is complete, start a new one
    if (state.phase === 'showdown' || state.phase === 'waiting') {
      if (state.phase === 'showdown' && showdownEnd === 0) {
        // Just entered showdown — set display timer
        this.showdownUntil.set(gameId, now + 3000);
        this.lastTickTime.set(gameId, now);
        return;
      }

      // Rebuy busted players
      for (const p of state.players) {
        if (p.stack <= 0) p.stack = 1000;
      }

      if (canStartHand(state)) {
        startHand(state);
        this.lastTickTime.set(gameId, now);
        this.showdownUntil.set(gameId, 0);
      }
      return;
    }

    // If it's a bot's turn and enough time has passed (simulated thinking)
    const activeId = getActivePlayerId(state);
    if (!activeId) return;

    const player = state.players.find((p) => p.id === activeId);
    if (!player) return;

    if (player.isBot) {
      // Bot think time: 1-2.5 seconds
      const thinkTime = 1000 + Math.random() * 1500;
      if (elapsed < thinkTime) return; // Still "thinking"

      const profile = this.botProfiles.get(player.id) ?? BOT_PROFILES[0];
      const valid = getValidActions(state, player.id);
      const action = computeBotAction(state, player.id, profile, valid);

      const success = executeAction(state, activeId, action);
      if (!success) {
        executeAction(state, activeId, { type: 'fold' });
      }
      this.lastTickTime.set(gameId, now);
    }
    // If it's a human's turn, do nothing — wait for submitAction()
  }
}

// Singleton that survives Next.js hot reloads
const globalForGM = globalThis as unknown as { __pokerGameManager?: GameManager };
export const gameManager = globalForGM.__pokerGameManager ?? new GameManager();
globalForGM.__pokerGameManager = gameManager;
