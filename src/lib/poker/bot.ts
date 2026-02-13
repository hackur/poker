import type { GameState, PlayerAction, ValidAction, Card } from './types';
import { evaluateHand } from './hand-eval';
import { HandRank } from './types';
import type { BotDriver, BotDecision, GameContext } from './bot-drivers';
import { callModel, buildGamePrompt } from './bot-drivers';
import { uuid } from '../uuid';
import { 
  deliberate, 
  shouldUseQuickMode, 
  QUICK_DELIBERATION, 
  DEFAULT_DELIBERATION,
  type DeliberationResult,
} from './deliberation';
import { getSettings } from '../game-config';

// ============================================================
// Bot Engine — Hybrid rule-based + AI model integration
//
// For each bot:
//   1. If driver is connected → call AI model for decision
//   2. If model fails or driver disconnected → fall back to rule-based
//   3. All decisions logged with full transparency
// ============================================================

export interface BotProfile {
  name: string;
  model: string;
  aggression: number;
  tightness: number;
  bluffFreq: number;
  /** Optional AI driver for model-backed decisions */
  driver?: BotDriver;
}

export const BOT_PROFILES: BotProfile[] = [
  { name: 'Claude', model: 'Claude Sonnet 4', aggression: 0.6, tightness: 0.7, bluffFreq: 0.15 },
  { name: 'GPT', model: 'GPT-4o', aggression: 0.8, tightness: 0.4, bluffFreq: 0.25 },
  { name: 'Gemini', model: 'Gemini 2.5 Flash', aggression: 0.3, tightness: 0.8, bluffFreq: 0.05 },
  { name: 'Llama', model: 'Llama 3.3 70B', aggression: 0.5, tightness: 0.3, bluffFreq: 0.1 },
  { name: 'Haiku', model: 'Claude Haiku', aggression: 0.5, tightness: 0.5, bluffFreq: 0.1 },
];

/** 
 * Decision log — now stored in the GameInstance (passed as parameter)
 * to work with Cloudflare edge runtime (no globalThis persistence)
 */
export function getDecisionLog(decisions: BotDecision[]): BotDecision[] {
  return decisions;
}

export function clearDecisionLog(decisions: BotDecision[]): void {
  decisions.length = 0;
}

function logDecision(decisions: BotDecision[], decision: BotDecision): void {
  decisions.unshift(decision); // Newest first
  if (decisions.length > 100) decisions.pop();
}

// ============================================================
// Main Entry Point
// ============================================================

