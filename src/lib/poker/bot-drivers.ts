// ============================================================
// Bot Driver System — Provider-agnostic AI model integration
//
// Supports: LM Studio, Ollama, OpenAI, Anthropic, Google, OpenRouter
// All providers use the OpenAI-compatible chat completions API format.
// ============================================================

export interface BotDriver {
  /** Unique driver ID */
  id: string;
  /** Display name shown on the table */
  displayName: string;
  /** Provider type */
  provider: ProviderType;
  /** Model identifier (provider-specific) */
  modelId: string;
  /** Base URL for the API */
  baseUrl: string;
  /** API key (empty for local models) */
  apiKey: string;
  /** Play style personality */
  personality: BotPersonality;
  /** Whether this driver is enabled */
  enabled: boolean;
  /** Connection status */
  status: DriverStatus;
  /** Decision transparency config */
  transparency: TransparencyLevel;
}

export type ProviderType =
  | 'lmstudio'    // LM Studio local server
  | 'ollama'      // Ollama local server
  | 'openai'      // OpenAI API
  | 'anthropic'   // Anthropic (via OpenAI-compat proxy or direct)
  | 'google'      // Google AI (via OpenAI-compat proxy)
  | 'openrouter'  // OpenRouter (multi-model gateway)
  | 'custom';     // Any OpenAI-compatible endpoint

export type DriverStatus = 'connected' | 'disconnected' | 'error' | 'unchecked';
export type TransparencyLevel = 'full' | 'summary' | 'hidden';

export interface BotPersonality {
  /** Display description of how this bot plays */
  description: string;
  /** Play style archetype */
  style: PlayStyle;
  /** System prompt that shapes decision-making */
  systemPrompt: string;
  /** Aggression: 0 = passive, 1 = ultra-aggressive */
  aggression: number;
  /** Tightness: 0 = plays everything, 1 = premium hands only */
  tightness: number;
  /** Bluff frequency: 0 = never bluffs, 1 = always bluffs */
  bluffFreq: number;
  /** Risk tolerance: 0 = risk-averse, 1 = gambler */
  riskTolerance: number;
  /** Simulated think time range [min, max] in ms */
  thinkTimeMs: [number, number];
}

export type PlayStyle =
  | 'tight-aggressive'   // TAG: selective but deadly (best strategy)
  | 'loose-aggressive'   // LAG: plays many, bets hard
  | 'tight-passive'      // Rock: waits for nuts, rarely raises
  | 'loose-passive'      // Calling station: calls everything
  | 'maniac'             // Raises everything, max pressure
  | 'balanced'           // GTO-approximating
  | 'exploitative';      // Adjusts to opponents

/** Deliberation step record */
export interface DeliberationStepRecord {
  question: string;
  prompt: string;
  response: string;
  durationMs: number;
}

/** Full deliberation result */
export interface DeliberationRecord {
  steps: DeliberationStepRecord[];
  totalDurationMs: number;
  finalAction: { type: string; amount?: number };
  confidence: number;
  rawFinalResponse: string;
}

/** Decision record — full transparency of bot reasoning */
export interface BotDecision {
  /** Unique decision ID (UUID) */
  decisionId: string;
  botId: string;
  botName: string;
  modelId: string;
  provider: ProviderType;
  /** Bot session ID for context tracking */
  sessionId?: string;
  /** The prompt sent to the model */
  prompt: string;
  /** Raw model response */
  rawResponse: string;
  /** Parsed action */
  action: { type: string; amount?: number };
  /** Model's reasoning (if provided) */
  reasoning: string;
  /** Hand strength assessment */
  handAssessment: string;
  /** Time taken for inference (ms) */
  inferenceTimeMs: number;
  /** Token usage */
  tokens?: { prompt: number; completion: number };
  /** Whether this was a fallback (rule-based) decision */
  isFallback: boolean;
  /** Timestamp */
  timestamp: number;
  /** Hand number when this decision was made */
  handNumber?: number;
  /** Game ID (slug) */
  gameId?: string;
  /** Game UUID */
  gameUuid?: string;
  /** Hand UUID */
  handUuid?: string;
  /** Street/phase when decision was made */
  street?: string;
  /** Full deliberation data (if multi-turn was used) */
  deliberation?: DeliberationRecord;
}

