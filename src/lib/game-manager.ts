import {
  createGame, startHand, getPlayerView, getValidActions,
  executeAction, isHandComplete, getActivePlayerId, canStartHand,
  type GameState, type PlayerGameView, type PlayerAction, type GameConfig,
} from './poker';
import { computeBotAction, computeBotActionAsync, BOT_PROFILES, type BotProfile } from './poker/bot';
import { DEFAULT_DRIVERS, checkProviderHealth, type BotDriver } from './poker/bot-drivers';
import { getDrivers } from './driver-store';
import { addHandRecord, type HandRecord, type HandAction } from './hand-history';
import { getSettings } from './game-config';

// ============================================================
// Game Manager — Tick-based with async AI driver support
// ============================================================

class GameManager {
  private games = new Map<string, GameState>();
  private botProfiles = new Map<string, BotProfile>();
  private pendingBotAction = new Map<string, Promise<PlayerAction>>(); // gameId:playerId → pending AI call
  private resolvedBotActions = new Map<string, PlayerAction>(); // gameId:playerId → ready action
  private lastTickTime = new Map<string, number>();
  private showdownUntil = new Map<string, number>();
  private healthChecked = false;
  /** Track starting stacks for hand history */
  private handStartStacks = new Map<string, Map<string, number>>(); // gameId → playerId → stack
  /** Track actions for hand history */
  private handActions = new Map<string, HandAction[]>(); // gameId → actions
  /** Track which hand number was last recorded */
  private lastRecordedHand = new Map<string, number>();
  // Hand history stored via globalThis in hand-history.ts

  /** Create or get a demo game */
  getOrCreateDemo(humanPlayerId: string): GameState {
    const existing = this.games.get('demo');
    if (existing) return existing;

    const drivers = getDrivers();
    const players: GameConfig['players'] = [
      { id: humanPlayerId, name: 'You', stack: 1000, isBot: false },
    ];

    for (let i = 0; i < 5; i++) {
      const defaultProfile = BOT_PROFILES[i];
      const botId = `bot-${i}`;

      // Try to match a driver to this bot
      const driver = drivers[i] ?? undefined;

      const profile: BotProfile = {
        ...defaultProfile,
        driver: driver?.enabled ? driver : undefined,
      };

      players.push({
        id: botId,
        name: driver?.displayName ?? defaultProfile.name,
        stack: 1000,
        isBot: true,
        botModel: driver?.displayName ?? defaultProfile.model,
      });

      this.botProfiles.set(botId, profile);
    }

    const state = createGame({ id: 'demo', smallBlind: 5, bigBlind: 10, players });
    this.games.set('demo', state);

    // Check driver health in background (fire and forget, won't block)
    if (!this.healthChecked) {
      this.healthChecked = true;
      this.checkAllDriverHealth();
    }

    return state;
  }

  /** Create or get a heads-up game against a specific driver */
  getOrCreateHeadsUp(humanPlayerId: string, driverId?: string): GameState {
    const gameId = `heads-up-${driverId ?? 'default'}`;
    const existing = this.games.get(gameId);
    if (existing) return existing;

    const drivers = getDrivers();
    const driver = driverId
      ? drivers.find((d) => d.id === driverId)
      : drivers.find((d) => d.enabled && d.provider === 'lmstudio') ?? drivers[0];

    const botId = 'bot-hu';
    const profile: BotProfile = {
      name: driver?.displayName ?? 'Bot',
      model: driver?.modelId ?? 'rule-based',
      aggression: driver?.personality.aggression ?? 0.6,
      tightness: driver?.personality.tightness ?? 0.6,
      bluffFreq: driver?.personality.bluffFreq ?? 0.15,
      driver: driver?.enabled ? driver : undefined,
    };
    this.botProfiles.set(botId, profile);

    const players: GameConfig['players'] = [
      { id: humanPlayerId, name: 'You', stack: 1000, isBot: false },
      { id: botId, name: driver?.displayName ?? 'Bot', stack: 1000, isBot: true, botModel: driver?.displayName ?? 'Rule-based' },
    ];

    const state = createGame({ id: gameId, smallBlind: 5, bigBlind: 10, players });
    this.games.set(gameId, state);

    if (!this.healthChecked) {
      this.healthChecked = true;
      this.checkAllDriverHealth();
    }

    return state;
  }

  /** List all active games */
  listGames(): { id: string; playerCount: number; handNumber: number; phase: string }[] {
    return Array.from(this.games.entries()).map(([id, state]) => ({
      id,
      playerCount: state.players.length,
      handNumber: state.handNumber,
      phase: state.phase,
    }));
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
    const player = state.players.find((p) => p.id === playerId);
    const street = state.phase;
    const success = executeAction(state, playerId, action);
    if (success) {
      this.lastTickTime.set(gameId, Date.now());
      this.trackAction(gameId, player?.seat ?? -1, player?.name ?? playerId, street, action);
    }
    return success;
  }

