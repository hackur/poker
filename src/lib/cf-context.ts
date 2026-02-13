/**
 * Cloudflare Context Helper
 * 
 * Safely access Cloudflare bindings (KV, D1, etc.) in Next.js on Pages.
 * Uses @cloudflare/next-on-pages getRequestContext() for proper binding access.
 * Works in both edge runtime and local development.
 */

import { getRequestContext } from '@cloudflare/next-on-pages';

// Types for Cloudflare bindings
export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<unknown>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; expiration?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number }[]; list_complete: boolean; cursor?: string }>;
}

export interface CloudflareEnv {
  GAME_STATE?: KVNamespace;
  [key: string]: unknown;
}

/**
 * Get the GAME_STATE KV namespace.
 * 
 * On Cloudflare Pages, bindings are accessed via getRequestContext() from
 * @cloudflare/next-on-pages — NOT globalThis.
 * In local development, returns null (falls back to in-memory).
 */
export function getGameStateKV(): KVNamespace | null {
  try {
    // Primary: use @cloudflare/next-on-pages request context
    const ctx = getRequestContext();
    const env = ctx?.env as CloudflareEnv | undefined;
    if (env?.GAME_STATE) {
      return env.GAME_STATE as KVNamespace;
    }
  } catch {
    // Not running on Cloudflare Pages or outside request context
  }

  try {
    // Fallback: check globalThis (some Cloudflare runtimes)
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