// ============================================================
// Default Driver Configurations
// ============================================================

export const DEFAULT_PROVIDERS: Record<ProviderType, { name: string; defaultUrl: string; requiresKey: boolean }> = {
  lmstudio: { name: 'LM Studio', defaultUrl: 'http://localhost:1234/v1', requiresKey: false },
  ollama: { name: 'Ollama', defaultUrl: 'http://localhost:11434/v1', requiresKey: false },
  openai: { name: 'OpenAI', defaultUrl: 'https://api.openai.com/v1', requiresKey: true },
  anthropic: { name: 'Anthropic', defaultUrl: 'https://api.anthropic.com/v1', requiresKey: true },
  google: { name: 'Google AI', defaultUrl: 'https://generativelanguage.googleapis.com/v1beta', requiresKey: true },
  openrouter: { name: 'OpenRouter', defaultUrl: 'https://openrouter.ai/api/v1', requiresKey: true },
  custom: { name: 'Custom', defaultUrl: 'http://localhost:8080/v1', requiresKey: false },
};

/** Pre-configured bot drivers with distinct personalities */
export const DEFAULT_DRIVERS: BotDriver[] = [
  // ============================================================
  // LM Studio Local Models
  // ============================================================
  {
    id: 'nemotron-local',
    displayName: 'Nemotron Nano',
    provider: 'lmstudio',
    modelId: 'nvidia/nemotron-3-nano',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'NVIDIA Nemotron 3 Nano 30B. Calculative and efficient — Mamba-2 architecture for fast sequential reasoning. Tight-aggressive with a focus on pot odds.',
      style: 'tight-aggressive',
      systemPrompt: `You are a tight-aggressive poker player named "Nemotron". You are powered by NVIDIA Nemotron 3 Nano.

Your strategy:
- Play premium hands aggressively from any position
- Fold marginal hands without hesitation
- Size bets based on pot odds and opponent tendencies
- Bluff occasionally on scare cards, especially in position
- Never slow-play strong hands — always build the pot

You think in terms of: hand strength, position, pot odds, stack-to-pot ratio, and opponent ranges.`,
      aggression: 0.7,
      tightness: 0.75,
      bluffFreq: 0.12,
      riskTolerance: 0.5,
      thinkTimeMs: [800, 2000],
    },
  },
  {
    id: 'qwen-coder',
    displayName: 'Qwen Coder',
    provider: 'lmstudio',
    modelId: 'qwen3-coder-30b-a3b-instruct-mlx-6',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Qwen3 Coder 30B. Analytical and systematic — approaches poker like debugging code. Calculates EV precisely, exploits patterns.',
      style: 'balanced',
      systemPrompt: `You are an analytical poker player named "Qwen". You approach poker like a complex optimization problem.

Your strategy:
- Calculate expected value for every decision
- Track betting patterns and exploit deviations from GTO
- Use position advantage systematically
- Balance your ranges to remain unexploitable
- Make disciplined folds when the math is clear
- Document your reasoning like code comments`,
      aggression: 0.55,
      tightness: 0.65,
      bluffFreq: 0.15,
      riskTolerance: 0.45,
      thinkTimeMs: [1000, 2500],
    },
  },
  {
    id: 'glm-flash',
    displayName: 'GLM Flash',
    provider: 'lmstudio',
    modelId: 'glm-4.7-flash-mlx-5',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'GLM 4.7 Flash. Lightning-fast instincts — trusts gut reads over deep calculation. Loose-aggressive with quick decisions.',
      style: 'loose-aggressive',
      systemPrompt: `You are an instinctive poker player named "Flash". You trust your reads and act decisively.

Your strategy:
- Make quick reads on opponent tendencies
- Play a wide range when you sense weakness
- Apply relentless pressure with bets and raises
- Don't overthink — go with your first instinct
- Punish hesitation and weakness
- When in doubt, bet`,
      aggression: 0.8,
      tightness: 0.35,
      bluffFreq: 0.25,
      riskTolerance: 0.7,
      thinkTimeMs: [500, 1200],
    },
  },
  {
    id: 'mistral-magistral',
    displayName: 'Magistral',
    provider: 'lmstudio',
    modelId: 'mistralai/magistral-small-2509',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Mistral Magistral Small. The judge — measured and authoritative. Makes declarative plays, rarely second-guesses.',
      style: 'tight-aggressive',
      systemPrompt: `You are a commanding poker player named "Magistral". You play with authority and conviction.

Your strategy:
- Make strong, declarative bets that demand respect
- Project confidence regardless of hand strength
- Punish limpers and weak leads
- When you enter a pot, you're there to win it
- Fold or raise — rarely just call
- Your table image is tight but fearless`,
      aggression: 0.75,
      tightness: 0.7,
      bluffFreq: 0.18,
      riskTolerance: 0.55,
      thinkTimeMs: [800, 1800],
    },
  },
  {
    id: 'deepseek-r1',
    displayName: 'DeepSeek R1',
    provider: 'lmstudio',
    modelId: 'deepseek/deepseek-r1-0528-qwen3-8b',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'DeepSeek R1 (Qwen3 8B). Deep thinker — uses extended reasoning chains. GTO-focused with thorough hand analysis.',
      style: 'balanced',
      systemPrompt: `You are a deep-thinking poker player named "DeepSeek". You analyze every angle before acting.

Your strategy:
- Think through multiple decision trees before acting
- Consider opponent ranges at every branch point
- Calculate pot odds, implied odds, and reverse implied odds
- Balance value bets with strategic bluffs
- Adjust to opponent tendencies over time
- Never make rushed decisions — the math matters`,
      aggression: 0.5,
      tightness: 0.6,
      bluffFreq: 0.15,
      riskTolerance: 0.4,
      thinkTimeMs: [2000, 4000],
    },
  },
  {
    id: 'qwen-30b',
    displayName: 'Qwen 30B',
    provider: 'lmstudio',
    modelId: 'qwen/qwen3-30b-a3b-2507',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Qwen3 30B. The professor — explains reasoning, teaches while playing. Balanced style with educational commentary.',
      style: 'balanced',
      systemPrompt: `You are a professorial poker player named "Qwen". You explain your thought process like teaching a student.

Your strategy:
- Verbalize your reasoning clearly
- Consider multiple perspectives before deciding
- Point out opponent mistakes (to yourself)
- Play fundamentally sound poker
- Adapt to table dynamics
- Value long-term EV over short-term results`,
      aggression: 0.5,
      tightness: 0.55,
      bluffFreq: 0.12,
      riskTolerance: 0.45,
      thinkTimeMs: [1500, 3000],
    },
  },
  {
    id: 'qwen-8b',
    displayName: 'Qwen 8B',
    provider: 'lmstudio',
    modelId: 'qwen/qwen3-8b',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Qwen3 8B. Scrappy underdog — plays solid ABC poker. Not fancy, but fundamentally sound.',
      style: 'tight-passive',
      systemPrompt: `You are a solid, no-frills poker player named "Qwen Jr". You play ABC poker without fancy moves.

Your strategy:
- Play tight preflop, loosen up in position
- Bet for value when you have it
- Check and fold when you don't
- Avoid complicated bluffs
- Let opponents make mistakes
- Solid, patient, profitable`,
      aggression: 0.4,
      tightness: 0.7,
      bluffFreq: 0.08,
      riskTolerance: 0.35,
      thinkTimeMs: [600, 1400],
    },
  },
  {
    id: 'mistral-24b',
    displayName: 'Mistral 24B',
    provider: 'lmstudio',
    modelId: 'mistral-small-3.1-24b-instruct-2503',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Mistral Small 24B. The gambler — loves action, plays marginal hands, lives for the swings.',
      style: 'loose-aggressive',
      systemPrompt: `You are an action-loving poker player named "Mistral". You came to gamble, not to fold.

Your strategy:
- Play lots of hands — any two cards can win
- Apply pressure with bets and raises
- Chase draws when the price is close
- Bluff when the board looks scary
- Stack off light with top pair
- Fortune favors the bold`,
      aggression: 0.85,
      tightness: 0.25,
      bluffFreq: 0.3,
      riskTolerance: 0.8,
      thinkTimeMs: [700, 1600],
    },
  },
  {
    id: 'gemma-3n',
    displayName: 'Gemma 3N',
    provider: 'lmstudio',
    modelId: 'gemma-3n-e4b-it',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Google Gemma 3N. The nit — ultra-tight, only plays premium hands. Folds everything else.',
      style: 'tight-passive',
      systemPrompt: `You are an extremely tight poker player named "Gemma". You only play the best hands.

Your strategy:
- Only play premium pairs (AA, KK, QQ, JJ) and AK
- Fold everything else preflop
- When you do play, bet for value
- Never bluff — your range is face-up strong
- Let others gamble while you wait for premiums
- Patience wins tournaments`,
      aggression: 0.35,
      tightness: 0.9,
      bluffFreq: 0.03,
      riskTolerance: 0.2,
      thinkTimeMs: [500, 1200],
    },
  },
  {
    id: 'devstral',
    displayName: 'Devstral',
    provider: 'lmstudio',
    modelId: 'mistralai/devstral-small-2507',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Mistral Devstral. The hacker — finds exploits, targets weaknesses, adapts rapidly.',
      style: 'exploitative',
      systemPrompt: `You are an exploitative poker player named "Devstral". You find and exploit opponent weaknesses.

Your strategy:
- Identify opponent tendencies quickly
- Exploit predictable patterns ruthlessly
- Adjust strategy hand-by-hand
- Bluff the tight players, value bet the loose ones
- Target the weakest player at the table
- Adapt faster than they can adjust`,
      aggression: 0.65,
      tightness: 0.5,
      bluffFreq: 0.2,
      riskTolerance: 0.6,
      thinkTimeMs: [800, 1800],
    },
  },

  // ============================================================
  // Ollama Local Models
  // ============================================================
  {
    id: 'ollama-llama',
    displayName: 'Llama 3.3',
    provider: 'ollama',
    modelId: 'llama3.3:70b',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    enabled: false,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Llama 3.3 70B via Ollama. Loose-aggressive gambler — plays many pots, applies relentless pressure.',
      style: 'loose-aggressive',
      systemPrompt: `You are a loose-aggressive poker player named "Llama". You are fearless and unpredictable.

Your strategy:
- Play a wide range of hands, especially in position
- Bet and raise more than you call — aggression is your weapon
- Bluff frequently on scare cards
- Semi-bluff aggressively with draws
- Apply maximum pressure on tight players`,
      aggression: 0.85,
      tightness: 0.3,
      bluffFreq: 0.28,
      riskTolerance: 0.8,
      thinkTimeMs: [1500, 3500],
    },
  },

  // ============================================================
  // Cloud Models (require API key)
  // ============================================================
  {
    id: 'claude-cloud',
    displayName: 'Claude',
    provider: 'openrouter',
    modelId: 'anthropic/claude-sonnet-4-20250514',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    enabled: false,
    status: 'unchecked',
    transparency: 'summary',
    personality: {
      description: 'Claude Sonnet 4 via cloud. Methodical and analytical — precise calculations, excellent hand reading.',
      style: 'tight-aggressive',
      systemPrompt: `You are a methodical, analytical poker player named "Claude". You are known for precise calculations and excellent hand reading.

Your strategy:
- Carefully select starting hands based on position
- Calculate pot odds and implied odds precisely
- Read opponent betting patterns to narrow their range
- Make value bets that extract maximum chips
- Bluff selectively — only when the story makes sense
- Fold without ego when the math says you're behind`,
      aggression: 0.6,
      tightness: 0.7,
      bluffFreq: 0.12,
      riskTolerance: 0.4,
      thinkTimeMs: [1000, 2500],
    },
  },
  {
    id: 'gpt-cloud',
    displayName: 'GPT-4o',
    provider: 'openrouter',
    modelId: 'openai/gpt-4o',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    enabled: false,
    status: 'unchecked',
    transparency: 'summary',
    personality: {
      description: 'GPT-4o via cloud. Aggressive maniac — sees patterns others miss, sometimes overplays.',
      style: 'maniac',
      systemPrompt: `You are an aggressive, creative poker player named "GPT". You thrive on chaos and unpredictability.

Your strategy:
- Open-raise a very wide range
- 3-bet light frequently
- Continuation bet aggressively on most flops
- Double and triple barrel as bluffs
- Overbet for value with strong hands
- The goal is to make opponents uncomfortable`,
      aggression: 0.9,
      tightness: 0.25,
      bluffFreq: 0.3,
      riskTolerance: 0.85,
      thinkTimeMs: [800, 2000],
    },
  },
  {
    id: 'gemini-cloud',
    displayName: 'Gemini Flash',
    provider: 'openrouter',
    modelId: 'google/gemini-2.5-flash',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    enabled: false,
    status: 'unchecked',
    transparency: 'summary',
    personality: {
      description: 'Gemini 2.5 Flash via cloud. The rock — extremely patient, only premium hands.',
      style: 'tight-passive',
      systemPrompt: `You are a patient, conservative poker player named "Gemini". Tight is right.

Your strategy:
- Only play premium starting hands (top 15%)
- Prefer calling over raising
- Rarely bluff — your tight image gives bluffs credibility
- Extract maximum value with measured bets
- Fold to aggression unless very strong
- Patience is your greatest weapon`,
      aggression: 0.3,
      tightness: 0.85,
      bluffFreq: 0.05,
      riskTolerance: 0.25,
      thinkTimeMs: [600, 1500],
    },
  },
];