  /** Track an action for hand history */
  private trackAction(gameId: string, seat: number, name: string, street: string, action: PlayerAction): void {
    const actions = this.handActions.get(gameId);
    if (actions) {
      actions.push({ seat, name, street, action: action.type, amount: action.amount, timestamp: Date.now() });
    }
  }

  /** Record a completed hand to history */
  private recordCompletedHand(gameId: string, state: GameState): void {
    const startStacks = this.handStartStacks.get(gameId);
    const actions = this.handActions.get(gameId) ?? [];

    const record: HandRecord = {
      gameId,
      handNumber: state.handNumber,
      timestamp: Date.now(),
      blinds: { small: state.smallBlind, big: state.bigBlind },
      players: state.players.map((p) => ({
        seat: p.seat,
        name: p.name,
        isBot: p.isBot,
        botModel: p.botModel,
        startStack: startStacks?.get(p.id) ?? p.stack,
        endStack: p.stack,
        holeCards: p.holeCards.length > 0 ? p.holeCards : undefined,
        isDealer: p.seat === state.dealerSeat,
      })),
      actions,
      communityCards: state.communityCards,
      winners: (state.winners ?? []).map((w) => {
        const p = state.players.find((pl) => pl.seat === w.seat);
        return { seat: w.seat, name: p?.name ?? '?', amount: w.amount, handName: w.handName };
      }),
      pot: state.pots.reduce((s, p) => s + p.amount, 0) || (state.winners ?? []).reduce((s, w) => s + w.amount, 0),
    };

    addHandRecord(record);
  }

  /** Reset the game */
  resetGame(gameId: string, humanPlayerId: string): void {
    const isHeadsUp = gameId.startsWith('heads-up-');
    this.games.delete(gameId);
    this.lastTickTime.delete(gameId);
    this.showdownUntil.delete(gameId);
    this.handStartStacks.delete(gameId);
    this.handActions.delete(gameId);
    this.lastRecordedHand.delete(gameId);
    // Clear pending actions for this game only
    for (const key of this.pendingBotAction.keys()) {
      if (key.startsWith(`${gameId}:`)) this.pendingBotAction.delete(key);
    }
    for (const key of this.resolvedBotActions.keys()) {
      if (key.startsWith(`${gameId}:`)) this.resolvedBotActions.delete(key);
    }
    if (isHeadsUp) {
      const driverId = gameId.replace('heads-up-', '');
      this.getOrCreateHeadsUp(humanPlayerId, driverId);
    } else {
      this.getOrCreateDemo(humanPlayerId);
    }
  }

  /** Update a bot's model or play style */
  updateBot(gameId: string, botId: string, field: string, value: string | number): void {
    const state = this.games.get(gameId);
    if (!state) return;
    const player = state.players.find((p) => p.id === botId);
    if (!player?.isBot) return;

    const profile = this.botProfiles.get(botId);
    if (!profile) return;

    if (field === 'model') {
      player.botModel = String(value);
      profile.model = String(value);

      // Try to find a matching driver
      const drivers = getDrivers();
      const matchedDriver = drivers.find((d) => d.displayName === String(value) || d.modelId === String(value));
      if (matchedDriver) {
        profile.driver = matchedDriver.enabled ? matchedDriver : undefined;
        player.botModel = matchedDriver.displayName;
        Object.assign(profile, {
          aggression: matchedDriver.personality.aggression,
          tightness: matchedDriver.personality.tightness,
          bluffFreq: matchedDriver.personality.bluffFreq,
        });
      }
    } else if (field === 'playStyle') {
      const styles: Record<string, { aggression: number; tightness: number }> = {
        tight: { aggression: 0.3, tightness: 0.9 },
        loose: { aggression: 0.5, tightness: 0.2 },
        aggressive: { aggression: 0.9, tightness: 0.5 },
        passive: { aggression: 0.2, tightness: 0.5 },
        balanced: { aggression: 0.5, tightness: 0.5 },
      };
      Object.assign(profile, styles[String(value)] ?? {});
    }
  }

  // ============================================================
  // Tick — advance game state, supports async AI bot calls
  // ============================================================

