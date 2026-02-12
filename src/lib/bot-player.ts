// ============================================================
// BotPlayer Entity — Complete AI Player Composition
//
// A BotPlayer defines everything about an AI opponent:
// - Model configuration (provider, presets)
// - Personality (style, aggression, system prompt)
// - Deliberation settings (steps, questions)
//
// Multiple bots can use the same model with different sessions.
// ============================================================

import { uuid } from './uuid';
import type { QuestionType } from './poker/deliberation';

// ============================================================
// Type Definitions
// ============================================================

export interface BotPlayer {
  /** Unique identifier */
  id: string;
  /** URL-friendly slug */
  slug: string;
  /** Display name shown at table */
  displayName: string;
  /** Avatar URL (optional) */
  avatarUrl?: string;

  /** Model configuration */
  model: ModelConfig;

  /** Personality and play style */
  personality: BotPersonality;

  /** Deliberation settings */
  deliberation: DeliberationConfig;

  /** Metadata */
  isActive: boolean;
  isPublic: boolean;
  createdAt: number;
}

export interface ModelConfig {
  /** Provider type */
  provider: 'lmstudio' | 'ollama' | 'openai' | 'anthropic' | 'openrouter' | 'custom';
  /** Model identifier */
  modelId: string;
  /** API base URL */
  baseUrl: string;
  /** API key (encrypted in DB, empty for local) */
  apiKey?: string;
  /** Model presets */
  presets: ModelPresets;
}

export interface ModelPresets {
  /** Temperature (0.0-2.0) */
  temperature: number;
  /** Top-P sampling (0.0-1.0) */
  topP: number;
  /** Top-K sampling (1-100) */
  topK: number;
  /** Max response tokens */
  maxTokens: number;
  /** Context window size */
  contextSize: number;
  /** Repeat penalty (1.0-2.0) */
  repeatPenalty: number;
  /** Stop sequences */
  stopSequences: string[];
}

export interface BotPersonality {
  /** Play style archetype */
  style: PlayStyle;
  /** Human-readable description */
  description: string;
  /** System prompt (the bot's "soul") */
  systemPrompt: string;
  /** Aggression: 0 = passive, 1 = ultra-aggressive */
  aggression: number;
  /** Tightness: 0 = plays everything, 1 = premium hands only */
  tightness: number;
  /** Bluff frequency: 0 = never, 1 = always */
  bluffFreq: number;
  /** Risk tolerance: 0 = risk-averse, 1 = gambler */
  riskTolerance: number;
  /** Simulated think time [min, max] ms */
  thinkTimeMs: [number, number];
}

export interface DeliberationConfig {
  /** Enable multi-turn deliberation */
  enabled: boolean;
  /** Max deliberation steps */
  maxSteps: number;
  /** Which questions to ask (in order) */
  questions: QuestionType[];
  /** Timeout per step (ms) */
  stepTimeoutMs: number;
}

export type PlayStyle =
  | 'tight-aggressive'
  | 'loose-aggressive'
  | 'tight-passive'
  | 'loose-passive'
  | 'maniac'
  | 'balanced'
  | 'exploitative';

// ============================================================
// Default Presets
// ============================================================

export const DEFAULT_PRESETS: ModelPresets = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 1024,
  contextSize: 8192,
  repeatPenalty: 1.1,
  stopSequences: [],
};

export const DEFAULT_DELIBERATION: DeliberationConfig = {
  enabled: true,
  maxSteps: 3,
  questions: ['hand_strength', 'opponent_range', 'player_style'],
  stepTimeoutMs: 5000,
};

// ============================================================
// Pre-Built Bot Library
// ============================================================

