/**
 * KV-backed Game State Storage
 * 
 * Solves the edge runtime issue where globalThis doesn't persist
 * between requests on Cloudflare Pages.
 * 
 * Usage: Call loadGameState() at start of request, saveGameState() at end.
 */

import type { GameState } from './poker';

// Type for Cloudflare KV namespace
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>;
}

// Global KV namespace reference (set by middleware)
let kvNamespace: KVNamespace | null = null;

// In-memory cache for current request (avoid repeated KV reads)
const requestCache = new Map<string, GameState>();

// TTL for game state in KV (24 hours)
const GAME_STATE_TTL = 60 * 60 * 24;

/**
 * Initialize KV namespace from request context
 * Call this at the start of each API request
 */
export function initKV(kv: KVNamespace | null): void {
  kvNamespace = kv;
}

/**
 * Load game state from KV (or cache)
 */
export async function loadGameState(gameId: string): Promise<GameState | null> {
  // Check request cache first
  if (requestCache.has(gameId)) {
    return requestCache.get(gameId)!;
  }

  // If no KV available (local dev), return null
  if (!kvNamespace) {
    return null;
  }

  try {
    const data = await kvNamespace.get(`game:${gameId}`);
    if (!data) return null;

    const state = JSON.parse(data) as GameState;
    requestCache.set(gameId, state);
    return state;
  } catch (error) {
    console.error(`Failed to load game state for ${gameId}:`, error);
    return null;
  }
}

/**
 * Save game state to KV
 */
export async function saveGameState(gameId: string, state: GameState): Promise<void> {
  // Update request cache
  requestCache.set(gameId, state);

  // If no KV available (local dev), just use cache
  if (!kvNamespace) {
    return;
  }

  try {
    await kvNamespace.put(
      `game:${gameId}`,
      JSON.stringify(state),
      { expirationTtl: GAME_STATE_TTL }
    );
  } catch (error) {
    console.error(`Failed to save game state for ${gameId}:`, error);
  }
}

/**
 * Delete game state from KV
 */
export async function deleteGameState(gameId: string): Promise<void> {
  requestCache.delete(gameId);

  if (!kvNamespace) return;

  try {
    await kvNamespace.delete(`game:${gameId}`);
  } catch (error) {
    console.error(`Failed to delete game state for ${gameId}:`, error);
  }
}

/**
 * List all active game IDs
 */
export async function listGameIds(): Promise<string[]> {
  if (!kvNamespace) {
    return Array.from(requestCache.keys());
  }

  try {
    const result = await kvNamespace.list({ prefix: 'game:' });
    return result.keys.map(k => k.name.replace('game:', ''));
  } catch (error) {
    console.error('Failed to list game IDs:', error);
    return [];
  }
}

/**
 * Clear request cache (call at end of request if needed)
 */
export function clearRequestCache(): void {
  requestCache.clear();
}

/**
 * Check if KV is available
 */
export function hasKV(): boolean {
  return kvNamespace !== null;
}
