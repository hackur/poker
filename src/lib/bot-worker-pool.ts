// ============================================================
// Bot Worker Pool — Concurrent bot execution with shared model
//
// Key concept: All workers share ONE loaded model but each has
// its own session (conversation context). This prevents memory
// overload from loading multiple models.
//
// Architecture:
//   Worker 1 (Session A) ─┐
//   Worker 2 (Session B) ─┼──► Single Model (LM Studio)
//   Worker 3 (Session C) ─┘
//
// Workers are stateless — they process one decision at a time.
// Sessions persist across decisions for context continuity.
// ============================================================

import { uuid } from './uuid';
import { 
  type BotPlayer, 
  getBotPlayerById, 
  botPlayerToDriver 
} from './bot-player';
import { 
  createBotSession, 
  getBotSessionByBotId,
  type BotSession 
} from './bot-session';
import { 
  deliberate, 
  shouldUseQuickMode, 
  QUICK_DELIBERATION,
  type DeliberationResult 
} from './poker/deliberation';
import { 
  callModel, 
  buildGamePrompt, 
  type GameContext,
  type BotDriver,
} from './poker/bot-drivers';
import { getActiveModelId } from './model-session';

// ============================================================
// Worker Types
// ============================================================

export interface BotWorker {
  /** Unique worker ID */
  workerId: string;
  /** Bot player this worker represents */
  botPlayerId: string;
  /** Session ID for conversation context */
  sessionId: string;
  /** Current status */
  status: 'idle' | 'thinking' | 'error';
  /** Last activity timestamp */
  lastActivity: number;
  /** Total decisions made */
  decisionCount: number;
  /** Total inference time (ms) */
  totalInferenceMs: number;
}

export interface WorkerDecisionRequest {
  workerId: string;
  gameContext: GameContext;
  validActions: { type: string; minAmount?: number; maxAmount?: number }[];
}

export interface WorkerDecisionResult {
  workerId: string;
  action: { type: string; amount?: number };
  reasoning: string;
  confidence: number;
  deliberation?: DeliberationResult;
  inferenceTimeMs: number;
  isFallback: boolean;
}

// ============================================================
// Worker Pool Store (globalThis for HMR)
// ============================================================

const POOL_KEY = '__botWorkerPool__';

interface WorkerPoolState {
  workers: Map<string, BotWorker>;
  activeModel: string | null;
  maxConcurrent: number;
  pendingRequests: Map<string, Promise<WorkerDecisionResult>>;
}

function getPool(): WorkerPoolState {
  const g = globalThis as Record<string, unknown>;
  if (!g[POOL_KEY]) {
    g[POOL_KEY] = {
      workers: new Map<string, BotWorker>(),
      activeModel: null,
      maxConcurrent: 1, // Serial by default (single model)
      pendingRequests: new Map<string, Promise<WorkerDecisionResult>>(),
    };
  }
  return g[POOL_KEY] as WorkerPoolState;
}

// ============================================================
// Worker Management
// ============================================================

/**
 * Create a worker for a bot player
 */
export function createWorker(botPlayerId: string): BotWorker {
  const pool = getPool();
  const bot = getBotPlayerById(botPlayerId);
  
  if (!bot) {
    throw new Error(`Bot player not found: ${botPlayerId}`);
  }
  
  // Get or create session for this bot
  let session = getBotSessionByBotId(botPlayerId);
  if (!session) {
    session = createBotSession({
      botId: botPlayerId,
      modelId: bot.model.modelId,
      displayName: bot.displayName,
      systemPrompt: bot.personality.systemPrompt,
    });
  }
  
  const worker: BotWorker = {
    workerId: uuid(),
    botPlayerId,
    sessionId: session.sessionId,
    status: 'idle',
    lastActivity: Date.now(),
    decisionCount: 0,
    totalInferenceMs: 0,
  };
  
  pool.workers.set(worker.workerId, worker);
  console.log(`[WorkerPool] Created worker ${worker.workerId.slice(0, 8)} for ${bot.displayName}`);
  
  return worker;
}

/**
 * Get or create a worker for a bot
 */
export function getOrCreateWorker(botPlayerId: string): BotWorker {
  const pool = getPool();
  
  // Find existing worker for this bot
  for (const worker of pool.workers.values()) {
    if (worker.botPlayerId === botPlayerId) {
      return worker;
    }
  }
  
  return createWorker(botPlayerId);
}

/**
 * Get worker by ID
 */
export function getWorker(workerId: string): BotWorker | undefined {
  return getPool().workers.get(workerId);
}

/**
 * List all workers
 */
export function listWorkers(): BotWorker[] {
  return Array.from(getPool().workers.values());
}

/**
 * Remove a worker
 */
export function removeWorker(workerId: string): boolean {
  return getPool().workers.delete(workerId);
}

/**
 * Clear all workers
 */
export function clearWorkers(): void {
  getPool().workers.clear();
  getPool().pendingRequests.clear();
}

// ============================================================
// Decision Execution
// ============================================================

/**
 * Request a decision from a worker
 * 
 * This is the main entry point. It:
 * 1. Finds the worker
 * 2. Gets the bot's configuration
 * 3. Uses single-model mode (whatever's loaded)
 * 4. Runs deliberation if enabled
 * 5. Returns the decision
 */
