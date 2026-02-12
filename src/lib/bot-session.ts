// ============================================================
// Bot Session Manager — Isolated conversation contexts per bot
//
// Each bot gets a unique session with:
// - Conversation history (for context continuity)
// - Session ID (for tracking)
// - Model assignment (same model can have multiple sessions)
// ============================================================

import { uuid } from './uuid';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BotSession {
  /** Unique session ID */
  sessionId: string;
  /** Bot/player ID this session belongs to */
  botId: string;
  /** Model being used */
  modelId: string;
  /** Bot display name */
  displayName: string;
  /** System prompt for this bot */
  systemPrompt: string;
  /** Conversation history */
  messages: ChatMessage[];
  /** Max messages to retain (rolling window) */
  maxMessages: number;
  /** Created timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Total decisions made */
  decisionCount: number;
}

// Global session store (survives HMR)
const KEY = '__botSessions__';
function store(): Map<string, BotSession> {
  const g = globalThis as Record<string, unknown>;
  if (!(g[KEY] instanceof Map)) g[KEY] = new Map();
  return g[KEY] as Map<string, BotSession>;
}

// ============================================================
// Session Management
// ============================================================

/**
 * Create a new bot session
 */
export function createBotSession(opts: {
  botId: string;
  modelId: string;
  displayName: string;
  systemPrompt: string;
  maxMessages?: number;
}): BotSession {
  const session: BotSession = {
    sessionId: uuid(),
    botId: opts.botId,
    modelId: opts.modelId,
    displayName: opts.displayName,
    systemPrompt: opts.systemPrompt,
    messages: [],
    maxMessages: opts.maxMessages ?? 20, // Keep last 20 exchanges
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    decisionCount: 0,
  };
  
  store().set(session.sessionId, session);
  console.log(`[BotSession] Created session ${session.sessionId.slice(0, 8)} for ${opts.displayName}`);
  return session;
}

/**
 * Get session by ID
 */
export function getBotSession(sessionId: string): BotSession | undefined {
  return store().get(sessionId);
}

/**
 * Get session by bot ID (returns first match)
 */
export function getBotSessionByBotId(botId: string): BotSession | undefined {
  for (const session of store().values()) {
    if (session.botId === botId) return session;
  }
  return undefined;
}

/**
 * Get or create session for a bot
 */
export function getOrCreateBotSession(opts: {
  botId: string;
  modelId: string;
  displayName: string;
  systemPrompt: string;
}): BotSession {
  const existing = getBotSessionByBotId(opts.botId);
  if (existing) {
    // Update model if changed
    if (existing.modelId !== opts.modelId) {
      existing.modelId = opts.modelId;
      existing.messages = []; // Clear history on model change
      console.log(`[BotSession] Model changed for ${opts.displayName}, clearing history`);
    }
    return existing;
  }
  return createBotSession(opts);
}

/**
 * Add a message to the session's history
 */
export function addMessage(sessionId: string, message: ChatMessage): void {
  const session = store().get(sessionId);
  if (!session) return;
  
  session.messages.push(message);
  session.lastActivityAt = Date.now();
  
  // Trim to max messages (keeping system prompt implied)
  while (session.messages.length > session.maxMessages) {
    session.messages.shift();
  }
}

/**
 * Record a decision (user prompt + assistant response)
 */
export function recordDecision(
  sessionId: string,
  prompt: string,
  response: string
): void {
  const session = store().get(sessionId);
  if (!session) return;
  
  addMessage(sessionId, { role: 'user', content: prompt });
  addMessage(sessionId, { role: 'assistant', content: response });
  session.decisionCount++;
}

/**
 * Get messages for API call (includes system prompt)
 */
export function getMessagesForCall(sessionId: string, newPrompt: string): ChatMessage[] {
  const session = store().get(sessionId);
  if (!session) return [{ role: 'user', content: newPrompt }];
  
  return [
    { role: 'system', content: session.systemPrompt },
    ...session.messages,
    { role: 'user', content: newPrompt },
  ];
}

/**
 * Clear a session's history (but keep the session)
 */
export function clearSessionHistory(sessionId: string): void {
  const session = store().get(sessionId);
  if (session) {
    session.messages = [];
    console.log(`[BotSession] Cleared history for session ${sessionId.slice(0, 8)}`);
  }
}

/**
 * Delete a session entirely
 */
export function deleteBotSession(sessionId: string): boolean {
  return store().delete(sessionId);
}

/**
 * Delete all sessions for a bot
 */
export function deleteBotSessions(botId: string): number {
  let count = 0;
  for (const [id, session] of store()) {
    if (session.botId === botId) {
      store().delete(id);
      count++;
    }
  }
  return count;
}

/**
 * List all sessions
 */
export function listBotSessions(): BotSession[] {
  return Array.from(store().values());
}

/**
 * Get session stats
 */
export function getSessionStats(): {
  totalSessions: number;
  totalDecisions: number;
  oldestSession: number | null;
  newestSession: number | null;
} {
  const sessions = Array.from(store().values());
  return {
    totalSessions: sessions.length,
    totalDecisions: sessions.reduce((sum, s) => sum + s.decisionCount, 0),
    oldestSession: sessions.length > 0 
      ? Math.min(...sessions.map(s => s.createdAt)) 
      : null,
    newestSession: sessions.length > 0 
      ? Math.max(...sessions.map(s => s.createdAt)) 
      : null,
  };
}
