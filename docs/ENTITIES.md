# Entity Design — Players, Bots & Authentication

## Overview

This document defines the core entities for the poker platform:
- **HumanPlayer** — Authenticated human users
- **BotPlayer** — Complete AI bot compositions  
- **Table** — Game instances
- **Session** — Bot conversation contexts

---

## BotPlayer Entity

A **BotPlayer** is a complete, reusable composition that defines everything about an AI player:

```typescript
interface BotPlayer {
  // === Identity ===
  id: string;                    // UUID
  slug: string;                  // URL-friendly: "nemotron-shark"
  displayName: string;           // "Nemotron Shark"
  avatar?: string;               // URL to avatar image
  
  // === Model Configuration ===
  model: ModelConfig;
  
  // === Personality ===
  personality: BotPersonality;
  
  // === Deliberation ===
  deliberation: DeliberationConfig;
  
  // === Metadata ===
  createdAt: Date;
  createdBy: string;             // Admin user ID
  isActive: boolean;
  isPublic: boolean;             // Can be used by anyone
}

interface ModelConfig {
  // Provider settings
  provider: 'lmstudio' | 'ollama' | 'openai' | 'anthropic' | 'openrouter' | 'custom';
  modelId: string;               // "nvidia/nemotron-3-nano"
  baseUrl: string;               // "http://localhost:1234/v1"
  apiKey?: string;               // Encrypted, only for cloud
  
  // LM Studio / Ollama presets
  presets: ModelPresets;
}

interface ModelPresets {
  temperature: number;           // 0.0-2.0, default 0.7
  topP: number;                  // 0.0-1.0, default 0.9
  topK: number;                  // 1-100, default 40
  maxTokens: number;             // Max response tokens
  contextSize: number;           // Context window size
  repeatPenalty: number;         // 1.0-2.0
  presencePenalty: number;       // 0.0-2.0
  frequencyPenalty: number;      // 0.0-2.0
  seed?: number;                 // For reproducibility
  stopSequences: string[];       // Custom stop tokens
}

interface BotPersonality {
  // Play style archetype
  style: PlayStyle;
  description: string;           // Human-readable description
  
  // Behavioral parameters (0-1)
  aggression: number;            // Passive → Aggressive
  tightness: number;             // Loose → Tight
  bluffFreq: number;             // Never bluffs → Always bluffs
  riskTolerance: number;         // Risk-averse → Gambler
  
  // System prompt (the bot's "soul")
  systemPrompt: string;
  
  // Think time simulation [min, max] ms
  thinkTimeMs: [number, number];
}

interface DeliberationConfig {
  enabled: boolean;
  maxSteps: number;              // 1-5 recommended
  questions: QuestionType[];     // Which questions to ask
  stepTimeoutMs: number;         // Timeout per step
  
  // Quick mode triggers
  quickModeEnabled: boolean;
  quickModeMaxSteps: number;
}

type PlayStyle = 
  | 'tight-aggressive'    // TAG: Premium hands, aggressive
  | 'loose-aggressive'    // LAG: Many hands, lots of pressure
  | 'tight-passive'       // Rock/Nit: Waits for nuts
  | 'loose-passive'       // Calling station
  | 'maniac'              // Raises everything
  | 'balanced'            // GTO-approximating
  | 'exploitative';       // Adjusts to opponents

type QuestionType =
  | 'hand_strength'
  | 'position'
  | 'opponent_range'
  | 'pot_odds'
  | 'player_style'
  | 'bluff_check'
  | 'trap_check';
```

### Pre-Built Bot Library

| ID | Name | Style | Deliberation | Description |
|----|------|-------|--------------|-------------|
| `nemotron-shark` | Shark | TAG | 3 steps | Calculative predator, pot odds focused |
| `qwen-professor` | Professor | Balanced | 4 steps | Explains reasoning, educational |
| `flash-gunslinger` | Gunslinger | LAG | 1 step | Fast instincts, pressure player |
| `gemma-rock` | The Rock | Tight-Passive | 2 steps | Only plays premium hands |
| `mistral-gambler` | Gambler | Maniac | 2 steps | Lives for action, high variance |
| `deepseek-solver` | Solver | Balanced | 5 steps | GTO-focused, deep analysis |
| `devstral-hunter` | Hunter | Exploitative | 3 steps | Finds and exploits weaknesses |

