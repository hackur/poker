import { cookies } from 'next/headers';
import { getGameStateKV } from './cf-context';

// ============================================================
// Auth System — KV-backed for Cloudflare edge runtime
// Falls back to in-memory for local development
// ============================================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: 'player' | 'admin' | 'superadmin';
  avatar?: string;
  balance: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
}

// ============================================================
// In-memory fallback for local development
// ============================================================

const g = globalThis as unknown as {
  __pokerUsersKV?: Map<string, User>;
  __pokerSessionsKV?: Map<string, Session>;
  __pokerAdminSeeded?: boolean;
  __pokerGuestCounter?: number;
};

if (!g.__pokerUsersKV) g.__pokerUsersKV = new Map();
if (!g.__pokerSessionsKV) g.__pokerSessionsKV = new Map();
if (!g.__pokerGuestCounter) g.__pokerGuestCounter = 0;

const localUsers = () => g.__pokerUsersKV!;
const localSessions = () => g.__pokerSessionsKV!;

// ============================================================
// Password Hashing — PBKDF2 with Web Crypto API (edge-safe)
// ============================================================

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(hash);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith('pbkdf2:')) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;

  const [, saltHex, expectedHashHex] = parts;
  const encoder = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(hash);
  const computedHashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return computedHashHex === expectedHashHex;
}

// ============================================================
// KV Key Schema
// ============================================================

const keys = {
  user: (id: string) => `user:${id}`,
  userEmail: (email: string) => `user-email:${email.toLowerCase()}`,
  userUsername: (username: string) => `user-username:${username.toLowerCase()}`,
  session: (sessionId: string) => `session:${sessionId}`,
  adminSeeded: () => 'admin-seeded',
};

// ============================================================
// Admin Seeding
// ============================================================

async function ensureAdminUser(): Promise<void> {
  const kv = getGameStateKV();

  if (kv) {
    // Check if already seeded
    const seeded = await kv.get(keys.adminSeeded(), { type: 'text' });
    if (seeded) return;

    // Create admin
    const adminId = crypto.randomUUID();
    const admin: User = {
      id: adminId,
      email: 'admin@poker.jeremysarda.com',
      username: 'admin',
      displayName: 'Admin',
      passwordHash: await hashPassword('admin123'),
      role: 'superadmin',
      balance: 10000,
      createdAt: new Date().toISOString(),
    };

    await kv.put(keys.user(adminId), JSON.stringify(admin));
    await kv.put(keys.userEmail(admin.email), adminId);
    await kv.put(keys.userUsername(admin.username), adminId);
    await kv.put(keys.adminSeeded(), '1');
  } else {
    // Local dev: seed once
    if (g.__pokerAdminSeeded) return;
    
    const adminId = crypto.randomUUID();
    const admin: User = {
      id: adminId,
      email: 'admin@poker.jeremysarda.com',
      username: 'admin',
      displayName: 'Admin',
      passwordHash: await hashPassword('admin123'),
      role: 'superadmin',
      balance: 10000,
      createdAt: new Date().toISOString(),
    };
    
    localUsers().set(adminId, admin);
    g.__pokerAdminSeeded = true;
  }
}

// ============================================================
// User CRUD
// ============================================================