  private tick(gameId: string, state: GameState): void {
    const now = Date.now();
    const lastTick = this.lastTickTime.get(gameId) ?? 0;
    const elapsed = now - lastTick;

    // Showdown display hold
    const showdownEnd = this.showdownUntil.get(gameId) ?? 0;
    if (now < showdownEnd) return;

    // Start new hand if needed
    if (state.phase === 'showdown' || state.phase === 'waiting') {
      // Record completed hand
      if (state.phase === 'showdown' && (this.lastRecordedHand.get(gameId) ?? 0) < state.handNumber) {
        console.log(`[HandHistory] Recording hand #${state.handNumber} for ${gameId}, stacks=${this.handStartStacks.has(gameId)}, actions=${this.handActions.get(gameId)?.length ?? 0}`);
        this.recordCompletedHand(gameId, state);
        this.lastRecordedHand.set(gameId, state.handNumber);
      }
      if (state.phase === 'showdown' && showdownEnd === 0) {
        this.showdownUntil.set(gameId, now + getSettings().showdownHoldMs);
        this.lastTickTime.set(gameId, now);
        return;
      }
      for (const p of state.players) {
        if (p.stack <= 0) p.stack = getSettings().rebuyStack;
      }
      if (canStartHand(state)) {
        // Capture starting stacks before the hand
        const stacks = new Map<string, number>();
        for (const p of state.players) stacks.set(p.id, p.stack);
        this.handStartStacks.set(gameId, stacks);
        this.handActions.set(gameId, []);

        startHand(state);
        this.lastTickTime.set(gameId, now);
        this.showdownUntil.set(gameId, 0);
      }
      return;
    }

    const activeId = getActivePlayerId(state);
    if (!activeId) return;

    const player = state.players.find((p) => p.id === activeId);
    if (!player?.isBot) return;

    const key = `${gameId}:${activeId}`;

    // Check if we have a resolved AI action ready
    const resolved = this.resolvedBotActions.get(key);
    if (resolved) {
      this.resolvedBotActions.delete(key);
      const street = state.phase;
      const success = executeAction(state, activeId, resolved);
      if (success) {
        this.trackAction(gameId, player.seat, player.name, street, resolved);
      } else {
        executeAction(state, activeId, { type: 'fold' });
        this.trackAction(gameId, player.seat, player.name, street, { type: 'fold' });
      }
      this.lastTickTime.set(gameId, now);
      return;
    }

    // Check if an AI call is already in flight
    if (this.pendingBotAction.has(key)) return;

    // Minimum think time before acting
    const profile = this.botProfiles.get(activeId);
    const cfg = getSettings();
    const thinkTime = cfg.botThinkMinMs + Math.random() * (cfg.botThinkMaxMs - cfg.botThinkMinMs);

    if (elapsed < thinkTime) return;

    // If driver is available and connected, start async AI call
    if (profile?.driver?.enabled && profile.driver.status === 'connected') {
      const valid = getValidActions(state, activeId);
      const promise = computeBotActionAsync(state, activeId, profile, valid);

      this.pendingBotAction.set(key, promise);

      promise.then((action) => {
        this.resolvedBotActions.set(key, action);
        this.pendingBotAction.delete(key);
      }).catch(() => {
        // Fallback to rule-based
        const fallbackAction = computeBotAction(state, activeId, profile, valid);
        this.resolvedBotActions.set(key, fallbackAction);
        this.pendingBotAction.delete(key);
      });

      return;
    }

    // Rule-based (sync) — use immediately after think time
    const valid = getValidActions(state, activeId);
    const action = computeBotAction(state, activeId, profile ?? BOT_PROFILES[0], valid);
    const street = state.phase;
    const success = executeAction(state, activeId, action);
    if (success) {
      this.trackAction(gameId, player.seat, player.name, street, action);
    } else {
      executeAction(state, activeId, { type: 'fold' });
      this.trackAction(gameId, player.seat, player.name, street, { type: 'fold' });
    }
    this.lastTickTime.set(gameId, now);
  }

  // ============================================================
  // Driver Health
  // ============================================================

  private async checkAllDriverHealth(): Promise<void> {
    const drivers = getDrivers();
    for (const driver of drivers) {
      if (driver.enabled) {
        try {
          driver.status = await checkProviderHealth(driver);
        } catch {
          driver.status = 'disconnected';
        }
      }
    }

    // Refresh bot profiles with health status
    for (const [botId, profile] of this.botProfiles) {
      if (profile.driver) {
        const fresh = drivers.find((d) => d.id === profile.driver!.id);
        if (fresh) profile.driver = fresh.enabled && fresh.status === 'connected' ? fresh : undefined;
      }
    }
  }
}

// Singleton
const g = globalThis as unknown as { __pokerGameManager?: GameManager };
export const gameManager = g.__pokerGameManager ?? new GameManager();
g.__pokerGameManager = gameManager;
