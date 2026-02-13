// ============================================================
// Table Store (KV) — Lobby table management for Cloudflare Edge
// ============================================================

import { shortId } from './uuid';
import { getGameStateKV, type KVNamespace } from './cf-context';

// Re-export types from original table-store for compatibility
export type TableStatus = 'waiting' | 'playing' | 'full';

export interface TablePlayer {
  id: string;
  displayName: string;
  seat: number;
  chipCount: number;
  joinedAt: number;
}

export interface Table {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxPlayers: number;
  players: TablePlayer[];
  createdAt: number;
  createdBy: string;
}

export interface TableView {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxPlayers: number;
  playerCount: number;
  players: { id: string; displayName: string; seat: number }[];
  status: TableStatus;
  createdAt: number;
}

export interface CreateTableInput {
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxPlayers: number;
  createdBy: string;
}

// ============================================================
// In-Memory Fallback (Local Dev)
// ============================================================

const KEY = '__pokerTableStore__';
const TTL_24H = 60 * 60 * 24;

function getMemoryStore(): Map<string, Table> {
  const g = globalThis as Record<string, unknown>;
  if (!g[KEY]) g[KEY] = new Map<string, Table>();
  return g[KEY] as Map<string, Table>;
}

// ============================================================
// Helper Functions
// ============================================================

export function getTableStatus(table: Table): TableStatus {
  if (table.players.length >= table.maxPlayers) return 'full';
  if (table.players.length >= 2) return 'playing';
  return 'waiting';
}

export function tableToView(table: Table): TableView {
  return {
    id: table.id,
    name: table.name,
    smallBlind: table.smallBlind,
    bigBlind: table.bigBlind,
    minBuyIn: table.minBuyIn,
    maxBuyIn: table.maxBuyIn,
    maxPlayers: table.maxPlayers,
    playerCount: table.players.length,
    players: table.players.map(p => ({ id: p.id, displayName: p.displayName, seat: p.seat })),
    status: getTableStatus(table),
    createdAt: table.createdAt,
  };
}

// ============================================================
// KV Operations
// ============================================================

const INDEX_KEY = 'tables:index';

/**
 * Get the list of table IDs from the index (strongly consistent).
 * KV list() is eventually consistent, so we maintain our own index.
 */
async function getIndex(kv: import('./cf-context').KVNamespace): Promise<string[]> {
  try {
    const data = await kv.get(INDEX_KEY, { type: 'json' });
    return Array.isArray(data) ? data as string[] : [];
  } catch {
    return [];
  }
}

async function setIndex(kv: import('./cf-context').KVNamespace, ids: string[]): Promise<void> {
  await kv.put(INDEX_KEY, JSON.stringify(ids), { expirationTtl: TTL_24H });
}

/**
 * List all tables from KV (or memory fallback)
 */
export async function listTables(): Promise<TableView[]> {
  const kv = getGameStateKV();
  
  if (!kv) {
    // Local dev fallback
    const store = getMemoryStore();
    return Array.from(store.values()).map(tableToView);
  }

  // Load tables using strongly-consistent index
  try {
    const ids = await getIndex(kv);
    const tables: Table[] = [];

    for (const id of ids) {
      const data = await kv.get(`table:${id}`, { type: 'json' });
      if (data) {
        tables.push(data as Table);
      }
    }

    return tables.map(tableToView);
  } catch (err) {
    console.error('[table-store-kv] listTables error:', err);
    return [];
  }
}

/**
 * Get a single table by ID
 */
export async function getTable(id: string): Promise<Table | undefined> {
  const kv = getGameStateKV();

  if (!kv) {
    // Local dev fallback
    return getMemoryStore().get(id);
  }

  try {
    const data = await kv.get(`table:${id}`, { type: 'json' });
    return data ? (data as Table) : undefined;
  } catch (err) {
    console.error(`[table-store-kv] getTable(${id}) error:`, err);
    return undefined;
  }
}

/**
 * Create a new table
 */