export const BOT_LIBRARY: BotPlayer[] = [
  {
    id: uuid(),
    slug: 'nemotron-shark',
    displayName: 'Shark',
    model: {
      provider: 'lmstudio',
      modelId: 'nvidia/nemotron-3-nano',
      baseUrl: 'http://localhost:1234/v1',
      presets: { ...DEFAULT_PRESETS, temperature: 0.6 },
    },
    personality: {
      style: 'tight-aggressive',
      description: 'Calculative predator. Waits for premium hands, then strikes hard. Pot odds focused.',
      systemPrompt: `You are Shark, a calculating poker predator. You play tight-aggressive poker.

Your strategy:
- Only enter pots with strong hands
- When you play, play aggressively — bet and raise
- Calculate pot odds precisely before calling
- Size your bets to maximize value and deny draws
- Fold without hesitation when the math is against you
- Position is everything — play tighter early, looser in position

You think in terms of: hand equity, pot odds, implied odds, and stack-to-pot ratio.
Be ruthless. Be efficient. Be profitable.`,
      aggression: 0.75,
      tightness: 0.8,
      bluffFreq: 0.12,
      riskTolerance: 0.4,
      thinkTimeMs: [1000, 2500],
    },
    deliberation: {
      enabled: true,
      maxSteps: 3,
      questions: ['hand_strength', 'pot_odds', 'opponent_range'],
      stepTimeoutMs: 5000,
    },
    isActive: true,
    isPublic: true,
    createdAt: Date.now(),
  },

  {
    id: uuid(),
    slug: 'qwen-professor',
    displayName: 'Professor',
    model: {
      provider: 'lmstudio',
      modelId: 'qwen/qwen3-30b-a3b-2507',
      baseUrl: 'http://localhost:1234/v1',
      presets: { ...DEFAULT_PRESETS, temperature: 0.7, maxTokens: 1536 },
    },
    personality: {
      style: 'balanced',
      description: 'The teacher. Explains reasoning, plays fundamentally sound poker. Educational commentary.',
      systemPrompt: `You are Professor, a poker educator who thinks out loud.

Your strategy:
- Play solid, fundamental poker
- Explain your reasoning as if teaching a student
- Consider multiple lines before deciding
- Balance aggression with caution
- Point out opponent mistakes in your reasoning
- Adapt to table dynamics over time

When making decisions, walk through:
1. What hands beat me?
2. What hands am I beating?
3. What's the optimal play given stack sizes?
4. How does my range look to opponents?

Be thorough. Be educational. Be balanced.`,
      aggression: 0.55,
      tightness: 0.6,
      bluffFreq: 0.15,
      riskTolerance: 0.45,
      thinkTimeMs: [1500, 3500],
    },
    deliberation: {
      enabled: true,
      maxSteps: 4,
      questions: ['hand_strength', 'opponent_range', 'pot_odds', 'player_style'],
      stepTimeoutMs: 6000,
    },
    isActive: true,
    isPublic: true,
    createdAt: Date.now(),
  },

  {
    id: uuid(),
    slug: 'flash-gunslinger',
    displayName: 'Gunslinger',
    model: {
      provider: 'lmstudio',
      modelId: 'glm-4.7-flash-mlx-5',
      baseUrl: 'http://localhost:1234/v1',
      presets: { ...DEFAULT_PRESETS, temperature: 0.8, maxTokens: 512 },
    },
    personality: {
      style: 'loose-aggressive',
      description: 'Fast instincts. Plays many hands, applies relentless pressure. Trusts gut reads.',
      systemPrompt: `You are Gunslinger, a fearless poker player who trusts instincts over math.

Your strategy:
- Play lots of hands — action is life
- Bet and raise more than you call
- Trust your first read
- Apply pressure constantly
- When in doubt, bet
- Make opponents uncomfortable

You don't overthink. You act. You attack. You win or you reload.
Speed and aggression are your weapons.`,
      aggression: 0.85,
      tightness: 0.3,
      bluffFreq: 0.28,
      riskTolerance: 0.75,
      thinkTimeMs: [500, 1200],
    },
    deliberation: {
      enabled: true,
      maxSteps: 1,
      questions: ['hand_strength'],
      stepTimeoutMs: 3000,
    },
    isActive: true,
    isPublic: true,
    createdAt: Date.now(),
  },

  {
    id: uuid(),
    slug: 'gemma-rock',
    displayName: 'The Rock',
    model: {
      provider: 'lmstudio',
      modelId: 'gemma-3n-e4b-it',
      baseUrl: 'http://localhost:1234/v1',
      presets: { ...DEFAULT_PRESETS, temperature: 0.5 },
    },
    personality: {
      style: 'tight-passive',
      description: 'Ultra-patient. Only plays premium hands. The ultimate nit.',
      systemPrompt: `You are The Rock, the most patient player at the table.

Your strategy:
- Only play premium hands: AA, KK, QQ, JJ, AK, AQ
- Fold everything else preflop
- When you do play, your range is face-up strong
- Prefer calling over raising (let them hang themselves)
- Never bluff — your image sells your value bets
- Patience wins. Let others gamble.

You are an immovable object. You wait. You strike. You stack.`,
      aggression: 0.3,
      tightness: 0.9,
      bluffFreq: 0.03,
      riskTolerance: 0.2,
      thinkTimeMs: [800, 1800],
    },
    deliberation: {
      enabled: true,
      maxSteps: 2,
      questions: ['hand_strength', 'player_style'],
      stepTimeoutMs: 4000,
    },
    isActive: true,
    isPublic: true,
    createdAt: Date.now(),
  },

  {
    id: uuid(),
    slug: 'mistral-gambler',
    displayName: 'Gambler',
    model: {
      provider: 'lmstudio',
      modelId: 'mistral-small-3.1-24b-instruct-2503',
      baseUrl: 'http://localhost:1234/v1',
      presets: { ...DEFAULT_PRESETS, temperature: 0.9 },
    },
    personality: {
      style: 'maniac',
      description: 'Lives for action. Raises everything. Maximum variance, maximum excitement.',
      systemPrompt: `You are Gambler, a poker maniac who came to play every hand.

Your strategy:
- Any two cards can win
- Raise preflop — always apply pressure
- If they 3-bet, 4-bet
- Bluff on scary boards
- Stack off light with top pair
- Fortune favors the bold

You're not here to grind. You're here to gamble.
The swings are the fun part.`,
      aggression: 0.95,
      tightness: 0.15,
      bluffFreq: 0.35,
      riskTolerance: 0.9,
      thinkTimeMs: [600, 1400],
    },
    deliberation: {
      enabled: true,
      maxSteps: 2,
      questions: ['hand_strength', 'bluff_check'],
      stepTimeoutMs: 4000,
    },
    isActive: true,
    isPublic: true,
    createdAt: Date.now(),
  },

  {
    id: uuid(),
    slug: 'deepseek-solver',
    displayName: 'Solver',
    model: {
      provider: 'lmstudio',
      modelId: 'deepseek/deepseek-r1-0528-qwen3-8b',
      baseUrl: 'http://localhost:1234/v1',
      presets: { ...DEFAULT_PRESETS, temperature: 0.6, maxTokens: 2048 },
    },
    personality: {
      style: 'balanced',
      description: 'GTO-focused. Deep analysis on every decision. Approximates solver outputs.',
      systemPrompt: `You are Solver, a GTO-approximating poker AI.

Your strategy:
- Think through multiple decision trees
- Balance your ranges on every street
- Mix value bets and bluffs at correct frequencies
- Never be exploitable — play unexploitable poker
- Consider opponent ranges at every decision point
- Adjust slightly to exploit major leaks, but stay balanced

You calculate:
- Minimum defense frequency
- Optimal bet sizing
- Bluff-to-value ratios
- Equity realization

Be balanced. Be unexploitable. Be optimal.`,
      aggression: 0.55,
      tightness: 0.55,
      bluffFreq: 0.18,
      riskTolerance: 0.5,
      thinkTimeMs: [2000, 4500],
    },
    deliberation: {
      enabled: true,
      maxSteps: 5,
      questions: ['hand_strength', 'position', 'opponent_range', 'pot_odds', 'player_style'],
      stepTimeoutMs: 7000,
    },
    isActive: true,
    isPublic: true,
    createdAt: Date.now(),
  },

  {
    id: uuid(),
    slug: 'devstral-hunter',
    displayName: 'Hunter',
    model: {
      provider: 'lmstudio',
      modelId: 'mistralai/devstral-small-2507',
      baseUrl: 'http://localhost:1234/v1',
      presets: { ...DEFAULT_PRESETS, temperature: 0.7 },
    },
    personality: {
      style: 'exploitative',
      description: 'Finds and exploits weaknesses. Adapts to opponent tendencies rapidly.',
      systemPrompt: `You are Hunter, an exploitative poker predator.

Your strategy:
- Identify opponent tendencies quickly
- Exploit predictable patterns ruthlessly
- Bluff the tight players, value bet the loose ones
- Target the weakest player at the table
- Adjust your strategy hand-by-hand
- When you find a leak, attack it relentlessly

You observe:
- Who folds to aggression?
- Who calls too much?
- Who bluffs too often?
- Who plays scared?

Find the weakness. Exploit it. Stack them.`,
      aggression: 0.65,
      tightness: 0.5,
      bluffFreq: 0.22,
      riskTolerance: 0.6,
      thinkTimeMs: [1000, 2500],
    },
    deliberation: {
      enabled: true,
      maxSteps: 3,
      questions: ['hand_strength', 'opponent_range', 'bluff_check'],
      stepTimeoutMs: 5000,
    },
    isActive: true,
    isPublic: true,
    createdAt: Date.now(),
  },
];

