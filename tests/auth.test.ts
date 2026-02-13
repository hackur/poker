/**
 * Authentication System Tests
 * Tests for user creation, authentication, sessions, and authorization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  authenticateUser,
  getUserById,
  getAllUsers,
  updateUser,
  createSession,
  getSession,
  deleteSession,
  publicUser,
  type User,
} from '../src/lib/auth';

// Simple hash function matching auth.ts
function simpleHash(password: string): string {
  let hash = 0;
  const str = `poker-salt:${password}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `simple:${hash.toString(36)}`;
}

// Reset the stores before each test
beforeEach(() => {
  const g = globalThis as unknown as {
    __pokerUsers?: Map<string, User>;
    __pokerSessions?: Map<string, unknown>;
  };
  // Create fresh stores with admin user
  g.__pokerUsers = new Map();
  g.__pokerSessions = new Map();
  
  // Re-seed admin (simulating module initialization)
  const adminId = crypto.randomUUID();
  g.__pokerUsers.set(adminId, {
    id: adminId,
    email: 'admin@poker.local',
    username: 'admin',
    displayName: 'Admin',
    passwordHash: simpleHash('admin123'),
    role: 'superadmin',
    balance: 10000,
    createdAt: new Date().toISOString(),
  } as User);
});

describe('User Creation', () => {
  it('creates a new user successfully', () => {
    const result = createUser('test@example.com', 'testuser', 'Test User', 'password123');
    expect('id' in result).toBe(true);
    if ('id' in result) {
      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(result.displayName).toBe('Test User');
      expect(result.role).toBe('player');
      expect(result.balance).toBe(1000);
    }
  });

  it('lowercases email', () => {
    const result = createUser('TEST@EXAMPLE.COM', 'testuser', 'Test', 'password123');
    expect('id' in result).toBe(true);
    if ('id' in result) {
      expect(result.email).toBe('test@example.com');
    }
  });

  it('lowercases username', () => {
    const result = createUser('test@example.com', 'TestUser', 'Test', 'password123');
    expect('id' in result).toBe(true);
    if ('id' in result) {
      expect(result.username).toBe('testuser');
    }
  });

  it('uses username as display name if none provided', () => {
    const result = createUser('test@example.com', 'testuser', '', 'password123');
    expect('id' in result).toBe(true);
    if ('id' in result) {
      expect(result.displayName).toBe('testuser');
    }
  });

  it('rejects missing fields', () => {
    const result = createUser('', 'testuser', 'Test', 'password123');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('All fields required');
    }
  });

  it('rejects short password', () => {
    const result = createUser('test@example.com', 'testuser', 'Test', '12345');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Password must be at least 6 characters');
    }
  });

  it('rejects short username', () => {
    const result = createUser('test@example.com', 'ab', 'Test', 'password123');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Username must be at least 3 characters');
    }
  });

  it('rejects invalid username characters', () => {
    const result = createUser('test@example.com', 'test user', 'Test', 'password123');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Username: letters, numbers, underscores only');
    }
  });

  it('rejects duplicate email', () => {
    createUser('test@example.com', 'user1', 'User 1', 'password123');
    const result = createUser('test@example.com', 'user2', 'User 2', 'password123');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Email already registered');
    }
  });

  it('rejects duplicate username', () => {
    createUser('user1@example.com', 'sameuser', 'User 1', 'password123');
    const result = createUser('user2@example.com', 'sameuser', 'User 2', 'password123');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Username taken');
    }
  });

  it('allows valid username with underscores and numbers', () => {
    const result = createUser('test@example.com', 'test_user_123', 'Test', 'password123');
    expect('id' in result).toBe(true);
  });
});

describe('User Authentication', () => {
  beforeEach(() => {
    createUser('player@example.com', 'player1', 'Player One', 'mypassword');
  });

  it('authenticates with correct credentials', () => {
    const user = authenticateUser('player@example.com', 'mypassword');
    expect(user).not.toBeNull();
    expect(user!.email).toBe('player@example.com');
  });

  it('authenticates admin user', () => {
    const user = authenticateUser('admin@poker.local', 'admin123');
    expect(user).not.toBeNull();
    expect(user!.role).toBe('superadmin');
  });

  it('rejects wrong password', () => {
    const user = authenticateUser('player@example.com', 'wrongpassword');
    expect(user).toBeNull();
  });

  it('rejects non-existent email', () => {
    const user = authenticateUser('nonexistent@example.com', 'mypassword');
    expect(user).toBeNull();
  });

  it('is case-insensitive for email', () => {
    const user = authenticateUser('PLAYER@EXAMPLE.COM', 'mypassword');
    expect(user).not.toBeNull();
  });

  it('updates lastLoginAt on successful auth', () => {
    const before = new Date().toISOString();
    const user = authenticateUser('player@example.com', 'mypassword');
    expect(user!.lastLoginAt).toBeDefined();
    expect(user!.lastLoginAt! >= before).toBe(true);
  });
});

describe('User Retrieval', () => {
  it('gets user by id', () => {
    const created = createUser('test@example.com', 'testuser', 'Test', 'password123');
    expect('id' in created).toBe(true);
    if ('id' in created) {
      const user = getUserById(created.id);
      expect(user).not.toBeNull();
      expect(user!.email).toBe('test@example.com');
    }
  });

  it('returns null for unknown id', () => {
    const user = getUserById('unknown-id-12345');
    expect(user).toBeNull();
  });

  it('getAllUsers includes all users', () => {
    createUser('user1@example.com', 'user1', 'User 1', 'password123');
    createUser('user2@example.com', 'user2', 'User 2', 'password123');
    
    const users = getAllUsers();
    // Admin + 2 new users = 3
    expect(users.length).toBe(3);
  });
});

describe('User Updates', () => {
  let userId: string;

  beforeEach(() => {
    const result = createUser('update@example.com', 'updateuser', 'Update User', 'password123');
    if ('id' in result) {
      userId = result.id;
    }
  });

  it('updates display name', () => {
    const updated = updateUser(userId, { displayName: 'New Display Name' });
    expect(updated).not.toBeNull();
    expect(updated!.displayName).toBe('New Display Name');
  });

  it('updates avatar', () => {
    const updated = updateUser(userId, { avatar: 'https://example.com/avatar.png' });
    expect(updated).not.toBeNull();
    expect(updated!.avatar).toBe('https://example.com/avatar.png');
  });

  it('updates role', () => {
    const updated = updateUser(userId, { role: 'admin' });
    expect(updated).not.toBeNull();
    expect(updated!.role).toBe('admin');
  });

  it('updates balance', () => {
    const updated = updateUser(userId, { balance: 5000 });
    expect(updated).not.toBeNull();
    expect(updated!.balance).toBe(5000);
  });

  it('updates multiple fields', () => {
    const updated = updateUser(userId, { displayName: 'New Name', balance: 2500 });
    expect(updated).not.toBeNull();
    expect(updated!.displayName).toBe('New Name');
    expect(updated!.balance).toBe(2500);
  });

  it('returns null for unknown user', () => {
    const updated = updateUser('unknown-id', { balance: 1000 });
    expect(updated).toBeNull();
  });
});

describe('Session Management', () => {
  let userId: string;

  beforeEach(() => {
    const result = createUser('session@example.com', 'sessionuser', 'Session User', 'password123');
    if ('id' in result) {
      userId = result.id;
    }
  });

  it('creates a new session', () => {
    const session = createSession(userId);
    expect(session.id).toBeDefined();
    expect(session.userId).toBe(userId);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('retrieves a valid session', () => {
    const created = createSession(userId);
    const retrieved = getSession(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.userId).toBe(userId);
  });

  it('returns null for unknown session', () => {
    const session = getSession('unknown-session-id');
    expect(session).toBeNull();
  });

  it('expires old sessions', () => {
    const session = createSession(userId);
    
    // Manually expire the session
    const g = globalThis as unknown as { __pokerSessions?: Map<string, { expiresAt: number }> };
    const stored = g.__pokerSessions?.get(session.id);
    if (stored) {
      stored.expiresAt = Date.now() - 1000; // Expired 1 second ago
    }
    
    const retrieved = getSession(session.id);
    expect(retrieved).toBeNull();
  });

  it('deletes a session', () => {
    const session = createSession(userId);
    expect(getSession(session.id)).not.toBeNull();
    
    deleteSession(session.id);
    expect(getSession(session.id)).toBeNull();
  });

  it('session TTL is 7 days', () => {
    const session = createSession(userId);
    const expectedTTL = 7 * 24 * 60 * 60 * 1000;
    const actualTTL = session.expiresAt - Date.now();
    // Allow 1 second tolerance
    expect(Math.abs(actualTTL - expectedTTL)).toBeLessThan(1000);
  });
});

describe('Public User', () => {
  it('strips password hash', () => {
    const result = createUser('public@example.com', 'publicuser', 'Public User', 'password123');
    expect('id' in result).toBe(true);
    if ('id' in result) {
      const pub = publicUser(result);
      expect(pub).not.toHaveProperty('passwordHash');
    }
  });

  it('preserves other fields', () => {
    const result = createUser('public@example.com', 'publicuser', 'Public User', 'password123');
    expect('id' in result).toBe(true);
    if ('id' in result) {
      const pub = publicUser(result);
      expect(pub.id).toBe(result.id);
      expect(pub.email).toBe(result.email);
      expect(pub.username).toBe(result.username);
      expect(pub.displayName).toBe(result.displayName);
      expect(pub.role).toBe(result.role);
      expect(pub.balance).toBe(result.balance);
      expect(pub.createdAt).toBe(result.createdAt);
    }
  });
});

describe('Role System', () => {
  it('new users default to player role', () => {
    const result = createUser('role@example.com', 'roleuser', 'Role User', 'password123');
    expect('id' in result).toBe(true);
    if ('id' in result) {
      expect(result.role).toBe('player');
    }
  });

  it('admin user has superadmin role', () => {
    const users = getAllUsers();
    const admin = users.find(u => u.username === 'admin');
    expect(admin).toBeDefined();
    expect(admin!.role).toBe('superadmin');
  });

  it('can promote user to admin', () => {
    const result = createUser('promote@example.com', 'promoteuser', 'Promote User', 'password123');
    expect('id' in result).toBe(true);
    if ('id' in result) {
      const updated = updateUser(result.id, { role: 'admin' });
      expect(updated!.role).toBe('admin');
    }
  });
});
