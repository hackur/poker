# Authentication & Authorization

## Overview

The poker platform uses KV-backed authentication with:
- PBKDF2 password hashing (Web Crypto API, edge-safe)
- Cookie-based sessions stored in Cloudflare KV
- Guest auto-login for frictionless play
- Admin auto-seeding on first access
- In-memory fallback for local development

Primary implementation: `src/lib/auth-kv.ts`

---

## Auth Flows

### Guest Auto-Login
```
1. User visits any page without a session cookie
2. First API call triggers getOrCreateGuestUser()
3. Backend creates guest user:
   - Username: guest-{shortId}
   - Display Name: Player {number}
   - Balance: $10,000
4. Session created in KV (7-day TTL)
5. Session cookie set automatically
6. User can play immediately
```

### Email/Password Registration
```
1. User submits: { email, username, displayName, password }
2. Server validates input
3. Check email/username uniqueness via KV lookup
4. Hash password with PBKDF2 (100k iterations, SHA-256, 128-bit salt)
5. Store user in KV (user:{id}, user-email:{email}, user-username:{username})
6. Create session in KV with 7-day TTL
7. Set session cookie
```

### Email/Password Login
```
1. User submits: { email, password }
2. Find user by email via KV (user-email:{email} -> user:{id})
3. Verify password against PBKDF2 hash
4. Create new session in KV
5. Set session cookie
```

### Logout
```
1. Read session cookie
2. Delete session from KV
3. Clear session cookie
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register with email/password |
| POST | `/api/v1/auth/login` | Login with email/password |
| GET | `/api/v1/auth/session` | Get current session (creates guest if none) |
| POST | `/api/v1/auth/logout` | Logout (delete KV session) |

---

## Security Model

### Password Hashing
```
PBKDF2 with Web Crypto API (edge-safe)
- Algorithm: SHA-256
- Iterations: 100,000
- Salt: 128-bit random (crypto.getRandomValues)
- Output: 256-bit hash
- Storage format: pbkdf2:{saltHex}:{hashHex}
```

### Session Management
- Sessions stored in KV: `session:{sessionId}` -> Session JSON
- 7-day TTL with automatic KV expiration
- Session ID is a UUID v4
- HTTP-only secure cookie with SameSite

### Table Endpoint Auth Pattern
All table API routes follow this authentication flow:
```typescript
// 1. Check cookie session
const cookieUser = await getCurrentUser();
if (cookieUser) {
  playerId = cookieUser.id;
}
// 2. Validate body-provided playerId
else if (bodyPlayerId) {
  const user = await getUserById(bodyPlayerId);
  playerId = user ? user.id : (await getOrCreateGuestUser()).id;
}
// 3. Fall back to guest auto-creation
else {
  playerId = (await getOrCreateGuestUser()).id;
}
```

---

## KV Key Schema

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `user:{id}` | User JSON | Permanent |
| `user-email:{email}` | User ID string | Permanent |
| `user-username:{username}` | User ID string | Permanent |
| `session:{sessionId}` | Session JSON | 7 days |

---

## Roles

| Role | Description |
|------|-------------|
| `player` | Standard user, can play and chat |
| `admin` | Manage tables, bots, moderate |
| `superadmin` | Full system access |

---

## Admin Auto-Seeding

On first KV access, a default admin account is created:
- Email: admin@poker.jeremysarda.com
- Username: admin
- Password: admin123
- Role: superadmin
- Balance: $10,000

---

## Functions (auth-kv.ts)

| Function | Description |
|----------|-------------|
| `createUser(email, username, displayName, password)` | Register new user |
| `getUserById(id)` | Lookup by ID |
| `getUserByEmail(email)` | Lookup by email |
| `getUserByUsername(username)` | Lookup by username |
| `getAllUsers()` | List all users |
| `verifyLogin(email, password)` | Verify credentials |
| `createSession(userId)` | Create KV session |
| `getSession(sessionId)` | Get session from KV |
| `getCurrentUser()` | Get user from cookie session |
| `deleteSession(sessionId)` | Remove session |
| `getOrCreateGuestUser()` | Auto-create guest if no session |
| `updateUser(userId, updates)` | Update user fields |
| `updateUserBalance(userId, newBalance)` | Set balance |
| `publicUser(user)` | Strip password hash for client |

---

## Local Development

No KV required for local dev. All auth functions detect when `getGameStateKV()` returns `null` and automatically fall back to in-memory Maps with identical behavior.

---

## Legacy Auth

`src/lib/auth.ts` contains the old in-memory auth system. It is kept only for backward compatibility with existing tests. All production code uses `auth-kv.ts`.