// ============================================================
// Provider Health Check
// ============================================================

export async function checkProviderHealth(driver: BotDriver): Promise<DriverStatus> {
  try {
    const url = `${driver.baseUrl}/models`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (driver.apiKey) headers['Authorization'] = `Bearer ${driver.apiKey}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(3000) });
    return res.ok ? 'connected' : 'error';
  } catch {
    return 'disconnected';
  }
}

// ============================================================
// Model Warmup — Keep model loaded in memory
// ============================================================

export interface WarmupResult {
  success: boolean;
  loadTimeMs: number;
  inferenceTimeMs: number;
  error?: string;
}

/** Send a minimal prompt to warm up the model and keep it in memory */
export async function warmupModel(driver: BotDriver): Promise<WarmupResult> {
  const startTime = Date.now();
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (driver.apiKey) headers['Authorization'] = `Bearer ${driver.apiKey}`;

  const url = `${driver.baseUrl}/chat/completions`;
  const body = {
    model: driver.modelId,
    messages: [{ role: 'user', content: 'Say "ready" in one word.' }],
    temperature: 0,
    max_tokens: 5,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      // No timeout — let it load fully
    });

    const inferenceTime = Date.now() - startTime;

    if (!res.ok) {
      return { success: false, loadTimeMs: 0, inferenceTimeMs: inferenceTime, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const totalTime = Date.now() - startTime;
    
    return {
      success: true,
      loadTimeMs: totalTime - (data.usage?.completion_tokens ?? 0) * 50, // rough estimate
      inferenceTimeMs: totalTime,
    };
  } catch (err) {
    return {
      success: false,
      loadTimeMs: 0,
      inferenceTimeMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/** Periodic keepalive to prevent model unload (call every 60s or so) */
export async function keepaliveModel(driver: BotDriver): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (driver.apiKey) headers['Authorization'] = `Bearer ${driver.apiKey}`;

    // Just hit /models endpoint — lightweight, keeps connection alive
    const res = await fetch(`${driver.baseUrl}/models`, { 
      headers, 
      signal: AbortSignal.timeout(5000) 
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================
// AI Model Inference
// ============================================================

export interface InferenceRequest {
  driver: BotDriver;
  gamePrompt: string;
  /** Session ID for conversation context */
  sessionId?: string;
}

export interface InferenceResponse {
  action: { type: string; amount?: number };
  reasoning: string;
  handAssessment: string;
  rawResponse: string;
  tokens?: { prompt: number; completion: number };
  inferenceTimeMs: number;
}

import { getSettings } from '../game-config';
import { getActiveModelId, recordActivity } from '../model-session';
import { 
  getOrCreateBotSession, 
  getMessagesForCall, 
  recordDecision,
  type BotSession,
} from '../bot-session';
import { uuid } from '../uuid';

/** Call an OpenAI-compatible API to get a poker decision */
export async function callModel(req: InferenceRequest): Promise<InferenceResponse> {
  const { driver, gamePrompt, sessionId } = req;
  const startTime = Date.now();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (driver.apiKey) headers['Authorization'] = `Bearer ${driver.apiKey}`;

  // Ollama and LM Studio both support /v1/chat/completions
  const url = `${driver.baseUrl}/chat/completions`;

  // For LM Studio: use the currently loaded model to avoid model swapping
  let modelId = driver.modelId;
  if (driver.provider === 'lmstudio') {
    const activeModel = getActiveModelId();
    if (activeModel) {
      modelId = activeModel;
    }
  }

  // Build messages: use session history if available, otherwise fresh context
  let messages: { role: string; content: string }[];
  if (sessionId) {
    messages = getMessagesForCall(sessionId, gamePrompt);
  } else {
    messages = [
      { role: 'system', content: driver.personality.systemPrompt },
      { role: 'user', content: gamePrompt },
    ];
  }

  const body: Record<string, unknown> = {
    model: modelId,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
  };

  // Only add response_format for providers known to support it
  if (driver.provider === 'openai' || driver.provider === 'openrouter') {
    body.response_format = { type: 'json_object' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: getSettings().aiTimeoutMs > 0 ? AbortSignal.timeout(getSettings().aiTimeoutMs) : undefined,
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const inferenceTimeMs = Date.now() - startTime;
    const message = data.choices?.[0]?.message;
    // Some models (e.g. Nemotron) put output in reasoning_content instead of content
    const content = message?.content || message?.reasoning_content || '';
    const usage = data.usage;

    // Record activity to prevent model unload
    recordActivity();

    // Record decision in session history for context continuity
    if (sessionId) {
      recordDecision(sessionId, gamePrompt, content);
    }

    // Parse the JSON response
    const parsed = parseModelResponse(content);

    return {
      action: parsed.action,
      reasoning: parsed.reasoning,
      handAssessment: parsed.handAssessment,
      rawResponse: content,
      tokens: usage ? { prompt: usage.prompt_tokens, completion: usage.completion_tokens } : undefined,
      inferenceTimeMs,
    };
  } catch (err) {
    return {
      action: { type: 'fold' },
      reasoning: `Model call failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      handAssessment: 'Unable to assess',
      rawResponse: '',
      inferenceTimeMs: Date.now() - startTime,
    };
  }
}