export async function createUser(
  email: string,
  username: string,
  displayName: string,
  password: string
): Promise<User | { error: string }> {
  await ensureAdminUser();

  // Validate
  if (!email || !username || !password) return { error: 'All fields required' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters' };
  if (username.length < 3) return { error: 'Username must be at least 3 characters' };
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return { error: 'Username: letters, numbers, underscores, hyphens only' };

  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();

  // Check duplicates
  const existingEmailUser = await getUserByEmail(normalizedEmail);
  if (existingEmailUser) return { error: 'Email already registered' };

  const existingUsernameUser = await getUserByUsername(normalizedUsername);
  if (existingUsernameUser) return { error: 'Username taken' };

  const user: User = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    username: normalizedUsername,
    displayName: displayName || username,
    passwordHash: await hashPassword(password),
    role: 'player',
    balance: 1000,
    createdAt: new Date().toISOString(),
  };

  const kv = getGameStateKV();
  if (kv) {
    await kv.put(keys.user(user.id), JSON.stringify(user));
    await kv.put(keys.userEmail(user.email), user.id);
    await kv.put(keys.userUsername(user.username), user.id);
  } else {
    localUsers().set(user.id, user);
  }

  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureAdminUser();

  const kv = getGameStateKV();
  if (kv) {
    const data = await kv.get(keys.user(id), { type: 'text' }) as string | null;
    return data ? JSON.parse(data) : null;
  } else {
    return localUsers().get(id) ?? null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await ensureAdminUser();

  const normalizedEmail = email.toLowerCase();
  const kv = getGameStateKV();
  
  if (kv) {
    const userId = await kv.get(keys.userEmail(normalizedEmail), { type: 'text' }) as string | null;
    if (!userId) return null;
    return getUserById(userId);
  } else {
    for (const user of localUsers().values()) {
      if (user.email === normalizedEmail) return user;
    }
    return null;
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  await ensureAdminUser();

  const normalizedUsername = username.toLowerCase();
  const kv = getGameStateKV();
  
  if (kv) {
    const userId = await kv.get(keys.userUsername(normalizedUsername), { type: 'text' }) as string | null;
    if (!userId) return null;
    return getUserById(userId);
  } else {
    for (const user of localUsers().values()) {
      if (user.username === normalizedUsername) return user;
    }
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  await ensureAdminUser();

  const kv = getGameStateKV();
  if (kv) {
    const result = await kv.list({ prefix: 'user:' });
    const users: User[] = [];
    for (const key of result.keys) {
      const data = await kv.get(key.name, { type: 'text' }) as string | null;
      if (data) {
        try {
          users.push(JSON.parse(data));
        } catch {
          // Skip malformed entries
        }
      }
    }
    return users;
  } else {
    return [...localUsers().values()];
  }
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;

  user.balance = newBalance;

  const kv = getGameStateKV();
  if (kv) {
    await kv.put(keys.user(userId), JSON.stringify(user));
  } else {
    localUsers().set(userId, user);
  }
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'displayName' | 'avatar' | 'role' | 'balance'>>
): Promise<User | null> {
  const user = await getUserById(id);
  if (!user) return null;

  Object.assign(user, updates);

  const kv = getGameStateKV();
  if (kv) {
    await kv.put(keys.user(id), JSON.stringify(user));
  } else {
    localUsers().set(id, user);
  }

  return user;
}

// ============================================================
// Authentication
// ============================================================

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  await ensureAdminUser();

  const user = await getUserByEmail(email);
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  user.lastLoginAt = new Date().toISOString();

  const kv = getGameStateKV();
  if (kv) {
    await kv.put(keys.user(user.id), JSON.stringify(user));
  } else {
    localUsers().set(user.id, user);
  }

  return user;
}

// ============================================================
// Session Management
// ============================================================

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_COOKIE = 'poker_session';

export async function createSession(userId: string): Promise<Session> {
  const session: Session = {
    id: crypto.randomUUID(),
    userId,
    expiresAt: Date.now() + SESSION_TTL,
    createdAt: Date.now(),
  };

  const kv = getGameStateKV();
  if (kv) {
    await kv.put(keys.session(session.id), JSON.stringify(session), {
      expirationTtl: SESSION_TTL / 1000, // KV TTL in seconds
    });
  } else {
    localSessions().set(session.id, session);
  }

  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const kv = getGameStateKV();
  
  if (kv) {
    const data = await kv.get(keys.session(sessionId), { type: 'text' }) as string | null;
    if (!data) return null;
    const session = JSON.parse(data) as Session;
    if (session.expiresAt < Date.now()) {
      await kv.delete(keys.session(sessionId));
      return null;
    }
    return session;
  } else {
    const session = localSessions().get(sessionId);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      localSessions().delete(sessionId);
      return null;
    }
    return session;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const kv = getGameStateKV();
  if (kv) {
    await kv.delete(keys.session(sessionId));
  } else {
    localSessions().delete(sessionId);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await getSession(sessionId);
  if (!session) return null;

  return getUserById(session.userId);
}

export function sessionCookieOptions(sessionId: string) {
  return {
    name: SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL / 1000,
  };
}

/** Sanitize user for client (strip password hash) */
export function publicUser(user: User) {
  const { passwordHash: _, ...pub } = user;
  return pub;
}

// ============================================================
// Guest Auto-Login
// ============================================================

export async function getOrCreateGuestUser(): Promise<User> {
  const existingUser = await getCurrentUser();
  if (existingUser) return existingUser;

  // Create guest user
  g.__pokerGuestCounter = (g.__pokerGuestCounter || 0) + 1;
  const guestNum = g.__pokerGuestCounter;
  const shortId = crypto.randomUUID().slice(0, 8);
  
  const guestUser: User = {
    id: crypto.randomUUID(),
    email: `guest-${shortId}@poker.local`,
    username: `guest-${shortId}`,
    displayName: `Player ${guestNum}`,
    passwordHash: await hashPassword(crypto.randomUUID()), // Random password (can't login)
    role: 'player',
    balance: 10000,
    createdAt: new Date().toISOString(),
  };

  const kv = getGameStateKV();
  if (kv) {
    await kv.put(keys.user(guestUser.id), JSON.stringify(guestUser));
    await kv.put(keys.userEmail(guestUser.email), guestUser.id);
    await kv.put(keys.userUsername(guestUser.username), guestUser.id);
  } else {
    localUsers().set(guestUser.id, guestUser);
  }

  // Create session and set cookie
  const session = await createSession(guestUser.id);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(session.id));

  return guestUser;
}
