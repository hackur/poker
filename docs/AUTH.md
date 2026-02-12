# Authentication & Authorization

## Overview

The poker platform uses a modern authentication system with:
- Email/password registration
- OAuth providers (Google, GitHub)
- JWT tokens with refresh rotation
- Role-based permissions

---

## Auth Flows

### Email/Password Registration
```
1. User submits: { email, username, displayName, password }
2. Server validates input (Zod schema)
3. Check email/username uniqueness
4. Hash password with Argon2id
5. Create user record
6. Generate access token (15 min) + refresh token (7 days)
7. Return tokens (httpOnly cookies for web, body for API)
```

### Email/Password Login
```
1. User submits: { email, password }
2. Find user by email
3. Verify password against hash
4. Check account status (active, suspended, banned)
5. Generate new tokens
6. Update last_login_at
7. Return tokens
```

### OAuth (Google/GitHub)
```
1. User clicks "Continue with Google"
2. Redirect to /api/v1/auth/oauth/google
3. Server generates state token, redirects to Google
4. User authenticates with Google
5. Google redirects to /api/v1/auth/callback/google
6. Server exchanges code for tokens
7. Fetch user info from Google
8. Find or create user:
   - If provider_id exists → login existing user
   - If email exists → link OAuth to existing account
   - Otherwise → create new user
9. Generate tokens, redirect to app
```

### Token Refresh
```
1. Access token expires (15 min)
2. Client sends refresh token
3. Server validates refresh token
4. Generate new access + refresh tokens
5. Invalidate old refresh token (rotation)
6. Return new tokens
```

---

## API Endpoints

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register with email/password |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/password/forgot` | Request password reset |
| POST | `/api/v1/auth/password/reset` | Reset password with token |
| GET | `/api/v1/auth/oauth/google` | Start Google OAuth |
| GET | `/api/v1/auth/oauth/github` | Start GitHub OAuth |
| GET | `/api/v1/auth/callback/:provider` | OAuth callback |

### Protected Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/auth/session` | Get current session |
| POST | `/api/v1/auth/logout` | Logout (invalidate tokens) |
| GET | `/api/v1/users/me` | Get current user profile |
| PATCH | `/api/v1/users/me` | Update profile |
| DELETE | `/api/v1/users/me` | Delete account |
| POST | `/api/v1/users/me/password` | Change password |
| GET | `/api/v1/users/me/sessions` | List active sessions |
| DELETE | `/api/v1/users/me/sessions/:id` | Revoke a session |

---

## Security Measures

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Optional: 1 special character (recommended)

### Password Hashing
```typescript
// Argon2id configuration
const hashConfig = {
  type: argon2.argon2id,
  memoryCost: 65536,    // 64 MB
  timeCost: 3,          // 3 iterations
  parallelism: 4,       // 4 threads
};
```

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 attempts | 15 minutes |
| `/auth/register` | 3 attempts | 1 hour |
| `/auth/password/forgot` | 3 attempts | 1 hour |
| `/auth/password/reset` | 3 attempts | 15 minutes |
| API (authenticated) | 100 requests | 1 minute |

### Account Lockout
- After 10 failed login attempts
- Unlock after 30 minutes or admin reset
- Notify user via email

### Session Security
- JWT signed with HS256 (symmetric) or RS256 (asymmetric)
- Access token: 15 minute expiry
- Refresh token: 7 day expiry, rotated on use
- Tokens stored in httpOnly, secure, sameSite=strict cookies

### CSRF Protection
- Double-submit cookie pattern
- CSRF token in cookie + header must match
- Only required for state-changing operations

---

## JWT Structure

### Access Token Payload
```typescript
{
  sub: "user-uuid",           // User ID
  email: "user@example.com",
  username: "pokerstar",
  role: "player",             // player | vip | admin | superadmin
  iat: 1234567890,            // Issued at
  exp: 1234568790,            // Expiry (15 min from iat)
}
```

### Refresh Token
- Opaque string (UUID v4)
- Stored in database with expiry
- One-time use (rotation)

---

## Roles & Permissions

### Roles
| Role | Description |
|------|-------------|
| `player` | Standard user, can play and chat |
| `vip` | Premium user, higher limits, custom avatar |
| `admin` | Manage tables, bots, moderate chat |
| `superadmin` | Full system access, manage admins |

### Permissions
```typescript
const ROLE_PERMISSIONS = {
  player: [
    'play',
    'chat', 
    'view_own_history',
    'view_own_stats',
  ],
  vip: [
    ...ROLE_PERMISSIONS.player,
    'create_private_table',
    'custom_avatar',
    'priority_support',
  ],
  admin: [
    ...ROLE_PERMISSIONS.vip,
    'manage_tables',
    'manage_bots',
    'moderate_chat',
    'view_audit_log',
    'view_all_stats',
  ],
  superadmin: [
    ...ROLE_PERMISSIONS.admin,
    'manage_users',
    'manage_admins',
    'system_config',
    'view_all_data',
  ],
};
```

---

## Database Schema

### users table
```sql
CREATE TABLE users (
  id                TEXT PRIMARY KEY,
  email             TEXT UNIQUE,
  username          TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  avatar_url        TEXT,
  password_hash     TEXT,
  mfa_enabled       INTEGER DEFAULT 0,
  mfa_secret        TEXT,
  role              TEXT DEFAULT 'player',
  status            TEXT DEFAULT 'active',
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until      TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  last_login_at     TEXT
);
```

### auth_methods table
```sql
CREATE TABLE auth_methods (
  id                TEXT PRIMARY KEY,
  user_id           TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,  -- email | google | github
  provider_id       TEXT,           -- OAuth subject ID
  linked_at         TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, provider_id)
);
```

### sessions table
```sql
CREATE TABLE sessions (
  id                TEXT PRIMARY KEY,
  user_id           TEXT REFERENCES users(id) ON DELETE CASCADE,
  refresh_token     TEXT UNIQUE NOT NULL,
  user_agent        TEXT,
  ip_address        TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  expires_at        TEXT NOT NULL,
  revoked_at        TEXT
);
```

### password_resets table
```sql
CREATE TABLE password_resets (
  id                TEXT PRIMARY KEY,
  user_id           TEXT REFERENCES users(id) ON DELETE CASCADE,
  token             TEXT UNIQUE NOT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  expires_at        TEXT NOT NULL,
  used_at           TEXT
);
```

---

## Implementation Checklist

### Phase 8A: Core Auth
- [ ] Database migrations (users, sessions)
- [ ] Argon2id password hashing
- [ ] JWT generation/validation utilities
- [ ] Session middleware
- [ ] Register endpoint
- [ ] Login endpoint
- [ ] Logout endpoint
- [ ] Session endpoint
- [ ] Refresh endpoint
- [ ] Wire to game state (replace `human-1`)

### Phase 8B: OAuth
- [ ] OAuth state management
- [ ] Google OAuth endpoints
- [ ] GitHub OAuth endpoints
- [ ] Account linking logic
- [ ] Callback handling

### Phase 8D: Profile
- [ ] User profile page
- [ ] Update profile endpoint
- [ ] Change password endpoint
- [ ] Delete account endpoint
- [ ] Active sessions list
- [ ] Session revocation
