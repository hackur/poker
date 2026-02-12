/**
 * Cloudflare Context Helper
 * 
 * Safely access Cloudflare bindings (KV, D1, etc.) in Next.js on Pages.
 * Works in both edge runtime and local development.
 */

// Types for Cloudflare bindings
export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<unknown>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; expiration?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number }[]; list_complete: boolean; cursor?: string }>;
}

export interface CloudflareEnv {
  GAME_STATE?: KVNamespace;
}

/**
 * Get the GAME_STATE KV namespace.
 * 
 * On Cloudflare Pages, KV bindings are available via process.env in edge functions.
 * In local development, returns null (falls back to in-memory).
 */
export function getGameStateKV(): KVNamespace | null {
  // In edge runtime on Cloudflare, bindings are injected into the global scope
  // by the Pages Functions runtime
  try {
    // Check for Cloudflare-specific global binding
    const g = globalThis as { GAME_STATE?: KVNamespace };
    if (g.GAME_STATE) {
      return g.GAME_STATE;
    }
  } catch {
    // Not available
  }

  // In local development, KV is not available
  return null;
}

/**
 * Check if KV is available (running on Cloudflare)
 */
export function hasKV(): boolean {
  return getGameStateKV() !== null;
}