---

## HumanPlayer Entity

```typescript
interface HumanPlayer {
  // === Identity ===
  id: string;                    // UUID
  email: string;                 // Unique
  username: string;              // Unique, URL-safe
  displayName: string;
  avatar?: string;
  
  // === Auth ===
  passwordHash: string;          // Argon2id
  authMethods: AuthMethod[];     // email, google, github
  mfaEnabled: boolean;
  mfaSecret?: string;
  
  // === Permissions ===
  role: Role;
  permissions: Permission[];
  
  // === Economy ===
  balance: number;               // In smallest unit (cents)
  lifetimeDeposits: number;
  lifetimeWithdrawals: number;
  
  // === Stats ===
  stats: PlayerStats;
  
  // === Preferences ===
  preferences: UserPreferences;
  
  // === Metadata ===
  createdAt: Date;
  lastLoginAt: Date;
  status: 'active' | 'suspended' | 'banned';
}

interface AuthMethod {
  provider: 'email' | 'google' | 'github';
  providerId?: string;           // OAuth subject ID
  linkedAt: Date;
}

interface PlayerStats {
  handsPlayed: number;
  handsWon: number;
  totalWinnings: number;
  totalLosses: number;
  biggestPot: number;
  vpip: number;                  // Voluntarily Put $ In Pot %
  pfr: number;                   // Pre-Flop Raise %
  af: number;                    // Aggression Factor
}

interface UserPreferences {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  autoMuckLosers: boolean;
  showBotReasoning: boolean;
  theme: 'dark' | 'light';
  tableColor: string;
}

type Role = 'player' | 'vip' | 'admin' | 'superadmin';

type Permission = 
  | 'play'
  | 'chat'
  | 'create_private_table'
  | 'manage_bots'
  | 'manage_tables'
  | 'manage_users'
  | 'view_audit_log'
  | 'system_config';
```

---

## Authentication System

### Auth Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTH FLOWS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Email/Password:                                                 │
│    Register → Hash password → Create user → Issue JWT            │
│    Login → Verify password → Issue JWT                           │
│                                                                  │
│  OAuth (Google/GitHub):                                          │
│    Redirect → Provider auth → Callback → Link/Create → JWT       │
│                                                                  │
│  Session:                                                        │
│    JWT in httpOnly cookie (web) or Authorization header (API)    │
│    Refresh token rotation (7-day expiry, 15-min access)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### JWT Structure

```typescript
interface JWTPayload {
  sub: string;           // User ID
  email: string;
  username: string;
  role: Role;
  iat: number;           // Issued at
  exp: number;           // Expiry
}
```

### Security Measures

| Measure | Implementation |
|---------|---------------|
| Password hashing | Argon2id (memory=65536, time=3, parallelism=4) |
| Password requirements | 8+ chars, 1 upper, 1 lower, 1 number |
| Rate limiting | 5 login attempts / 15 min per IP |
| Session tokens | Signed JWT (HS256 or RS256) |
| Cookie flags | httpOnly, secure, sameSite=strict |
| CSRF protection | Double-submit cookie pattern |
| Account lockout | After 10 failed attempts |
| Password reset | Time-limited token (1 hour) |

### API Endpoints

```
POST   /api/v1/auth/register        Register with email/password
POST   /api/v1/auth/login           Login with email/password
POST   /api/v1/auth/logout          Logout (invalidate tokens)
GET    /api/v1/auth/session         Get current session
POST   /api/v1/auth/refresh         Refresh access token

GET    /api/v1/auth/oauth/google    Start Google OAuth
GET    /api/v1/auth/oauth/github    Start GitHub OAuth
GET    /api/v1/auth/callback/:provider  OAuth callback

POST   /api/v1/auth/password/forgot Request password reset
POST   /api/v1/auth/password/reset  Reset password with token

GET    /api/v1/users/me             Get current user profile
PATCH  /api/v1/users/me             Update profile
DELETE /api/v1/users/me             Delete account
```

---

## Database Schema Updates