// ============================================================
// Bot Library Store (globalThis for HMR survival)
// ============================================================

const STORE_KEY = '__botPlayerLibrary__';

function getStore(): Map<string, BotPlayer> {
  const g = globalThis as Record<string, unknown>;
  if (!(g[STORE_KEY] instanceof Map)) {
    // Initialize with pre-built library
    const map = new Map<string, BotPlayer>();
    for (const bot of BOT_LIBRARY) {
      map.set(bot.id, bot);
    }
    g[STORE_KEY] = map;
  }
  return g[STORE_KEY] as Map<string, BotPlayer>;
}

// ============================================================
// CRUD Operations
// ============================================================

export function getAllBotPlayers(): BotPlayer[] {
  return Array.from(getStore().values());
}

export function getActiveBotPlayers(): BotPlayer[] {
  return getAllBotPlayers().filter(b => b.isActive);
}

export function getBotPlayerById(id: string): BotPlayer | undefined {
  return getStore().get(id);
}

export function getBotPlayerBySlug(slug: string): BotPlayer | undefined {
  return getAllBotPlayers().find(b => b.slug === slug);
}

export function createBotPlayer(data: Omit<BotPlayer, 'id' | 'createdAt'>): BotPlayer {
  const bot: BotPlayer = {
    ...data,
    id: uuid(),
    createdAt: Date.now(),
  };
  getStore().set(bot.id, bot);
  return bot;
}

