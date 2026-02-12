// ============================================================
// Deliberation System — Multi-turn self-questioning before decisions
//
// Instead of a single prompt → response, bots go through an internal
// dialogue asking themselves poker questions before deciding.
// ============================================================

import type { BotDriver, GameContext } from './bot-drivers';
import { getActiveModelId, recordActivity } from '../model-session';
import { getMessagesForCall, recordDecision, addMessage } from '../bot-session';
import { getSettings } from '../game-config';

// ============================================================
// Deliberation Configuration
// ============================================================

export interface DeliberationConfig {
  /** Enable multi-turn deliberation */
  enabled: boolean;
  /** Maximum deliberation steps before final decision */
  maxSteps: number;
  /** Which question types to ask (in order) */
  questions: QuestionType[];
  /** Timeout per deliberation step (ms) */
  stepTimeoutMs: number;
}

export type QuestionType =
  | 'hand_strength'      // What do I have?
  | 'position'           // How does my position affect this?
  | 'opponent_range'     // What could they have?
  | 'pot_odds'           // Is calling profitable?
  | 'player_style'       // How should MY style influence this?
  | 'bluff_check'        // Is this a good spot to bluff?
  | 'trap_check'         // Should I slow-play?
  | 'final_decision';    // Make the call

export const DEFAULT_DELIBERATION: DeliberationConfig = {
  enabled: true,
  maxSteps: 3,
  questions: ['hand_strength', 'opponent_range', 'player_style'],
  stepTimeoutMs: 5000,
};

// ============================================================
// Question Templates
// ============================================================

const QUESTION_PROMPTS: Record<QuestionType, (ctx: GameContext) => string> = {
  hand_strength: (ctx) => `
Look at your hole cards and the board. Be honest with yourself:
- What is your actual hand right now?
- What draws do you have?
- On a scale of 1-10, how strong is your hand?

Think step by step.`,

  position: (ctx) => `
Consider your position: ${ctx.position}
- How many players act after you?
- Can you use position to your advantage here?
- Does your position change your preferred action?

Be specific about position's impact.`,

  opponent_range: (ctx) => {
    const activePlayers = ctx.players.filter(p => !p.folded && p.name !== 'You');
    const bettors = activePlayers.filter(p => p.bet > 0);
    return `
Based on the action so far, estimate opponent ranges:
${bettors.map(p => `- ${p.name} bet $${p.bet}`).join('\n')}

What hands would make these bets? Consider:
- Strong value hands
- Draws and semi-bluffs  
- Pure bluffs

Narrow down the likely holdings.`;
  },

  pot_odds: (ctx) => {
    const toCall = ctx.currentBet - ctx.myBet;
    const potOdds = toCall > 0 ? (ctx.pot / (ctx.pot + toCall) * 100).toFixed(1) : '100';
    return `
Calculate whether calling is profitable:
- Pot: $${ctx.pot}
- To call: $${toCall}
- Pot odds: ${potOdds}%

What equity do you need to call profitably? Do you have it?`;
  },

  player_style: (ctx) => `
Remember your playing style and personality. You should play true to your style:
- Are you tight or loose? Aggressive or passive?
- How often do you bluff?
- What would a player with YOUR style do here?

Stay in character. What feels right for YOU?`,

  bluff_check: (ctx) => `
Evaluate this as a potential bluff spot:
- Does the board favor your perceived range?
- Have you shown strength or weakness?
- Would a bet here tell a believable story?
- Is your opponent likely to fold?

Should you bluff here? Why or why not?`,

  trap_check: (ctx) => `
Consider slow-playing:
- Is your hand strong enough to trap?
- Will opponents bet if you check?
- Is the board dangerous (draws)?
- Could you lose value by not betting?

Is trapping the right play here?`,

  final_decision: () => `
Based on everything you've considered, make your final decision.

Respond with JSON:
{
  "action": "fold|check|call|bet|raise|all_in",
  "amount": <number if betting/raising>,
  "reasoning": "<brief summary of your thought process>",
  "confidence": <1-10 how confident you are>
}`,
};

// ============================================================
// Deliberation Record
// ============================================================

export interface DeliberationStep {
  question: QuestionType;
  prompt: string;
  response: string;
  durationMs: number;
}

export interface DeliberationResult {
  steps: DeliberationStep[];
  totalDurationMs: number;
  finalAction: { type: string; amount: number | undefined };
  confidence: number;
  rawFinalResponse: string;
}

// ============================================================
// Deliberation Engine
// ============================================================

