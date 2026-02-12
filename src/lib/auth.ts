import { cookies } from 'next/headers';

// ============================================================
// Auth System — Session-based, in-memory for prototype
// Production: Cloudflare KV + D1
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

// In-memory stores (globalThis for hot reload survival)
const g = globalThis as unknown as {
  __pokerUsers?: Map<string, User>;
  __pokerSessions?: Map<string, Session>;
};

if (!g.__pokerUsers) {
  g.__pokerUsers = new Map();
  // Seed admin user
  const adminId = crypto.randomUUID();
  g.__pokerUsers.set(adminId, {
    id: adminId,
    email: 'admin@poker.local',
    username: 'admin',
    displayName: 'Admin',
    passwordHash: hashPassword('admin123'),
    role: 'superadmin',
    balance: 10000,
    createdAt: new Date().toISOString(),
  });
}

if (!g.__pokerSessions) g.__pokerSessions = new Map();

const users = () => g.__pokerUsers!;
const sessions = () => g.__pokerSessions!;

// ============================================================
// Password Hashing (simple for prototype — use Argon2id in prod)
// ============================================================

function hashPassword(password: string): string {
  // Simple hash for prototype. Production: Argon2id or PBKDF2
  let hash = 0;
  const str = `poker-salt:${password}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `simple:${hash.toString(36)}`;
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ============================================================
// User CRUD
// ============================================================

export function createUser(email: string, username: string, displayName: string, password: string): User | { error: string } {
  // Validate
  if (!email || !username || !password) return { error: 'All fields required' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters' };
  if (username.length < 3) return { error: 'Username must be at least 3 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { error: 'Username: letters, numbers, underscores only' };

  // Check duplicates
  for (const u of users().values()) {
    if (u.email === email.toLowerCase()) return { error: 'Email already registered' };
    if (u.username === username.toLowerCase()) return { error: 'Username taken' };
  }

  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    displayName: displayName || username,
    passwordHash: hashPassword(password),
    role: 'player',
    balance: 1000, // Starting balance
    createdAt: new Date().toISOString(),
  };

  users().set(user.id, user);
  return user;
}

export function authenticateUser(email: string, password: string): User | null {
  for (const u of users().values()) {
    if (u.email === email.toLowerCase() && verifyPassword(password, u.passwordHash)) {
      u.lastLoginAt = new Date().toISOString();
      return u;
    }
  }
  return null;
}

export function getUserById(id: string): User | null {
  return users().get(id) ?? null;
}

export function getAllUsers(): User[] {
  return [...users().values()];
}

export function updateUser(id: string, updates: Partial<Pick<User, 'displayName' | 'avatar' | 'role' | 'balance'>>): User | null {
  const user = users().get(id);
  if (!user) return null;
  Object.assign(user, updates);
  return user;
}

// ============================================================
// Session Management
// ============================================================

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_COOKIE = 'poker_session';

export function createSession(userId: string): Session {
  const session: Session = {
    id: crypto.randomUUID(),
    userId,
    expiresAt: Date.now() + SESSION_TTL,
    createdAt: Date.now(),
  };
  sessions().set(session.id, session);
  return session;
}

export function getSession(sessionId: string): Session | null {
  const s = sessions().get(sessionId);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    sessions().delete(sessionId);
    return null;
  }
  return s;
}

export function deleteSession(sessionId: string): void {
  sessions().delete(sessionId);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = getSession(sessionId);
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