export function updateBotPlayer(id: string, patch: Partial<BotPlayer>): BotPlayer | null {
  const existing = getStore().get(id);
  if (!existing) return null;
  
  const updated = { ...existing, ...patch, id: existing.id };
  getStore().set(id, updated);
  return updated;
}

export function deleteBotPlayer(id: string): boolean {
  return getStore().delete(id);
}

// ============================================================
// Helper: Get random bots for a table
// ============================================================

export function getRandomBots(count: number, excludeIds: string[] = []): BotPlayer[] {
  const available = getActiveBotPlayers().filter(b => !excludeIds.includes(b.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================================
// Helper: Convert BotPlayer to legacy BotDriver format
// ============================================================

export function botPlayerToDriver(bot: BotPlayer): {
  id: string;
  displayName: string;
  provider: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  personality: {
    systemPrompt: string;
    aggression: number;
    tightness: number;
    bluffFreq: number;
    riskTolerance: number;
    thinkTimeMs: [number, number];
  };
  enabled: boolean;
  status: 'unchecked';
  transparency: 'full';
} {
  return {
    id: bot.id,
    displayName: bot.displayName,
    provider: bot.model.provider,
    modelId: bot.model.modelId,
    baseUrl: bot.model.baseUrl,
    apiKey: bot.model.apiKey ?? '',
    personality: {
      systemPrompt: bot.personality.systemPrompt,
      aggression: bot.personality.aggression,
      tightness: bot.personality.tightness,
      bluffFreq: bot.personality.bluffFreq,
      riskTolerance: bot.personality.riskTolerance,
      thinkTimeMs: bot.personality.thinkTimeMs,
    },
    enabled: bot.isActive,
    status: 'unchecked',
    transparency: 'full',
  };
}
