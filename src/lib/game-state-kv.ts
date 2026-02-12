/**
 * KV-backed Game State Persistence
 * 
 * Edge workers don't share globalThis memory between requests.
 * This module provides KV-based persistence for game state on Cloudflare Pages.
 * 
 * Usage:
 *   - Call loadGameState(kv, gameId) at start of request
 *   - Call saveGameState(kv, gameId, state) after mutations
 *   - TTL: 1 hour (games auto-expire if inactive)
 */

import type { GameState } from './poker/types';

const GAME_STATE_TTL = 60 * 60; // 1 hour

export interface GameStateKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Load game state from KV
 */
export async function loadGameState(
  kv: GameStateKV | undefined,
  gameId: string
): Promise<GameState | null> {
  if (!kv) return null;
  
  try {
    const raw = await kv.get(`game:${gameId}`);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch (e) {
    console.error('Failed to load game state from KV:', e);
    return null;
  }
}

/**
 * Save game state to KV
 */
export async function saveGameState(
  kv: GameStateKV | undefined,
  gameId: string,
  state: GameState
): Promise<void> {
  if (!kv) return;
  
  try {
    await kv.put(`game:${gameId}`, JSON.stringify(state), {
      expirationTtl: GAME_STATE_TTL,
    });
  } catch (e) {
    console.error('Failed to save game state to KV:', e);
  }
}

/**
 * Delete game state from KV
 */
export async function deleteGameState(
  kv: GameStateKV | undefined,
  gameId: string
): Promise<void> {
  if (!kv) return;
  
  try {
    await kv.delete(`game:${gameId}`);
  } catch (e) {
    console.error('Failed to delete game state from KV:', e);
  }
}

/**
 * List all active games (for admin/debug)
 */
export async function listActiveGames(
  kv: GameStateKV | undefined
): Promise<string[]> {
  // Note: KV list requires additional API not available in basic binding
  // This is a placeholder for admin functionality
  return [];
}