export async function requestDecision(
  req: WorkerDecisionRequest
): Promise<WorkerDecisionResult> {
  const pool = getPool();
  const worker = pool.workers.get(req.workerId);
  
  if (!worker) {
    throw new Error(`Worker not found: ${req.workerId}`);
  }
  
  // Check if already processing
  const pendingKey = `${req.workerId}`;
  if (pool.pendingRequests.has(pendingKey)) {
    // Return existing promise (don't double-process)
    return pool.pendingRequests.get(pendingKey)!;
  }
  
  // Mark as thinking
  worker.status = 'thinking';
  worker.lastActivity = Date.now();
  
  // Create and track the promise
  const promise = executeDecision(worker, req);
  pool.pendingRequests.set(pendingKey, promise);
  
  try {
    const result = await promise;
    worker.status = 'idle';
    worker.decisionCount++;
    worker.totalInferenceMs += result.inferenceTimeMs;
    return result;
  } catch (err) {
    worker.status = 'error';
    throw err;
  } finally {
    pool.pendingRequests.delete(pendingKey);
  }
}

/**
 * Internal: Execute the actual decision
 */
async function executeDecision(
  worker: BotWorker,
  req: WorkerDecisionRequest
): Promise<WorkerDecisionResult> {
  const startTime = Date.now();
  const bot = getBotPlayerById(worker.botPlayerId);
  
  if (!bot) {
    return fallbackDecision(worker, req, 'Bot not found');
  }
  
  // Get current active model (single-model mode)
  const activeModel = getActiveModelId();
  if (!activeModel) {
    return fallbackDecision(worker, req, 'No model loaded');
  }
  
  // Build driver with active model (not bot's configured model)
  const driver = botPlayerToDriver(bot) as {
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
    status: 'connected' | 'disconnected' | 'error' | 'unchecked';
    transparency: 'full';
  };
  driver.modelId = activeModel; // Override with active model
  driver.status = 'connected';
  driver.enabled = true;
  
  try {
    // Use deliberation if enabled for this bot
    if (bot.deliberation.enabled) {
      const config = shouldUseQuickMode(req.gameContext) 
        ? { ...QUICK_DELIBERATION, ...bot.deliberation, maxSteps: 1 }
        : bot.deliberation;
      
      const result = await deliberate(
        driver as BotDriver,
        worker.sessionId,
        req.gameContext,
        config,
      );
      
      return {
        workerId: worker.workerId,
        action: validateAction(result.finalAction, req.validActions),
        reasoning: result.steps.map(s => `[${s.question}] ${s.response.slice(0, 100)}...`).join('\n'),
        confidence: result.confidence,
        deliberation: result,
        inferenceTimeMs: Date.now() - startTime,
        isFallback: false,
      };
    }
    
    // Single-shot mode
    const prompt = buildGamePrompt(req.gameContext);
    const result = await callModel({
      driver: driver as BotDriver,
      gamePrompt: prompt,
      sessionId: worker.sessionId,
    });
    
    return {
      workerId: worker.workerId,
      action: validateAction(result.action, req.validActions),
      reasoning: result.reasoning,
      confidence: 7, // Default for single-shot
      inferenceTimeMs: Date.now() - startTime,
      isFallback: false,
    };
    
  } catch (err) {
    console.error(`[WorkerPool] Decision failed for ${bot.displayName}:`, err);
    return fallbackDecision(worker, req, err instanceof Error ? err.message : 'Unknown error');
  }
}

/**
 * Fallback decision using bot personality params
 */
function fallbackDecision(
  worker: BotWorker,
  req: WorkerDecisionRequest,
  reason: string
): WorkerDecisionResult {
  const bot = getBotPlayerById(worker.botPlayerId);
  const personality = bot?.personality ?? {
    aggression: 0.5,
    tightness: 0.5,
    bluffFreq: 0.1,
  };
  
  // Simple rule-based decision
  const canCheck = req.validActions.some(a => a.type === 'check');
  const canCall = req.validActions.some(a => a.type === 'call');
  
  // Conservative fallback: check if free, otherwise fold
  let action: { type: string; amount?: number };
  if (canCheck) {
    action = { type: 'check' };
  } else if (canCall && personality.tightness < 0.8) {
    action = { type: 'call' };
  } else {
    action = { type: 'fold' };
  }
  
  return {
    workerId: worker.workerId,
    action,
    reasoning: `[Fallback: ${reason}] Using conservative rule-based strategy.`,
    confidence: 3,
    inferenceTimeMs: 0,
    isFallback: true,
  };
}

/**
 * Validate action against valid actions
 */
function validateAction(
  action: { type: string; amount?: number },
  validActions: { type: string; minAmount?: number; maxAmount?: number }[]
): { type: string; amount?: number } {
  const matching = validActions.find(a => a.type === action.type);
  
  if (matching) {
    if (action.amount !== undefined && matching.minAmount !== undefined) {
      return {
        type: action.type,
        amount: Math.max(
          matching.minAmount,
          Math.min(matching.maxAmount ?? matching.minAmount, action.amount)
        ),
      };
    }
    return { type: action.type };
  }
  
  // Invalid action — pick safest alternative
  if (validActions.some(a => a.type === 'check')) return { type: 'check' };
  if (validActions.some(a => a.type === 'call')) return { type: 'call' };
  return { type: 'fold' };
}

// ============================================================
// Pool Stats
// ============================================================

export function getPoolStats(): {
  workerCount: number;
  activeWorkers: number;
  totalDecisions: number;
  totalInferenceMs: number;
  avgInferenceMs: number;
  activeModel: string | null;
} {
  const pool = getPool();
  const workers = Array.from(pool.workers.values());
  
  const totalDecisions = workers.reduce((sum, w) => sum + w.decisionCount, 0);
  const totalInference = workers.reduce((sum, w) => sum + w.totalInferenceMs, 0);
  
  return {
    workerCount: workers.length,
    activeWorkers: workers.filter(w => w.status === 'thinking').length,
    totalDecisions,
    totalInferenceMs: totalInference,
    avgInferenceMs: totalDecisions > 0 ? Math.round(totalInference / totalDecisions) : 0,
    activeModel: getActiveModelId(),
  };
}