/** Compute a bot's action — uses multi-turn deliberation if enabled */
export async function computeBotActionAsync(
  state: GameState,
  playerId: string,
  profile: BotProfile,
  validActions: ValidAction[],
  decisions: BotDecision[] = [],
): Promise<PlayerAction> {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || validActions.length === 0) return { type: 'fold' };

  const settings = getSettings();

  // Try AI model if driver is available and connected (and not forced rule-based)
  if (!settings.forceRuleBased && profile.driver && profile.driver.enabled && profile.driver.status === 'connected') {
    try {
      const gameCtx = buildGameContext(state, playerId, validActions);
      const settings = getSettings();
      
      // Use deliberation if enabled
      if (settings.deliberationEnabled) {
        const config = shouldUseQuickMode(gameCtx) ? QUICK_DELIBERATION : DEFAULT_DELIBERATION;
        const result = await deliberate(
          profile.driver,
          player.sessionId,
          gameCtx,
          config,
        );
        
        // Validate the action is legal
        const action = validateAction(result.finalAction, validActions);
        
        // Build reasoning from deliberation steps
        const deliberationSummary = result.steps
          .map(s => `[${s.question}] ${s.response.slice(0, 150)}...`)
          .join('\n\n');

        logDecision(decisions, {
          decisionId: uuid(),
          botId: playerId,
          botName: profile.name,
          modelId: profile.driver.modelId,
          provider: profile.driver.provider,
          sessionId: player.sessionId,
          prompt: `[Deliberation: ${result.steps.length} steps]`,
          rawResponse: result.rawFinalResponse,
          action,
          reasoning: deliberationSummary,
          handAssessment: `Confidence: ${result.confidence}/10`,
          inferenceTimeMs: result.totalDurationMs,
          isFallback: false,
          timestamp: Date.now(),
          handNumber: state.handNumber,
          gameId: state.id,
          gameUuid: state.gameId,
          handUuid: state.handId,
          street: state.phase,
          deliberation: result, // Include full deliberation for debug panel
        });

        // Apply occasional human-like mistakes
        const mistake = maybeApplyMistake(action, validActions, profile, state, playerId);
        if (mistake.wasMistake) {
          logDecision(decisions, {
            decisionId: uuid(),
            botId: playerId,
            botName: profile.name,
            modelId: profile.driver.modelId,
            provider: profile.driver.provider,
            sessionId: player.sessionId,
            prompt: '(mistake override)',
            rawResponse: '',
            action: mistake.action,
            reasoning: `🎭 MISTAKE: ${mistake.mistakeType} — original was ${action.type}${action.amount ? ` $${action.amount}` : ''}`,
            handAssessment: 'Human-like error',
            inferenceTimeMs: 0,
            isFallback: false,
            timestamp: Date.now(),
            handNumber: state.handNumber,
            gameId: state.id,
            gameUuid: state.gameId,
            handUuid: state.handId,
            street: state.phase,
          });
          return mistake.action;
        }
        return action;
      }
      
      // Single-shot mode (deliberation disabled)
      const prompt = buildGamePrompt(gameCtx);
      const result = await callModel({ 
        driver: profile.driver, 
        gamePrompt: prompt,
        sessionId: player.sessionId,
      });

      const action = validateAction(result.action, validActions);

      logDecision(decisions, {
        decisionId: uuid(),
        botId: playerId,
        botName: profile.name,
        modelId: profile.driver.modelId,
        provider: profile.driver.provider,
        sessionId: player.sessionId,
        prompt,
        rawResponse: result.rawResponse,
        action,
        reasoning: result.reasoning,
        handAssessment: result.handAssessment,
        inferenceTimeMs: result.inferenceTimeMs,
        tokens: result.tokens,
        isFallback: false,
        timestamp: Date.now(),
        handNumber: state.handNumber,
        gameId: state.id,
        gameUuid: state.gameId,
        handUuid: state.handId,
        street: state.phase,
      });

      // Apply occasional human-like mistakes
      const mistake2 = maybeApplyMistake(action, validActions, profile, state, playerId);
      if (mistake2.wasMistake) {
        logDecision(decisions, {
          decisionId: uuid(),
          botId: playerId,
          botName: profile.name,
          modelId: profile.driver.modelId,
          provider: profile.driver.provider,
          sessionId: player.sessionId,
          prompt: '(mistake override)',
          rawResponse: '',
          action: mistake2.action,
          reasoning: `🎭 MISTAKE: ${mistake2.mistakeType} — original was ${action.type}${action.amount ? ` $${action.amount}` : ''}`,
          handAssessment: 'Human-like error',
          inferenceTimeMs: 0,
          isFallback: false,
          timestamp: Date.now(),
          handNumber: state.handNumber,
          gameId: state.id,
          gameUuid: state.gameId,
          handUuid: state.handId,
          street: state.phase,
        });
        return mistake2.action;
      }
      return action;
    } catch (err) {
      console.warn(`[Bot] AI model failed for ${profile.name}, falling back to rule-based:`, err);
    }
  }

  // Fall back to rule-based
  const action = computeBotActionSync(state, playerId, profile, validActions);

  logDecision(decisions, {
    decisionId: uuid(),
    botId: playerId,
    botName: profile.name,
    modelId: profile.model,
    provider: profile.driver?.provider ?? 'lmstudio',
    sessionId: player.sessionId,
    prompt: '(rule-based — no model call)',
    rawResponse: '',
    action,
    reasoning: describeRuleBasedReasoning(state, player, profile, action),
    handAssessment: describeHandStrength(player.holeCards, state.communityCards, state.phase),
    inferenceTimeMs: 0,
    isFallback: true,
    timestamp: Date.now(),
    handNumber: state.handNumber,
    gameId: state.id,
    gameUuid: state.gameId,
    handUuid: state.handId,
    street: state.phase,
  });

  return action;
}