export async function createTable(input: CreateTableInput): Promise<Table> {
  const kv = getGameStateKV();
  const id = shortId();
  
  const table: Table = {
    id,
    name: input.name,
    smallBlind: input.smallBlind,
    bigBlind: input.bigBlind,
    minBuyIn: input.minBuyIn,
    maxBuyIn: input.maxBuyIn,
    maxPlayers: Math.min(Math.max(input.maxPlayers, 2), 9),
    players: [],
    createdAt: Date.now(),
    createdBy: input.createdBy,
  };

  if (!kv) {
    // Local dev fallback
    getMemoryStore().set(id, table);
    return table;
  }

  try {
    await kv.put(
      `table:${id}`,
      JSON.stringify(table),
      { expirationTtl: TTL_24H }
    );
    // Update index
    const ids = await getIndex(kv);
    ids.push(id);
    await setIndex(kv, ids);
    return table;
  } catch (err) {
    console.error('[table-store-kv] createTable error:', err);
    throw err;
  }
}

/**
 * Join a table
 */
export async function joinTable(
  tableId: string,
  playerId: string,
  displayName: string,
  buyIn: number
): Promise<{ ok: true; table: Table } | { ok: false; error: string }> {
  const kv = getGameStateKV();
  const table = await getTable(tableId);
  
  if (!table) return { ok: false, error: 'Table not found' };
  if (table.players.length >= table.maxPlayers) return { ok: false, error: 'Table is full' };
  if (table.players.some(p => p.id === playerId)) return { ok: false, error: 'Already at this table' };
  if (buyIn < table.minBuyIn || buyIn > table.maxBuyIn) {
    return { ok: false, error: `Buy-in must be between $${table.minBuyIn} and $${table.maxBuyIn}` };
  }

  // Find open seat
  const takenSeats = new Set(table.players.map(p => p.seat));
  let seat = 0;
  for (let i = 0; i < table.maxPlayers; i++) {
    if (!takenSeats.has(i)) { seat = i; break; }
  }

  table.players.push({
    id: playerId,
    displayName,
    seat,
    chipCount: buyIn,
    joinedAt: Date.now(),
  });

  // Save updated table
  if (!kv) {
    // Local dev fallback
    getMemoryStore().set(tableId, table);
    return { ok: true, table };
  }

  try {
    await kv.put(
      `table:${tableId}`,
      JSON.stringify(table),
      { expirationTtl: TTL_24H }
    );
    return { ok: true, table };
  } catch (err) {
    console.error('[table-store-kv] joinTable error:', err);
    return { ok: false, error: 'Failed to update table' };
  }
}

/**
 * Leave a table
 */
export async function leaveTable(
  tableId: string,
  playerId: string
): Promise<{ ok: true; table: Table } | { ok: false; error: string }> {
  const kv = getGameStateKV();
  const table = await getTable(tableId);
  
  if (!table) return { ok: false, error: 'Table not found' };
  
  const idx = table.players.findIndex(p => p.id === playerId);
  if (idx === -1) return { ok: false, error: 'Not at this table' };
  
  table.players.splice(idx, 1);

  // Clean up empty tables
  if (table.players.length === 0) {
    if (!kv) {
      getMemoryStore().delete(tableId);
    } else {
      try {
        await kv.delete(`table:${tableId}`);
        // Remove from index
        const ids = await getIndex(kv);
        await setIndex(kv, ids.filter(i => i !== tableId));
      } catch (err) {
        console.error('[table-store-kv] leaveTable delete error:', err);
      }
    }
    return { ok: true, table };
  }

  // Save updated table
  if (!kv) {
    getMemoryStore().set(tableId, table);
    return { ok: true, table };
  }

  try {
    await kv.put(
      `table:${tableId}`,
      JSON.stringify(table),
      { expirationTtl: TTL_24H }
    );
    return { ok: true, table };
  } catch (err) {
    console.error('[table-store-kv] leaveTable error:', err);
    return { ok: false, error: 'Failed to update table' };
  }
}

/**
 * Delete a table
 */
export async function deleteTable(tableId: string): Promise<boolean> {
  const kv = getGameStateKV();

  if (!kv) {
    // Local dev fallback
    return getMemoryStore().delete(tableId);
  }

  try {
    await kv.delete(`table:${tableId}`);
    // Remove from index
    const ids = await getIndex(kv);
    await setIndex(kv, ids.filter(i => i !== tableId));
    return true;
  } catch (err) {
    console.error('[table-store-kv] deleteTable error:', err);
    return false;
  }
}
