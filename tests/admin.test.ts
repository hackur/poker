import { describe, it, expect } from 'vitest';
import {
  createUser, getAllUsers, updateUser, publicUser,
  authenticateUser, getUserById,
} from '../src/lib/auth';
import {
  createTable, getTable, deleteTable, joinTable, leaveTable, listTables,
} from '../src/lib/table-store';
import { getHandHistory, addHandRecord } from '../src/lib/hand-history';
import { getPlayerStats, getAllPlayerStats } from '../src/lib/player-stats';

describe('Admin Authorization', () => {
  it('seeds a superadmin user on init', () => {
    const users = getAllUsers();
    expect(users.length).toBeGreaterThanOrEqual(1);
    const admin = users.find(u => u.role === 'superadmin');
    expect(admin).toBeDefined();
    expect(admin!.username).toBe('admin');
  });

  it('creates a regular player by default', () => {
    const result = createUser('admintest@test.com', 'admintestuser', 'Test User', 'password123');
    expect('id' in result).toBe(true);
    if ('id' in result) {
      expect(result.role).toBe('player');
      expect(result.balance).toBe(1000);
    }
  });

  it('can update user role', () => {
    const result = createUser('mod@admintest.com', 'modadmin', 'Mod', 'pass');
    if ('id' in result) {
      const updated = updateUser(result.id, { role: 'admin' });
      expect(updated).not.toBeNull();
      expect(updated!.role).toBe('admin');
    }
  });

  it('can update user balance', () => {
    const result = createUser('rich@admintest.com', 'richadmin', 'Rich', 'pass');
    if ('id' in result) {
      const updated = updateUser(result.id, { balance: 50000 });
      expect(updated!.balance).toBe(50000);
    }
  });

  it('returns null for non-existent user update', () => {
    expect(updateUser('fake-id-000', { balance: 999 })).toBeNull();
  });

  it('publicUser strips password hash', () => {
    const users = getAllUsers();
    const pub = publicUser(users[0]);
    expect(pub).not.toHaveProperty('passwordHash');
    expect(pub).toHaveProperty('id');
    expect(pub).toHaveProperty('role');
  });

  it('authenticates admin with correct credentials', () => {
    const user = authenticateUser('admin@poker.local', 'admin123');
    expect(user).not.toBeNull();
    expect(user!.role).toBe('superadmin');
  });

  it('rejects wrong password', () => {
    expect(authenticateUser('admin@poker.local', 'wrong')).toBeNull();
  });
});

describe('Table Store Admin Operations', () => {
  it('creates and deletes a table', () => {
    const table = createTable({
      name: 'Admin Delete Test',
      smallBlind: 5,
      bigBlind: 10,
      minBuyIn: 100,
      maxBuyIn: 1000,
      maxPlayers: 6,
      createdBy: 'admin-1',
    });
    expect(getTable(table.id)).toBeDefined();
    expect(deleteTable(table.id)).toBe(true);
    expect(getTable(table.id)).toBeUndefined();
  });

  it('joins and kicks a player from table', () => {
    const table = createTable({
      name: 'Kick Test',
      smallBlind: 5,
      bigBlind: 10,
      minBuyIn: 100,
      maxBuyIn: 1000,
      maxPlayers: 6,
      createdBy: 'admin-1',
    });

    const joined = joinTable(table.id, 'kick-player-1', 'Player One', 500);
    expect(joined).toBeTruthy();

    const t = getTable(table.id);
    expect(t!.players.length).toBe(1);

    // Kick via leaveTable
    const result = leaveTable(table.id, 'kick-player-1');
    expect('ok' in result && result.ok).toBe(true);

    // Table auto-deletes when empty (per table-store logic)
    const after = getTable(table.id);
    expect(after).toBeUndefined();
  });

  it('returns false when deleting non-existent table', () => {
    expect(deleteTable('nonexistent-table-id')).toBe(false);
  });

  it('lists tables', () => {
    const before = listTables().length;
    const table = createTable({
      name: 'List Test',
      smallBlind: 5,
      bigBlind: 10,
      minBuyIn: 100,
      maxBuyIn: 1000,
      maxPlayers: 6,
      createdBy: 'admin-1',
    });
    expect(listTables().length).toBe(before + 1);
    deleteTable(table.id);
  });
});

describe('Hand History & Stats for Admin', () => {
  it('adds and retrieves hand records', () => {
    const before = getHandHistory().length;
    addHandRecord({
      gameId: 'admin-test-game',
      gameUuid: 'uuid-admin-1',
      handUuid: 'hand-admin-1',
      handNumber: 999,
      timestamp: Date.now(),
      blinds: { small: 5, big: 10 },
      players: [],
      actions: [],
      communityCards: [],
      winners: [{ seat: 0, name: 'Bot A', amount: 200 }],
      pot: 200,
    });
    expect(getHandHistory().length).toBe(before + 1);
  });

  it('getAllPlayerStats returns array', () => {
    const stats = getAllPlayerStats();
    expect(Array.isArray(stats)).toBe(true);
  });
});