/** Synchronous rule-based fallback (used when no AI driver or as default) */
export function computeBotAction(
  state: GameState,
  playerId: string,
  profile: BotProfile,
  validActions: ValidAction[],
  decisions: BotDecision[] = [],
): PlayerAction {
  const player = state.players.find((p) => p.id === playerId);
  const action = computeBotActionSync(state, playerId, profile, validActions);

  if (player) {
    logDecision(decisions, {
      decisionId: uuid(),
      botId: playerId,
      botName: profile.name,
      modelId: profile.model,
      provider: profile.driver?.provider ?? 'lmstudio',
      sessionId: player.sessionId,
      prompt: '(rule-based — no model call)',
      rawResponse: '',
      action,
      reasoning: describeRuleBasedReasoning(state, player, profile, action),
      handAssessment: describeHandStrength(player.holeCards, state.communityCards, state.phase),
      inferenceTimeMs: 0,
      isFallback: true,
      timestamp: Date.now(),
      handNumber: state.handNumber,
      gameId: state.id,
      gameUuid: state.gameId,
      handUuid: state.handId,
      street: state.phase,
    });
  }

  return action;
}

// ============================================================
// Rule-Based Strategy Engine
// ============================================================

function computeBotActionSync(
  state: GameState,
  playerId: string,
  profile: BotProfile,
  validActions: ValidAction[],
): PlayerAction {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || validActions.length === 0) return { type: 'fold' };

  const handStrength = assessHandStrength(player.holeCards, state.communityCards, state.phase);
  const potOdds = calculatePotOdds(state, player.currentBet);

  const effectiveStrength = handStrength + (Math.random() * 0.2 - 0.1) * (1 - profile.tightness);

  const canCheck = validActions.some((a) => a.type === 'check');
  const canCall = validActions.some((a) => a.type === 'call');
  const canBet = validActions.some((a) => a.type === 'bet');
  const canRaise = validActions.some((a) => a.type === 'raise');

  const isBluffing = Math.random() < profile.bluffFreq;

  if (effectiveStrength > 0.7 || isBluffing) {
    if (canRaise) {
      const raiseAction = validActions.find((a) => a.type === 'raise')!;
      return { type: 'raise', amount: calcRaiseSize(raiseAction, effectiveStrength, profile.aggression) };
    }
    if (canBet) {
      const betAction = validActions.find((a) => a.type === 'bet')!;
      return { type: 'bet', amount: calcBetSize(betAction, effectiveStrength, state, profile.aggression) };
    }
  }

  if (effectiveStrength > 0.4 || potOdds > effectiveStrength * 0.5) {
    if (canCall) return { type: 'call' };
    if (canCheck) return { type: 'check' };
  }

  if (canCall && potOdds > 0.3 && effectiveStrength > 0.2) return { type: 'call' };
  if (canCheck) return { type: 'check' };
  return { type: 'fold' };
}

// ============================================================
// Decision Transparency Helpers
// ============================================================

function describeRuleBasedReasoning(
  state: GameState,
  player: { holeCards: Card[]; currentBet: number },
  profile: BotProfile,
  action: PlayerAction,
): string {
  const strength = assessHandStrength(player.holeCards, state.communityCards, state.phase);
  const potOdds = calculatePotOdds(state, player.currentBet);
  const styleName = profile.aggression > 0.7 ? 'aggressive' : profile.aggression > 0.4 ? 'balanced' : 'passive';

  return [
    `[Rule-based ${styleName} strategy]`,
    `Hand strength: ${(strength * 100).toFixed(0)}%`,
    `Pot odds: ${(potOdds * 100).toFixed(0)}%`,
    `Aggression factor: ${profile.aggression.toFixed(2)}`,
    `Tightness factor: ${profile.tightness.toFixed(2)}`,
    `Decision: ${action.type}${action.amount ? ` $${action.amount}` : ''}`,
  ].join('\n');
}

