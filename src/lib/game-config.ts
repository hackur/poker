// ============================================================
// Game Configuration — Runtime-adjustable settings
// Stored on globalThis to survive HMR and module boundaries
// ============================================================

export interface GameSettings {
  /** AI model call timeout in ms. 0 = unlimited */
  aiTimeoutMs: number;
  /** Minimum bot think delay in ms (simulates thinking) */
  botThinkMinMs: number;
  /** Maximum bot think delay in ms */
  botThinkMaxMs: number;
  /** Showdown display hold time in ms */
  showdownHoldMs: number;
  /** Auto-rebuy stack amount */
  rebuyStack: number;
  /** Blinds: small blind */
  smallBlind: number;
  /** Blinds: big blind */
  bigBlind: number;
  /** Enable multi-turn deliberation for bot decisions */
  deliberationEnabled: boolean;
  /** Max deliberation steps (questions to self) before final decision */
  deliberationMaxSteps: number;
  /** Timeout per deliberation step in ms */
  deliberationStepTimeoutMs: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  aiTimeoutMs: 30000,
  botThinkMinMs: 1000,
  botThinkMaxMs: 2500,
  showdownHoldMs: 3000,
  rebuyStack: 1000,
  smallBlind: 5,
  bigBlind: 10,
  deliberationEnabled: true,
  deliberationMaxSteps: 3,
  deliberationStepTimeoutMs: 5000,
};

const KEY = '__pokerGameSettings__';

export function getSettings(): GameSettings {
  const g = globalThis as Record<string, unknown>;
  if (!g[KEY]) g[KEY] = { ...DEFAULT_SETTINGS };
  return g[KEY] as GameSettings;
}

export function updateSettings(patch: Partial<GameSettings>): GameSettings {
  const settings = getSettings();
  Object.assign(settings, patch);
  return settings;
}