### bot_players table
```sql
CREATE TABLE bot_players (
  id                TEXT PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  avatar_url        TEXT,
  
  -- Model config (JSON)
  model_config      TEXT NOT NULL,
  
  -- Personality (JSON)
  personality       TEXT NOT NULL,
  
  -- Deliberation config (JSON)
  deliberation      TEXT NOT NULL,
  
  -- Metadata
  created_at        TEXT DEFAULT (datetime('now')),
  created_by        TEXT REFERENCES users(id),
  is_active         INTEGER DEFAULT 1,
  is_public         INTEGER DEFAULT 1
);

CREATE INDEX idx_bot_players_slug ON bot_players(slug);
CREATE INDEX idx_bot_players_active ON bot_players(is_active);
```

### users table (updated)
```sql
CREATE TABLE users (
  id                TEXT PRIMARY KEY,
  email             TEXT UNIQUE,
  username          TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  avatar_url        TEXT,
  
  -- Auth
  password_hash     TEXT,
  mfa_enabled       INTEGER DEFAULT 0,
  mfa_secret        TEXT,
  
  -- Role & status
  role              TEXT DEFAULT 'player',
  status            TEXT DEFAULT 'active',
  
  -- Economy
  balance           INTEGER DEFAULT 0,
  lifetime_deposits INTEGER DEFAULT 0,
  lifetime_withdrawals INTEGER DEFAULT 0,
  
  -- Stats (JSON)
  stats             TEXT DEFAULT '{}',
  
  -- Preferences (JSON)
  preferences       TEXT DEFAULT '{}',
  
  -- Timestamps
  created_at        TEXT DEFAULT (datetime('now')),
  last_login_at     TEXT
);
```

### auth_methods table (OAuth linking)
```sql
CREATE TABLE auth_methods (
  id                TEXT PRIMARY KEY,
  user_id           TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,  -- email | google | github
  provider_id       TEXT,           -- OAuth subject ID
  linked_at         TEXT DEFAULT (datetime('now')),
  
  UNIQUE(provider, provider_id)
);

CREATE INDEX idx_auth_methods_user ON auth_methods(user_id);
```

### sessions table (token management)
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

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_refresh ON sessions(refresh_token);
```

---

## Implementation Priority

### Phase 8A: Core Auth (4-5 hours)
1. Database schema migration (users, sessions)
2. Password hashing with Argon2id
3. JWT token generation/validation
4. Register/login/logout endpoints
5. Session middleware
6. Wire game state to real user IDs

### Phase 8B: OAuth (3-4 hours)
1. Google OAuth flow
2. GitHub OAuth flow
3. Account linking (multiple auth methods)
4. OAuth callback handlers

### Phase 8C: BotPlayer CRUD (3-4 hours)
1. Database schema (bot_players)
2. Admin API for bot CRUD
3. Bot library UI in admin panel
4. Wire game manager to use BotPlayer entities

### Phase 8D: Profile & Settings (2-3 hours)
1. User profile page
2. Preferences API
3. Password change
4. Account deletion

---

## API Examples

### Create BotPlayer (Admin)
```bash
POST /api/v1/admin/bots
{
  "slug": "nemotron-shark",
  "displayName": "Nemotron Shark",
  "model": {
    "provider": "lmstudio",
    "modelId": "nvidia/nemotron-3-nano",
    "baseUrl": "http://localhost:1234/v1",
    "presets": {
      "temperature": 0.7,
      "contextSize": 8192,
      "maxTokens": 1024
    }
  },
  "personality": {
    "style": "tight-aggressive",
    "aggression": 0.75,
    "tightness": 0.7,
    "bluffFreq": 0.15,
    "systemPrompt": "You are Shark, a calculating predator..."
  },
  "deliberation": {
    "enabled": true,
    "maxSteps": 3,
    "questions": ["hand_strength", "opponent_range", "player_style"]
  }
}
```

### Get Active Bots
```bash
GET /api/v1/bots?active=true

[
  { "id": "...", "slug": "nemotron-shark", "displayName": "Nemotron Shark", ... },
  { "id": "...", "slug": "qwen-professor", "displayName": "Professor", ... }
]
```

### User Registration
```bash
POST /api/v1/auth/register
{
  "email": "player@example.com",
  "username": "pokerstar",
  "displayName": "Poker Star",
  "password": "SecurePass123!"
}

→ 201 Created
{
  "user": { "id": "...", "username": "pokerstar", ... },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```