export async function deliberate(
  driver: BotDriver,
  sessionId: string | undefined,
  gameContext: GameContext,
  config: DeliberationConfig = DEFAULT_DELIBERATION,
): Promise<DeliberationResult> {
  const startTime = Date.now();
  const steps: DeliberationStep[] = [];
  
  // Build the initial game state prompt
  const gameStatePrompt = buildGameStatePrompt(gameContext);
  
  // Add game state to session if we have one
  if (sessionId) {
    addMessage(sessionId, { role: 'user', content: gameStatePrompt });
    addMessage(sessionId, { role: 'assistant', content: 'I understand the current game state. Let me think through this decision carefully.' });
  }

  // Go through each deliberation question
  for (const questionType of config.questions) {
    if (steps.length >= config.maxSteps) break;
    
    const questionPrompt = QUESTION_PROMPTS[questionType](gameContext);
    const stepStart = Date.now();
    
    try {
      const response = await callDeliberationStep(
        driver,
        sessionId,
        questionPrompt,
        config.stepTimeoutMs,
      );
      
      steps.push({
        question: questionType,
        prompt: questionPrompt,
        response,
        durationMs: Date.now() - stepStart,
      });
      
      // Record in session for context building
      if (sessionId) {
        recordDecision(sessionId, questionPrompt, response);
      }
    } catch (err) {
      console.warn(`[Deliberation] Step ${questionType} failed:`, err);
      // Continue with remaining steps
    }
  }

  // Final decision step
  const finalPrompt = QUESTION_PROMPTS.final_decision(gameContext);
  const finalStart = Date.now();
  
  let rawFinalResponse = '';
  let finalAction = { type: 'fold' as string, amount: undefined as number | undefined };
  let confidence = 5;
  
  try {
    rawFinalResponse = await callDeliberationStep(
      driver,
      sessionId,
      finalPrompt,
      config.stepTimeoutMs,
    );
    
    const parsed = parseDeliberationResponse(rawFinalResponse);
    finalAction = parsed.action;
    confidence = parsed.confidence;
    
    steps.push({
      question: 'final_decision',
      prompt: finalPrompt,
      response: rawFinalResponse,
      durationMs: Date.now() - finalStart,
    });
    
    if (sessionId) {
      recordDecision(sessionId, finalPrompt, rawFinalResponse);
    }
  } catch (err) {
    console.warn('[Deliberation] Final decision failed:', err);
  }

  return {
    steps,
    totalDurationMs: Date.now() - startTime,
    finalAction,
    confidence,
    rawFinalResponse,
  };
}

// ============================================================
// API Call Helper
// ============================================================

async function callDeliberationStep(
  driver: BotDriver,
  sessionId: string | undefined,
  prompt: string,
  timeoutMs: number,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (driver.apiKey) headers['Authorization'] = `Bearer ${driver.apiKey}`;

  const url = `${driver.baseUrl}/chat/completions`;

  // Use active model for LM Studio
  let modelId = driver.modelId;
  if (driver.provider === 'lmstudio') {
    const activeModel = getActiveModelId();
    if (activeModel) modelId = activeModel;
  }

  // Build messages with session context
  let messages: { role: string; content: string }[];
  if (sessionId) {
    messages = getMessagesForCall(sessionId, prompt);
  } else {
    messages = [
      { role: 'system', content: driver.personality.systemPrompt },
      { role: 'user', content: prompt },
    ];
  }

  const body = {
    model: modelId,
    messages,
    temperature: 0.7,
    max_tokens: 512, // Shorter for deliberation steps
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();
  recordActivity();
  
  const message = data.choices?.[0]?.message;
  return message?.content || message?.reasoning_content || '';
}

// ============================================================
// Response Parsing
// ============================================================

function parseDeliberationResponse(content: string): {
  action: { type: string; amount: number | undefined };
  confidence: number;
} {
  try {
    // Try JSON parse
    const json = JSON.parse(content);
    return {
      action: {
        type: normalizeAction(json.action ?? 'fold'),
        amount: json.amount,
      },
      confidence: json.confidence ?? 5,
    };
  } catch {
    // Fallback: extract from text
    const lower = content.toLowerCase();
    let type = 'fold';
    if (lower.includes('raise') || lower.includes('bet')) type = 'raise';
    else if (lower.includes('call')) type = 'call';
    else if (lower.includes('check')) type = 'check';
    else if (lower.includes('all-in') || lower.includes('all in')) type = 'all_in';
    
    return { action: { type, amount: undefined }, confidence: 5 };
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
// Game State Prompt Builder
// ============================================================

const RANK_NAMES: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
  9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};
const SUIT_NAMES: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };

function buildGameStatePrompt(ctx: GameContext): string {
  const holeStr = ctx.holeCards
    .map(c => `${RANK_NAMES[c.rank]}${SUIT_NAMES[c.suit]}`)
    .join(' ');
  const boardStr = ctx.communityCards.length > 0
    ? ctx.communityCards.map(c => `${RANK_NAMES[c.rank]}${SUIT_NAMES[c.suit]}`).join(' ')
    : '(none)';

  const playerLines = ctx.players
    .map(p => {
      let status = '';
      if (p.folded) status = ' [FOLDED]';
      else if (p.allIn) status = ' [ALL-IN]';
      return `  ${p.name}: $${p.stack} (bet: $${p.bet})${status}`;
    })
    .join('\n');

  return `CURRENT SITUATION — Hand #${ctx.handNumber}

Street: ${ctx.phase.toUpperCase()}
Position: ${ctx.position}
Blinds: $${ctx.blinds.small}/$${ctx.blinds.big}

Your cards: ${holeStr}
Board: ${boardStr}

Pot: $${ctx.pot}
To call: $${ctx.currentBet - ctx.myBet}
Your stack: $${ctx.myStack}

Players:
${playerLines}

Valid actions: ${ctx.validActions.map(a => a.type).join(', ')}`;
}

// ============================================================
// Quick Deliberation (fewer steps for simple decisions)
// ============================================================

export function shouldUseQuickMode(ctx: GameContext): boolean {
  // Use quick mode for trivial decisions
  const toCall = ctx.currentBet - ctx.myBet;
  
  // Check is free - no deliberation needed
  if (toCall === 0 && ctx.validActions.some(a => a.type === 'check')) {
    return true;
  }
  
  // Heads-up preflop is simpler
  const activePlayers = ctx.players.filter(p => !p.folded);
  if (activePlayers.length === 2 && ctx.phase === 'preflop') {
    return true;
  }
  
  return false;
}

export const QUICK_DELIBERATION: DeliberationConfig = {
  enabled: true,
  maxSteps: 1,
  questions: ['hand_strength'],
  stepTimeoutMs: 3000,
};
