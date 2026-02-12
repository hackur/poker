# Authentication & Authorization

## Current (Prototype)

In-memory auth with session tokens:

```typescript
// /api/v1/auth/register
{ email, username, password } → { user, sessionToken }

// /api/v1/auth/login
{ email, password } → { user, sessionToken }

// /api/v1/auth/session
Authorization: Bearer {token} → { user }

// /api/v1/auth/logout
Authorization: Bearer {token} → {}
```

## Session Storage

Currently uses globalThis singletons:
- `__pokerUsers` — user accounts (hashed passwords)
- `__pokerSessions` — active sessions with expiry

## Roles

```typescript
type Role = 'player' | 'admin' | 'superadmin';

const PERMISSIONS = {
  player: ['play', 'chat', 'view_own_history'],
  admin: ['...player', 'manage_tables', 'manage_bots', 'view_audit'],
  superadmin: ['...admin', 'manage_admins', 'system_config'],
};
```

## Production Plan

| Feature | Implementation |
|---------|---------------|
| Password hashing | Argon2id |
| Sessions | JWT or KV-backed tokens |
| Cookies | httpOnly, secure, sameSite=strict |
| OAuth | Google, GitHub |
| Rate limiting | IP + user-based |
