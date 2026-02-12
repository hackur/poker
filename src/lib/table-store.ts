// ============================================================
// Table Store — Lobby table management
// globalThis pattern for HMR survival
// ============================================================

import { uuid, shortId } from './uuid';

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

const KEY = '__pokerTableStore__';

function getStore(): Map<string, Table> {
  const g = globalThis as Record<string, unknown>;
  if (!g[KEY]) g[KEY] = new Map<string, Table>();
  return g[KEY] as Map<string, Table>;
}

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

export function listTables(): TableView[] {
  const store = getStore();
  return Array.from(store.values()).map(tableToView);
}

export function getTable(id: string): Table | undefined {
  return getStore().get(id);
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

export function createTable(input: CreateTableInput): Table {
  const store = getStore();
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
  store.set(id, table);
  return table;
}

export function joinTable(
  tableId: string,
  playerId: string,
  displayName: string,
  buyIn: number
): { ok: true; table: Table } | { ok: false; error: string } {
  const table = getStore().get(tableId);
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

  return { ok: true, table };
}

export function leaveTable(
  tableId: string,
  playerId: string
): { ok: true; table: Table } | { ok: false; error: string } {
  const table = getStore().get(tableId);
  if (!table) return { ok: false, error: 'Table not found' };
  const idx = table.players.findIndex(p => p.id === playerId);
  if (idx === -1) return { ok: false, error: 'Not at this table' };
  table.players.splice(idx, 1);

  // Clean up empty tables (except keep them for a bit)
  if (table.players.length === 0) {
    getStore().delete(tableId);
  }

  return { ok: true, table };
}

export function deleteTable(tableId: string): boolean {
  return getStore().delete(tableId);
}