function describeHandStrength(holeCards: Card[], communityCards: Card[], phase: string): string {
  if (phase === 'preflop' || communityCards.length === 0) {
    const s = assessPreflopStrength(holeCards);
    if (s > 0.8) return 'Premium hand (top 10%)';
    if (s > 0.6) return 'Strong hand (top 25%)';
    if (s > 0.4) return 'Playable hand (top 50%)';
    return 'Weak hand (bottom 50%)';
  }
  const hand = evaluateHand([...holeCards, ...communityCards]);
  return `${hand.name} (strength: ${(assessHandStrength(holeCards, communityCards, phase) * 100).toFixed(0)}%)`;
}

// ============================================================
// Hand Evaluation Helpers
// ============================================================

function assessHandStrength(holeCards: Card[], communityCards: Card[], phase: string): number {
  if (phase === 'preflop' || communityCards.length === 0) return assessPreflopStrength(holeCards);

  const hand = evaluateHand([...holeCards, ...communityCards]);
  const rankStrength: Record<number, number> = {
    [HandRank.HIGH_CARD]: 0.15, [HandRank.ONE_PAIR]: 0.35, [HandRank.TWO_PAIR]: 0.55,
    [HandRank.THREE_OF_A_KIND]: 0.65, [HandRank.STRAIGHT]: 0.75, [HandRank.FLUSH]: 0.8,
    [HandRank.FULL_HOUSE]: 0.88, [HandRank.FOUR_OF_A_KIND]: 0.95,
    [HandRank.STRAIGHT_FLUSH]: 0.98, [HandRank.ROYAL_FLUSH]: 1.0,
  };

  const base = rankStrength[hand.rank] ?? 0.1;
  const kickerBonus = (hand.values[0] ?? 7) / 14 * 0.1;
  return Math.min(1, base + kickerBonus);
}

function assessPreflopStrength(cards: Card[]): number {
  if (cards.length < 2) return 0.2;
  const [c1, c2] = cards;
  const high = Math.max(c1.rank, c2.rank);
  const low = Math.min(c1.rank, c2.rank);
  const suited = c1.suit === c2.suit;
  const pair = c1.rank === c2.rank;

  if (pair) {
    if (high >= 13) return 0.9;
    if (high >= 10) return 0.75;
    if (high >= 7) return 0.55;
    return 0.4;
  }

  let strength = (high + low) / 28;
  if (suited) strength += 0.06;
  if (high - low <= 2) strength += 0.04;
  if (high >= 14 && low >= 10) strength += 0.15;

  return Math.min(0.85, Math.max(0.1, strength));
}

function calculatePotOdds(state: GameState, currentBet: number): number {
  const totalPot = state.pots.reduce((sum, p) => sum + p.amount, 0);
  const toCall = state.currentBet - currentBet;
  if (toCall <= 0) return 1;
  return totalPot / (totalPot + toCall);
}

function calcRaiseSize(action: ValidAction, strength: number, aggression: number): number {
  const min = action.minAmount ?? 0;
  const max = action.maxAmount ?? min;
  const fraction = 0.3 + strength * 0.4 + aggression * 0.3;
  return Math.max(min, Math.min(max, Math.round(min + (max - min) * Math.min(1, fraction))));
}

function calcBetSize(action: ValidAction, strength: number, state: GameState, aggression: number): number {
  const min = action.minAmount ?? state.bigBlind;
  const max = action.maxAmount ?? min;
  const pot = state.pots.reduce((sum, p) => sum + p.amount, 0);
  const potFraction = 0.33 + strength * 0.33 + aggression * 0.34;
  return Math.max(min, Math.min(max, Math.round(pot * potFraction)));
}

// ============================================================
// Human-Like Mistakes System
// ============================================================

interface MistakeResult {
  action: PlayerAction;
  wasMistake: boolean;
  mistakeType?: string;
}

/**
 * Occasionally introduce human-like mistakes for realism.
 * Mistakes are more likely when:
 * - The decision is close (marginal spots)
 * - The bot has a loose/aggressive personality
 * - Late in a long session (tilt simulation)
 */