/** Parse model response into a structured decision */
function parseModelResponse(content: string): {
  action: { type: string; amount?: number };
  reasoning: string;
  handAssessment: string;
} {
  try {
    // Try JSON parse first
    const json = JSON.parse(content);
    return {
      action: {
        type: normalizeAction(json.action ?? json.type ?? 'fold'),
        amount: json.amount ?? json.bet_amount ?? json.raise_amount,
      },
      reasoning: json.reasoning ?? json.thought ?? json.explanation ?? '',
      handAssessment: json.hand_assessment ?? json.hand_strength ?? json.assessment ?? '',
    };
  } catch {
    // Fallback: try to extract action from text
    const lower = content.toLowerCase();
    let type = 'fold';
    if (lower.includes('raise') || lower.includes('bet')) type = 'raise';
    else if (lower.includes('call')) type = 'call';
    else if (lower.includes('check')) type = 'check';
    else if (lower.includes('all-in') || lower.includes('all in') || lower.includes('allin')) type = 'all_in';

    return {
      action: { type },
      reasoning: content.slice(0, 200),
      handAssessment: 'Parsed from text',
    };
  }
}

function normalizeAction(action: string): string {
  const lower = action.toLowerCase().replace(/[^a-z_]/g, '');
  const map: Record<string, string> = {
    fold: 'fold', check: 'check', call: 'call',
    bet: 'bet', raise: 'raise',
    allin: 'all_in', all_in: 'all_in',
  };
  return map[lower] ?? 'fold';
}

