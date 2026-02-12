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

/** Decision record — full transparency of bot reasoning */
export interface BotDecision {
  botId: string;
  botName: string;
  modelId: string;
  provider: ProviderType;
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
      description: 'Local Nemotron 3 Nano on M3 Max. Calculative and efficient — uses Mamba-2 architecture for fast sequential reasoning. Tight-aggressive with a focus on pot odds and position.',
      style: 'tight-aggressive',
      systemPrompt: `You are a tight-aggressive poker player named "Nemotron". You are powered by NVIDIA Nemotron 3 Nano running locally.

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
    id: 'nemotron-reasoning',
    displayName: 'Nemotron Deep',
    provider: 'lmstudio',
    modelId: 'nvidia/nemotron-3-nano',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    enabled: true,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Nemotron with reasoning mode enabled. Takes longer but uses chain-of-thought to analyze complex spots. GTO-leaning with deep hand reading.',
      style: 'balanced',
      systemPrompt: `You are a GTO-balanced poker player named "Nemotron Deep". You use deep reasoning to analyze each decision.

Before deciding, always think through:
1. What is my hand strength relative to the board?
2. What range of hands would my opponents play this way?
3. What are my pot odds and implied odds?
4. What is the optimal GTO play here?
5. Are there exploitative adjustments I should make?

Show your reasoning step by step, then choose the mathematically optimal action.`,
      aggression: 0.55,
      tightness: 0.6,
      bluffFreq: 0.15,
      riskTolerance: 0.45,
      thinkTimeMs: [2000, 4000],
    },
  },
  {
    id: 'ollama-local',
    displayName: 'Ollama Bot',
    provider: 'ollama',
    modelId: 'llama3.3:70b',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    enabled: false,
    status: 'unchecked',
    transparency: 'full',
    personality: {
      description: 'Llama 3.3 70B via Ollama. Loose-aggressive gambler — plays many pots and applies pressure with big bets. Will bluff rivers with missed draws.',
      style: 'loose-aggressive',
      systemPrompt: `You are a loose-aggressive poker player named "Llama". You are fearless and unpredictable.

Your strategy:
- Play a wide range of hands, especially in position
- Bet and raise more than you call — aggression is your weapon
- Bluff frequently on scare cards and when you sense weakness
- Semi-bluff aggressively with draws
- Apply maximum pressure on tight players
- Don't be afraid to fire three barrels as a bluff`,
      aggression: 0.85,
      tightness: 0.3,
      bluffFreq: 0.28,
      riskTolerance: 0.8,
      thinkTimeMs: [1500, 3500],
    },
  },
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
      description: 'Claude Sonnet 4 via cloud API. Methodical and analytical — excels at reading opponents and making mathematically sound decisions. Rarely bluffs but devastating when it does.',
      style: 'tight-aggressive',
      systemPrompt: `You are a methodical, analytical poker player named "Claude". You are known for precise calculations and excellent hand reading.

Your strategy:
- Carefully select starting hands based on position and table dynamics
- Calculate pot odds and implied odds precisely
- Read opponent betting patterns to narrow their range
- Make value bets that extract maximum chips from weaker hands
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
    displayName: 'GPT',
    provider: 'openrouter',
    modelId: 'openai/gpt-4o',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    enabled: false,
    status: 'unchecked',
    transparency: 'summary',
    personality: {
      description: 'GPT-4o via cloud API. Aggressive and creative — sees patterns others miss, but sometimes overplays weak hands. The "maniac at the table" persona.',
      style: 'maniac',
      systemPrompt: `You are an aggressive, creative poker player named "GPT". You thrive on chaos and unpredictability.

Your strategy:
- Open-raise a very wide range from any position
- 3-bet light frequently to steal pots preflop
- Continuation bet aggressively on most flops
- Double and triple barrel as bluffs on favorable runouts
- Overbet for value with strong hands
- Mix in overbets as bluffs to be unexploitable
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
    displayName: 'Gemini',
    provider: 'openrouter',
    modelId: 'google/gemini-2.5-flash',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: '',
    enabled: false,
    status: 'unchecked',
    transparency: 'summary',
    personality: {
      description: 'Gemini 2.5 Flash via cloud API. The "rock" — extremely patient, only plays premium hands but extracts max value. You won\'t see many showdowns, but when you do, Gemini has the goods.',
      style: 'tight-passive',
      systemPrompt: `You are a patient, conservative poker player named "Gemini". You are the definition of "tight is right".

Your strategy:
- Only play premium starting hands (top 15% of range)
- Prefer calling over raising — let opponents make mistakes
- Rarely bluff — your image is so tight that bluffs have maximum credibility (save them for key spots)
- When you have a strong hand, extract maximum value with measured bets
- Fold to aggression unless you have a very strong hand
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
// AI Model Inference
// ============================================================

export interface InferenceRequest {
  driver: BotDriver;
  gamePrompt: string;
}

export interface InferenceResponse {
  action: { type: string; amount?: number };
  reasoning: string;
  handAssessment: string;
  rawResponse: string;
  tokens?: { prompt: number; completion: number };
  inferenceTimeMs: number;
}

/** Call an OpenAI-compatible API to get a poker decision */
export async function callModel(req: InferenceRequest): Promise<InferenceResponse> {
  const { driver, gamePrompt } = req;
  const startTime = Date.now();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (driver.apiKey) headers['Authorization'] = `Bearer ${driver.apiKey}`;

  // Ollama and LM Studio both support /v1/chat/completions
  const url = `${driver.baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: driver.modelId,
    messages: [
      { role: 'system', content: driver.personality.systemPrompt },
      { role: 'user', content: gamePrompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
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
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const inferenceTimeMs = Date.now() - startTime;
    const content = data.choices?.[0]?.message?.content ?? '';
    const usage = data.usage;

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
