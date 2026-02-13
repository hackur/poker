/**
 * Table Store Tests
 * Tests for lobby table management, joining, leaving, and CRUD operations
 * Updated to use KV-backed store (with in-memory fallback for testing)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTable,
  getTable,
  listTables,
  joinTable,
  leaveTable,
  deleteTable,
  getTableStatus,
  tableToView,
  type Table,
  type CreateTableInput,
} from '../src/lib/table-store-kv';

// Reset the store before each test
beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  g['__pokerTableStore__'] = new Map();
});

const defaultInput: CreateTableInput = {
  name: 'Test Table',
  smallBlind: 5,
  bigBlind: 10,
  minBuyIn: 100,
  maxBuyIn: 1000,
  maxPlayers: 6,
  createdBy: 'creator-1',
};

describe('Table Creation', () => {
  it('creates a table with correct properties', async () => {
    const table = await createTable(defaultInput);
    
    expect(table.id).toBeDefined();
    expect(table.name).toBe('Test Table');
    expect(table.smallBlind).toBe(5);
    expect(table.bigBlind).toBe(10);
    expect(table.minBuyIn).toBe(100);
    expect(table.maxBuyIn).toBe(1000);
    expect(table.maxPlayers).toBe(6);
    expect(table.players).toHaveLength(0);
    expect(table.createdBy).toBe('creator-1');
  });

  it('generates unique table ids', async () => {
    const table1 = await createTable(defaultInput);
    const table2 = await createTable(defaultInput);
    expect(table1.id).not.toBe(table2.id);
  });

  it('sets creation timestamp', async () => {
    const before = Date.now();
    const table = await createTable(defaultInput);
    const after = Date.now();
    
    expect(table.createdAt).toBeGreaterThanOrEqual(before);
    expect(table.createdAt).toBeLessThanOrEqual(after);
  });

  it('clamps maxPlayers to valid range (2-9)', async () => {
    const tooFew = await createTable({ ...defaultInput, maxPlayers: 1 });
    expect(tooFew.maxPlayers).toBe(2);
    
    const tooMany = await createTable({ ...defaultInput, maxPlayers: 15 });
    expect(tooMany.maxPlayers).toBe(9);
  });

  it('allows maxPlayers within valid range', async () => {
    const twoMax = await createTable({ ...defaultInput, maxPlayers: 2 });
    expect(twoMax.maxPlayers).toBe(2);
    
    const nineMax = await createTable({ ...defaultInput, maxPlayers: 9 });
    expect(nineMax.maxPlayers).toBe(9);
  });
});

describe('Table Retrieval', () => {
  it('retrieves created table by id', async () => {
    const created = await createTable(defaultInput);
    const retrieved = await getTable(created.id);
    
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.name).toBe(created.name);
  });

  it('returns undefined for unknown table', async () => {
    const table = await getTable('nonexistent-id');
    expect(table).toBeUndefined();
  });

  it('lists all tables', async () => {
    await createTable({ ...defaultInput, name: 'Table 1' });
    await createTable({ ...defaultInput, name: 'Table 2' });
    await createTable({ ...defaultInput, name: 'Table 3' });
    
    const tables = await listTables();
    expect(tables).toHaveLength(3);
  });

  it('returns empty array when no tables exist', async () => {
    const tables = await listTables();
    expect(tables).toHaveLength(0);
  });
});

describe('Joining Tables', () => {
  let tableId: string;

  beforeEach(async () => {
    const table = await createTable(defaultInput);
    tableId = table.id;
  });

  it('allows player to join table', async () => {
    const result = await joinTable(tableId, 'player-1', 'Player One', 500);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.table.players).toHaveLength(1);
      expect(result.table.players[0].id).toBe('player-1');
      expect(result.table.players[0].displayName).toBe('Player One');
      expect(result.table.players[0].chipCount).toBe(500);
    }
  });

  it('assigns sequential seats', async () => {
    await joinTable(tableId, 'player-1', 'Player One', 500);
    await joinTable(tableId, 'player-2', 'Player Two', 500);
    await joinTable(tableId, 'player-3', 'Player Three', 500);
    
    const table = (await getTable(tableId))!;
    expect(table.players[0].seat).toBe(0);
    expect(table.players[1].seat).toBe(1);
    expect(table.players[2].seat).toBe(2);
  });

  it('rejects join to non-existent table', async () => {
    const result = await joinTable('fake-table-id', 'player-1', 'Player', 500);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Table not found');
    }
  });

  it('rejects join when table is full', async () => {
    const smallTable = await createTable({ ...defaultInput, maxPlayers: 2 });
    await joinTable(smallTable.id, 'player-1', 'Player One', 500);
    await joinTable(smallTable.id, 'player-2', 'Player Two', 500);
    
    const result = await joinTable(smallTable.id, 'player-3', 'Player Three', 500);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Table is full');
    }
  });

  it('rejects duplicate join', async () => {
    await joinTable(tableId, 'player-1', 'Player One', 500);
    const result = await joinTable(tableId, 'player-1', 'Player One', 500);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Already at this table');
    }
  });

  it('rejects buy-in below minimum', async () => {
    const result = await joinTable(tableId, 'player-1', 'Player One', 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Buy-in must be between');
    }
  });

  it('rejects buy-in above maximum', async () => {
    const result = await joinTable(tableId, 'player-1', 'Player One', 2000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Buy-in must be between');
    }
  });

  it('accepts buy-in at minimum', async () => {
    const result = await joinTable(tableId, 'player-1', 'Player One', 100);
    expect(result.ok).toBe(true);
  });

  it('accepts buy-in at maximum', async () => {
    const result = await joinTable(tableId, 'player-1', 'Player One', 1000);
    expect(result.ok).toBe(true);
  });

  it('records join timestamp', async () => {
    const before = Date.now();
    await joinTable(tableId, 'player-1', 'Player One', 500);
    const after = Date.now();
    
    const table = (await getTable(tableId))!;
    expect(table.players[0].joinedAt).toBeGreaterThanOrEqual(before);
    expect(table.players[0].joinedAt).toBeLessThanOrEqual(after);
  });

  it('fills gaps in seating', async () => {
    await joinTable(tableId, 'player-1', 'Player One', 500);
    await joinTable(tableId, 'player-2', 'Player Two', 500);
    await joinTable(tableId, 'player-3', 'Player Three', 500);
    await leaveTable(tableId, 'player-2'); // Leave seat 1
    
    await joinTable(tableId, 'player-4', 'Player Four', 500);
    
    const table = (await getTable(tableId))!;
    const player4 = table.players.find(p => p.id === 'player-4');
    expect(player4!.seat).toBe(1); // Should take the vacated seat
  });
});

describe('Leaving Tables', () => {
  let tableId: string;

  beforeEach(async () => {
    const table = await createTable(defaultInput);
    tableId = table.id;
    await joinTable(tableId, 'player-1', 'Player One', 500);
    await joinTable(tableId, 'player-2', 'Player Two', 500);
  });

  it('allows player to leave table', async () => {
    const result = await leaveTable(tableId, 'player-1');
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.table.players).toHaveLength(1);
      expect(result.table.players.find(p => p.id === 'player-1')).toBeUndefined();
    }
  });

  it('rejects leave from non-existent table', async () => {
    const result = await leaveTable('fake-table-id', 'player-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Table not found');
    }
  });

  it('rejects leave when not at table', async () => {
    const result = await leaveTable(tableId, 'player-3');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Not at this table');
    }
  });

  it('deletes table when last player leaves', async () => {
    await leaveTable(tableId, 'player-1');
    await leaveTable(tableId, 'player-2');
    
    const table = await getTable(tableId);
    expect(table).toBeUndefined();
  });
});

describe('Table Deletion', () => {
  it('deletes existing table', async () => {
    const table = await createTable(defaultInput);
    const result = await deleteTable(table.id);
    
    expect(result).toBe(true);
    expect(await getTable(table.id)).toBeUndefined();
  });

  it('returns false for non-existent table', async () => {
    const result = await deleteTable('fake-id');
    expect(result).toBe(false);
  });

  it('removes table from list', async () => {
    const table1 = await createTable({ ...defaultInput, name: 'Table 1' });
    const table2 = await createTable({ ...defaultInput, name: 'Table 2' });
    
    expect(await listTables()).toHaveLength(2);
    
    await deleteTable(table1.id);
    
    const remaining = await listTables();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(table2.id);
  });
});

describe('Table Status', () => {
  it('returns waiting when empty or 1 player', async () => {
    const table = await createTable(defaultInput);
    expect(getTableStatus(table)).toBe('waiting');
    
    await joinTable(table.id, 'player-1', 'Player One', 500);
    expect(getTableStatus((await getTable(table.id))!)).toBe('waiting');
  });

  it('returns playing when 2+ players but not full', async () => {
    const table = await createTable(defaultInput);
    await joinTable(table.id, 'player-1', 'Player One', 500);
    await joinTable(table.id, 'player-2', 'Player Two', 500);
    
    expect(getTableStatus((await getTable(table.id))!)).toBe('playing');
  });

  it('returns full when at max capacity', async () => {
    const table = await createTable({ ...defaultInput, maxPlayers: 2 });
    await joinTable(table.id, 'player-1', 'Player One', 500);
    await joinTable(table.id, 'player-2', 'Player Two', 500);
    
    expect(getTableStatus((await getTable(table.id))!)).toBe('full');
  });
});

describe('Table View', () => {
  it('converts table to view format', async () => {
    const table = await createTable(defaultInput);
    await joinTable(table.id, 'player-1', 'Player One', 500);
    
    const view = tableToView((await getTable(table.id))!);
    
    expect(view.id).toBe(table.id);
    expect(view.name).toBe(table.name);
    expect(view.smallBlind).toBe(5);
    expect(view.bigBlind).toBe(10);
    expect(view.minBuyIn).toBe(100);
    expect(view.maxBuyIn).toBe(1000);
    expect(view.maxPlayers).toBe(6);
    expect(view.playerCount).toBe(1);
    expect(view.status).toBe('waiting');
  });

  it('includes simplified player info', async () => {
    const table = await createTable(defaultInput);
    await joinTable(table.id, 'player-1', 'Player One', 500);
    
    const view = tableToView((await getTable(table.id))!);
    
    expect(view.players).toHaveLength(1);
    expect(view.players[0].id).toBe('player-1');
    expect(view.players[0].displayName).toBe('Player One');
    expect(view.players[0].seat).toBe(0);
    // Should NOT include chip count (that's private)
    expect((view.players[0] as unknown as { chipCount?: number }).chipCount).toBeUndefined();
  });

  it('listTables returns views', async () => {
    await createTable({ ...defaultInput, name: 'Table 1' });
    await createTable({ ...defaultInput, name: 'Table 2' });
    
    const tables = await listTables();
    
    // Should be TableView format
    expect(tables[0]).toHaveProperty('playerCount');
    expect(tables[0]).toHaveProperty('status');
    // Should NOT have raw players array with chipCount
    expect(tables[0].players[0]?.chipCount).toBeUndefined();
  });
});

describe('Blind Levels', () => {
  it('supports micro stakes', async () => {
    const table = await createTable({
      ...defaultInput,
      smallBlind: 1,
      bigBlind: 2,
      minBuyIn: 20,
      maxBuyIn: 200,
    });
    
    expect(table.smallBlind).toBe(1);
    expect(table.bigBlind).toBe(2);
  });

  it('supports high stakes', async () => {
    const table = await createTable({
      ...defaultInput,
      smallBlind: 100,
      bigBlind: 200,
      minBuyIn: 10000,
      maxBuyIn: 50000,
    });
    
    expect(table.smallBlind).toBe(100);
    expect(table.bigBlind).toBe(200);
  });
});

describe('Concurrent Operations', () => {
  it('handles multiple players joining simultaneously', async () => {
    const table = await createTable(defaultInput);
    
    // Simulate concurrent joins
    const results = await Promise.all([
      joinTable(table.id, 'player-1', 'Player One', 500),
      joinTable(table.id, 'player-2', 'Player Two', 500),
      joinTable(table.id, 'player-3', 'Player Three', 500),
    ]);
    
    expect(results.every(r => r.ok)).toBe(true);
    expect((await getTable(table.id))!.players).toHaveLength(3);
  });

  it('handles join/leave race conditions', async () => {
    const table = await createTable({ ...defaultInput, maxPlayers: 2 });
    
    await joinTable(table.id, 'player-1', 'Player One', 500);
    await joinTable(table.id, 'player-2', 'Player Two', 500);
    
    // Player 1 leaves, player 3 joins
    await leaveTable(table.id, 'player-1');
    const result = await joinTable(table.id, 'player-3', 'Player Three', 500);
    
    expect(result.ok).toBe(true);
    const players = (await getTable(table.id))!.players;
    expect(players).toHaveLength(2);
    expect(players.map(p => p.id).sort()).toEqual(['player-2', 'player-3']);
  });
});