function maybeApplyMistake(
  originalAction: PlayerAction,
  validActions: ValidAction[],
  profile: BotProfile,
  state: GameState,
  playerId: string,
): MistakeResult {
  const settings = getSettings();
  
  // Check if mistakes are enabled
  if (!settings.mistakesEnabled) {
    return { action: originalAction, wasMistake: false };
  }
  
  const freq = settings.mistakeFrequency;
  const severity = settings.mistakeSeverity;
  
  if (freq <= 0 || Math.random() > freq) {
    return { action: originalAction, wasMistake: false };
  }

  // Pick a mistake type based on personality
  const roll = Math.random();
  const player = state.players.find(p => p.id === playerId);
  
  if (roll < 0.3 && originalAction.type === 'fold') {
    // Mistake: hero-call instead of folding (loose players do this more)
    if (Math.random() < (1 - profile.tightness) * severity) {
      const callAction = validActions.find(a => a.type === 'call');
      if (callAction) {
        return { action: { type: 'call' }, wasMistake: true, mistakeType: 'hero-call (should have folded)' };
      }
    }
  } else if (roll < 0.5 && (originalAction.type === 'call' || originalAction.type === 'check')) {
    // Mistake: fold a decent hand (tight players overtighten sometimes)
    if (Math.random() < profile.tightness * severity * 0.5) {
      if (validActions.some(a => a.type === 'fold')) {
        return { action: { type: 'fold' }, wasMistake: true, mistakeType: 'scared fold (had equity)' };
      }
    }
  } else if (roll < 0.7 && (originalAction.type === 'raise' || originalAction.type === 'bet')) {
    // Mistake: missize the bet (too small or too big)
    if (originalAction.amount) {
      const sizing = Math.random() < 0.5 ? 0.4 : 2.2; // min-click or overbet
      const raiseAction = validActions.find(a => a.type === 'raise' || a.type === 'bet');
      if (raiseAction && raiseAction.minAmount && raiseAction.maxAmount) {
        const mistakeAmount = Math.round(originalAction.amount * sizing);
        const clamped = Math.max(raiseAction.minAmount, Math.min(raiseAction.maxAmount, mistakeAmount));
        return {
          action: { type: originalAction.type, amount: clamped },
          wasMistake: true,
          mistakeType: sizing < 1 ? 'min-click (underbet)' : 'overbet (too aggressive)',
        };
      }
    }
  } else if (roll < 0.85) {
    // Mistake: slow-play a strong hand (check instead of bet/raise)
    if ((originalAction.type === 'bet' || originalAction.type === 'raise') && 
        Math.random() < severity * 0.6) {
      const checkAction = validActions.find(a => a.type === 'check');
      if (checkAction) {
        return { action: { type: 'check' }, wasMistake: true, mistakeType: 'slow-play (missed value)' };
      }
      const callAction = validActions.find(a => a.type === 'call');
      if (callAction) {
        return { action: { type: 'call' }, wasMistake: true, mistakeType: 'flat call (missed raise)' };
      }
    }
  }
  // else: no applicable mistake, play normally

  return { action: originalAction, wasMistake: false };
}

// ============================================================
// Validation
// ============================================================

function validateAction(
  modelAction: { type: string; amount?: number },
  validActions: ValidAction[],
): PlayerAction {
  const matchingAction = validActions.find((a) => a.type === modelAction.type);

  if (matchingAction) {
    if (modelAction.amount !== undefined && matchingAction.minAmount !== undefined) {
      const clampedAmount = Math.max(
        matchingAction.minAmount,
        Math.min(matchingAction.maxAmount ?? matchingAction.minAmount, modelAction.amount),
      );
      return { type: modelAction.type as PlayerAction['type'], amount: clampedAmount };
    }
    return { type: modelAction.type as PlayerAction['type'] };
  }

  // Model chose an invalid action — pick the safest valid alternative
  if (validActions.some((a) => a.type === 'check')) return { type: 'check' };
  if (validActions.some((a) => a.type === 'call')) return { type: 'call' };
  return { type: 'fold' };
}

// ============================================================
// Game Context Builder
// ============================================================

function buildGameContext(
  state: GameState,
  playerId: string,
  validActions: ValidAction[],
): GameContext {
  const player = state.players.find((p) => p.id === playerId)!;
  const dealerIdx = state.players.findIndex((p) => p.seat === state.dealerSeat);
  const myIdx = state.players.findIndex((p) => p.id === playerId);

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
    players: state.players.map((p) => ({
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
