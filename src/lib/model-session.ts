// ============================================================
// Model Session Manager — Prevents model unloading/reloading
//
// LM Studio unloads models when idle. This manager:
// 1. Detects the currently loaded model
// 2. Routes ALL LM Studio bots to use that model
// 3. Sends periodic keepalive to prevent unloading
// ============================================================

interface ModelSession {
  provider: 'lmstudio' | 'ollama';
  baseUrl: string;
  modelId: string | null;
  lastActivity: number;
  keepaliveInterval: ReturnType<typeof setInterval> | null;
}

interface LoadedModel {
  id: string;
  object: string;
  owned_by: string;
}

// Global session state (survives HMR)
const globalKey = '__modelSession' as const;

function getSession(): ModelSession {
  const g = globalThis as unknown as Record<string, ModelSession>;
  if (!g[globalKey]) {
    g[globalKey] = {
      provider: 'lmstudio',
      baseUrl: 'http://localhost:1234/v1',
      modelId: null,
      lastActivity: 0,
      keepaliveInterval: null,
    };
  }
  return g[globalKey];
}

// ============================================================
// Detect Currently Loaded Model
// ============================================================

export async function detectLoadedModel(baseUrl = 'http://localhost:1234/v1'): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      signal: AbortSignal.timeout(3000),
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const models: LoadedModel[] = data.data ?? [];
    
    // LM Studio returns the currently loaded model(s)
    if (models.length > 0) {
      // Prefer the first model that's actually loaded
      const session = getSession();
      session.modelId = models[0].id;
      session.lastActivity = Date.now();
      console.log(`[ModelSession] Detected loaded model: ${models[0].id}`);
      return models[0].id;
    }
    
    return null;
  } catch (err) {
    console.warn('[ModelSession] Failed to detect model:', err);
    return null;
  }
}

// ============================================================
// Get Active Model ID (for routing requests)
// ============================================================

export function getActiveModelId(): string | null {
  return getSession().modelId;
}

export function setActiveModelId(modelId: string): void {
  const session = getSession();
  session.modelId = modelId;
  session.lastActivity = Date.now();
}

// ============================================================
// Keepalive — Prevents Model Unload
// ============================================================

const KEEPALIVE_INTERVAL_MS = 30_000; // 30 seconds

async function sendKeepalive(): Promise<boolean> {
  const session = getSession();
  if (!session.modelId) return false;
  
  try {
    // Send a minimal completion request to keep model warm
    const res = await fetch(`${session.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: session.modelId,
        messages: [{ role: 'user', content: '.' }],
        max_tokens: 1,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(10000),
    });
    
    if (res.ok) {
      session.lastActivity = Date.now();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function startKeepalive(): void {
  const session = getSession();
  
  // Already running
  if (session.keepaliveInterval) return;
  
  console.log('[ModelSession] Starting keepalive loop');
  
  session.keepaliveInterval = setInterval(async () => {
    const timeSinceActivity = Date.now() - session.lastActivity;
    
    // Only keepalive if there's been recent activity (within 5 minutes)
    // and no activity in the last 25 seconds
    if (timeSinceActivity > 25_000 && timeSinceActivity < 300_000) {
      const ok = await sendKeepalive();
      if (ok) {
        console.log('[ModelSession] Keepalive sent');
      }
    }
  }, KEEPALIVE_INTERVAL_MS);
}

export function stopKeepalive(): void {
  const session = getSession();
  if (session.keepaliveInterval) {
    clearInterval(session.keepaliveInterval);
    session.keepaliveInterval = null;
    console.log('[ModelSession] Stopped keepalive loop');
  }
}

// ============================================================
// Record Activity (call after each inference)
// ============================================================

export function recordActivity(): void {
  getSession().lastActivity = Date.now();
}

// ============================================================
// Initialize Session (call on app load)
// ============================================================

export async function initModelSession(): Promise<string | null> {
  const modelId = await detectLoadedModel();
  if (modelId) {
    startKeepalive();
  }
  return modelId;
}
