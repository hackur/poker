// ============================================================
// Auth.js v5 Configuration
//
// Features:
// - Google OAuth (primary)
// - GitHub OAuth (secondary)
// - JWT sessions (Cloudflare Workers compatible)
// - Edge runtime support
// ============================================================

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

// ============================================================
// Edge-compatible password hashing using Web Crypto API
// ============================================================

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );
  
  const hashArray = new Uint8Array(hash);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const storedHashArray = combined.slice(16);
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256
    );
    
    const hashArray = new Uint8Array(hash);
    
    if (hashArray.length !== storedHashArray.length) return false;
    
    let match = true;
    for (let i = 0; i < hashArray.length; i++) {
      if (hashArray[i] !== storedHashArray[i]) match = false;
    }
    return match;
  } catch {
    return false;
  }
}

// ============================================================
// User Store (In-memory for prototype, D1 for production)
// ============================================================

interface StoredUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  passwordHash?: string;
  role: 'player' | 'vip' | 'admin' | 'superadmin';
  balance: number;
  createdAt: number;
  lastLoginAt: number;
  providers: string[]; // 'google', 'github', 'credentials'
}

const USER_STORE_KEY = '__authUsers__';

function getUserStore(): Map<string, StoredUser> {
  const g = globalThis as Record<string, unknown>;
  if (!(g[USER_STORE_KEY] instanceof Map)) {
    g[USER_STORE_KEY] = new Map<string, StoredUser>();
  }
  return g[USER_STORE_KEY] as Map<string, StoredUser>;
}

// Find user by email
function findUserByEmail(email: string): StoredUser | undefined {
  for (const user of getUserStore().values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) {
      return user;
    }
  }
  return undefined;
}

// Create or update user from OAuth
function upsertOAuthUser(profile: {
  email: string;
  name: string;
  image?: string;
  provider: string;
}): StoredUser {
  const store = getUserStore();
  let user = findUserByEmail(profile.email);

  if (user) {
    // Update existing user
    if (!user.providers.includes(profile.provider)) {
      user.providers.push(profile.provider);
    }
    user.lastLoginAt = Date.now();
    if (profile.image && !user.image) {
      user.image = profile.image;
    }
    store.set(user.id, user);
    return user;
  }

  // Create new user
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    email: profile.email,
    name: profile.name,
    image: profile.image,
    role: 'player',
    balance: 10000, // Starting balance (fake currency)
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    providers: [profile.provider],
  };

  store.set(newUser.id, newUser);
  console.log(`[Auth] Created new user: ${newUser.email} via ${profile.provider}`);
  return newUser;
}

// Verify credentials
async function verifyCredentials(
  email: string,
  password: string
): Promise<StoredUser | null> {
  const user = findUserByEmail(email);
  if (!user || !user.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  user.lastLoginAt = Date.now();
  getUserStore().set(user.id, user);
  return user;
}

// Register with credentials
export async function registerWithCredentials(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; user?: StoredUser }> {
  if (findUserByEmail(email)) {
    return { success: false, error: 'Email already registered' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  const passwordHash = await hash(password, 12);

  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash,
    role: 'player',
    balance: 10000,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    providers: ['credentials'],
  };

  getUserStore().set(user.id, user);
  console.log(`[Auth] Registered new user: ${email}`);
  return { success: true, user };
}

// Get user by ID (for session callbacks)
export function getUserById(id: string): StoredUser | undefined {
  return getUserStore().get(id);
}

// ============================================================
// Auth.js Configuration
// ============================================================

const config: NextAuthConfig = {
  // Providers
  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // GitHub OAuth
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),

    // Email/Password (optional)
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await verifyCredentials(
          credentials.email as string,
          credentials.password as string
        );

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  // Session configuration
  session: {
    strategy: 'jwt', // JWT for Cloudflare Workers (no database sessions)
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Pages
  pages: {
    signIn: '/login',
    error: '/login',
  },

  // Callbacks
  callbacks: {
    // Handle sign in
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      // OAuth sign in
      if (account?.provider && account.provider !== 'credentials') {
        upsertOAuthUser({
          email: user.email,
          name: user.name ?? user.email.split('@')[0],
          image: user.image ?? undefined,
          provider: account.provider,
        });
      }

      return true;
    },

    // Add custom data to JWT
    async jwt({ token, user, account }) {
      if (user) {
        // Initial sign in
        const storedUser = findUserByEmail(user.email!);
        if (storedUser) {
          token.id = storedUser.id;
          token.role = storedUser.role;
          token.balance = storedUser.balance;
        }
      }
      return token;
    },

    // Add custom data to session
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.balance = token.balance as number;
      }
      return session;
    },
  },

  // Events
  events: {
    async signIn({ user, account }) {
      console.log(`[Auth] Sign in: ${user.email} via ${account?.provider}`);
    },
    async signOut(message) {
      console.log(`[Auth] Sign out`);
    },
  },

  // Security
  trustHost: true, // Required for Cloudflare
  
  // Debug (disable in production)
  debug: process.env.NODE_ENV === 'development',
};

// Export handlers
export const { handlers, auth, signIn, signOut } = NextAuth(config);

// ============================================================
// Type Extensions
// ============================================================

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      balance: number;
    };
  }

  interface JWT {
    id: string;
    role: string;
    balance: number;
  }
}