// ============================================================
// Game Prompt Builder
// ============================================================

export interface GameContext {
  holeCards: { rank: number; suit: string }[];
  communityCards: { rank: number; suit: string }[];
  pot: number;
  currentBet: number;
  myBet: number;
  myStack: number;
  phase: string;
  position: string;
  players: { name: string; stack: number; bet: number; folded: boolean; allIn: boolean; isBot: boolean }[];
  validActions: { type: string; minAmount?: number; maxAmount?: number }[];
  handNumber: number;
  blinds: { small: number; big: number };
}

const RANK_NAMES: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
  9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};
const SUIT_NAMES: Record<string, string> = { h: 'h', d: 'd', c: 'c', s: 's' };

export function buildGamePrompt(ctx: GameContext): string {
  const holeStr = ctx.holeCards.map((c) => `${RANK_NAMES[c.rank]}${SUIT_NAMES[c.suit]}`).join(' ');
  const comStr = ctx.communityCards.length > 0
    ? ctx.communityCards.map((c) => `${RANK_NAMES[c.rank]}${SUIT_NAMES[c.suit]}`).join(' ')
    : '(none yet)';

  const playerLines = ctx.players
    .map((p) => {
      let status = '';
      if (p.folded) status = ' [FOLDED]';
      else if (p.allIn) status = ' [ALL-IN]';
      return `  - ${p.name}: stack=$${p.stack}, bet=$${p.bet}${status}`;
    })
    .join('\n');

  const actionLines = ctx.validActions
    .map((a) => {
      if (a.minAmount !== undefined) return `  - ${a.type} ($${a.minAmount}–$${a.maxAmount})`;
      return `  - ${a.type}`;
    })
    .join('\n');

  return `POKER HAND #${ctx.handNumber}
Street: ${ctx.phase.toUpperCase()}
Blinds: $${ctx.blinds.small}/$${ctx.blinds.big}
Position: ${ctx.position}

YOUR HOLE CARDS: ${holeStr}
COMMUNITY CARDS: ${comStr}

POT: $${ctx.pot}
CURRENT BET TO MATCH: $${ctx.currentBet}
YOUR CURRENT BET: $${ctx.myBet}
YOUR STACK: $${ctx.myStack}

PLAYERS:
${playerLines}

YOUR VALID ACTIONS:
${actionLines}

Respond with a JSON object:
{
  "action": "fold|check|call|bet|raise|all_in",
  "amount": <number if bet or raise>,
  "reasoning": "<your step-by-step thought process>",
  "hand_assessment": "<brief assessment of your hand strength>"
}`;
}
