# Database Schema

> **Current:** In-memory (prototype)  
> **Production:** Cloudflare D1 (SQLite)

## Entity Relationship

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   users     │      │  bot_players │     │   tables    │
│─────────────│      │─────────────│      │─────────────│
│ id (PK)     │◄────┐│ id (PK)     │      │ id (PK)     │
│ email       │     ││ slug        │      │ name        │
│ username    │     ││ display_name│      │ stakes      │
│ role        │     ││ model_config│      │ status      │
│ balance     │     ││ personality │      │             │
└──────┬──────┘     ││ deliberation│      └──────┬──────┘
       │            │└─────────────┘             │
       │            │                            │
       ▼            │                            ▼
┌─────────────┐     │               ┌─────────────────────┐
│auth_methods │     │               │       hands         │
│─────────────│     │               │─────────────────────│
│ user_id (FK)│     │               │ id (PK)             │
│ provider    │     │               │ table_id (FK)       │
│ provider_id │     │               │ hand_number         │
└─────────────┘     │               │ seed_hash           │
                    │               │ winners             │
┌─────────────┐     │               └──────────┬──────────┘
│  sessions   │     │                          │
│─────────────│     │                          │
│ user_id (FK)│     │                          ▼
│ refresh_token│    │               ┌─────────────────────┐
│ expires_at  │     │               │    hand_actions     │
└─────────────┘     │               │─────────────────────│
                    │               │ hand_id (FK)        │
┌─────────────┐     │               │ user_id (FK)        │◄──┐
│ledger_entries│    │               │ action              │   │
│─────────────│     │               │ amount              │   │
│ debit_account│────┘               └─────────────────────┘   │
│credit_account│                                              │
│ amount       │◄─────────────────────────────────────────────┘
│ reference    │
└─────────────┘
```

---

## Core Tables

### users
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
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until      TEXT,
  
  -- Role & status
  role              TEXT DEFAULT 'player',  -- player | vip | admin | superadmin
  status            TEXT DEFAULT 'active',  -- active | suspended | banned
  
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
```

### auth_methods
```sql
CREATE TABLE auth_methods (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,  -- email | google | github
  provider_id       TEXT,           -- OAuth subject ID
  linked_at         TEXT DEFAULT (datetime('now')),
  
  UNIQUE(provider, provider_id)
);

CREATE INDEX idx_auth_methods_user ON auth_methods(user_id);
CREATE INDEX idx_auth_methods_provider ON auth_methods(provider, provider_id);
```

### sessions
```sql
CREATE TABLE sessions (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token     TEXT UNIQUE NOT NULL,
  user_agent        TEXT,
  ip_address        TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  expires_at        TEXT NOT NULL,
  revoked_at        TEXT
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_refresh ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

### password_resets
```sql
CREATE TABLE password_resets (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token             TEXT UNIQUE NOT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  expires_at        TEXT NOT NULL,
  used_at           TEXT
);

CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);
```

---

## Bot Tables

### bot_players
```sql
CREATE TABLE bot_players (
  id                TEXT PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  display_name      TEXT NOT NULL,
  avatar_url        TEXT,
  
  -- Model configuration (JSON)
  -- { provider, modelId, baseUrl, apiKey, presets: { temperature, contextSize, ... } }
  model_config      TEXT NOT NULL,
  
  -- Personality (JSON)
  -- { style, aggression, tightness, bluffFreq, systemPrompt, thinkTimeMs, ... }
  personality       TEXT NOT NULL,
  
  -- Deliberation config (JSON)
  -- { enabled, maxSteps, questions, stepTimeoutMs }
  deliberation      TEXT NOT NULL,
  
  -- Metadata
  created_at        TEXT DEFAULT (datetime('now')),
  created_by        TEXT REFERENCES users(id),
  updated_at        TEXT,
  is_active         INTEGER DEFAULT 1,
  is_public         INTEGER DEFAULT 1
);

CREATE INDEX idx_bot_players_slug ON bot_players(slug);
CREATE INDEX idx_bot_players_active ON bot_players(is_active);
```

---

## Game Tables

### tables
```sql
CREATE TABLE tables (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  max_players       INTEGER DEFAULT 9,
  small_blind       INTEGER NOT NULL,
  big_blind         INTEGER NOT NULL,
  min_buy_in        INTEGER NOT NULL,
  max_buy_in        INTEGER NOT NULL,
  status            TEXT DEFAULT 'waiting',  -- waiting | active | closed
  is_private        INTEGER DEFAULT 0,
  invite_code       TEXT UNIQUE,
  created_at        TEXT DEFAULT (datetime('now')),
  created_by        TEXT REFERENCES users(id)
);

CREATE INDEX idx_tables_slug ON tables(slug);
CREATE INDEX idx_tables_status ON tables(status);
```

### hands
```sql
CREATE TABLE hands (
  id                TEXT PRIMARY KEY,        -- UUID
  table_id          TEXT NOT NULL REFERENCES tables(id),
  hand_number       INTEGER NOT NULL,
  
  -- Provably fair
  server_seed       TEXT NOT NULL,           -- revealed after hand
  server_seed_hash  TEXT NOT NULL,           -- committed before hand
  client_seed       TEXT,                    -- optional user input
  deck_order        TEXT NOT NULL,           -- JSON array of card indices
  
  -- Game state
  dealer_seat       INTEGER NOT NULL,
  community_cards   TEXT,                    -- JSON array
  pot_total         INTEGER,
  
  -- Result
  winners           TEXT,                    -- JSON: [{ seat, userId, amount, handName }]
  
  -- Timestamps
  started_at        TEXT DEFAULT (datetime('now')),
  ended_at          TEXT,
  
  UNIQUE(table_id, hand_number)
);

CREATE INDEX idx_hands_table ON hands(table_id);
CREATE INDEX idx_hands_started ON hands(started_at);
```

### hand_players
```sql
CREATE TABLE hand_players (
  id                TEXT PRIMARY KEY,
  hand_id           TEXT NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  user_id           TEXT REFERENCES users(id),
  bot_player_id     TEXT REFERENCES bot_players(id),
  seat              INTEGER NOT NULL,
  start_stack       INTEGER NOT NULL,
  end_stack         INTEGER NOT NULL,
  hole_cards        TEXT,                    -- JSON array (revealed after hand)
  is_dealer         INTEGER DEFAULT 0,
  
  UNIQUE(hand_id, seat)
);

CREATE INDEX idx_hand_players_hand ON hand_players(hand_id);
CREATE INDEX idx_hand_players_user ON hand_players(user_id);
```

### hand_actions
```sql
CREATE TABLE hand_actions (
  id                TEXT PRIMARY KEY,
  hand_id           TEXT NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  user_id           TEXT REFERENCES users(id),
  bot_player_id     TEXT REFERENCES bot_players(id),
  action_index      INTEGER NOT NULL,
  street            TEXT NOT NULL,           -- preflop | flop | turn | river
  action            TEXT NOT NULL,           -- fold | check | call | bet | raise | all_in
  amount            INTEGER,
  timestamp         TEXT DEFAULT (datetime('now')),
  
  UNIQUE(hand_id, action_index)
);

CREATE INDEX idx_hand_actions_hand ON hand_actions(hand_id);
CREATE INDEX idx_hand_actions_street ON hand_actions(hand_id, street);
```

### bot_decisions
```sql
CREATE TABLE bot_decisions (
  id                TEXT PRIMARY KEY,        -- UUID (decisionId)
  hand_id           TEXT NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  bot_player_id     TEXT NOT NULL REFERENCES bot_players(id),
  session_id        TEXT,
  
  -- Decision
  action            TEXT NOT NULL,
  amount            INTEGER,
  
  -- Reasoning
  prompt            TEXT,
  raw_response      TEXT,
  reasoning         TEXT,
  hand_assessment   TEXT,
  
  -- Deliberation (JSON if used)
  deliberation      TEXT,                    -- { steps, totalDurationMs, confidence }
  
  -- Performance
  inference_time_ms INTEGER,
  tokens_prompt     INTEGER,
  tokens_completion INTEGER,
  is_fallback       INTEGER DEFAULT 0,
  
  -- Context
  street            TEXT NOT NULL,
  timestamp         TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_bot_decisions_hand ON bot_decisions(hand_id);
CREATE INDEX idx_bot_decisions_bot ON bot_decisions(bot_player_id);
```

---

## Economy Tables

### ledger_entries (Double-Entry Bookkeeping)
```sql
CREATE TABLE ledger_entries (
  id                TEXT PRIMARY KEY,
  debit_account     TEXT NOT NULL,           -- Account being debited (loses money)
  credit_account    TEXT NOT NULL,           -- Account being credited (gains money)
  amount            INTEGER NOT NULL,        -- Always positive
  description       TEXT NOT NULL,
  reference_type    TEXT,                    -- hand | deposit | withdrawal | bonus
  reference_id      TEXT,                    -- UUID of related entity
  created_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_ledger_debit ON ledger_entries(debit_account);
CREATE INDEX idx_ledger_credit ON ledger_entries(credit_account);
CREATE INDEX idx_ledger_reference ON ledger_entries(reference_type, reference_id);
```

### Account Types
- `user:{userId}` — Player balance
- `house:rake` — House rake collection
- `house:bonus` — Bonus pool
- `house:reserve` — Operating reserve

---

## Admin Tables

### audit_log
```sql
CREATE TABLE audit_log (
  id                TEXT PRIMARY KEY,
  actor_id          TEXT REFERENCES users(id),
  action            TEXT NOT NULL,           -- user.create, table.close, bot.update, etc.
  entity_type       TEXT,                    -- user | table | bot | hand
  entity_id         TEXT,
  details           TEXT,                    -- JSON with before/after or context
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_time ON audit_log(created_at);
```

---

## In-Memory Stores (Current Prototype)

The prototype uses globalThis singletons that will be migrated to D1:

| Store | Key | Production Table |
|-------|-----|------------------|
| GameManager | `__pokerGameManager` | tables + hands |
| HandHistory | `__pokerHandHistory__` | hands + hand_actions |
| DecisionLog | `__pokerDecisionLog__` | bot_decisions |
| Settings | `__pokerGameSettings__` | system_config (KV) |
| Drivers | `__pokerDrivers` | bot_players |
| Users | `__pokerUsers` | users |
| Sessions | `__pokerSessions` | sessions |
| BotSessions | `__botSessions__` | (memory only, ephemeral) |

---

## Migration Plan

### Phase 8A: Core Auth
1. Create users, auth_methods, sessions, password_resets tables
2. Migrate in-memory auth to D1
3. Wire JWT validation to database lookup

### Phase 8C: Bot Players
1. Create bot_players table
2. Migrate DEFAULT_DRIVERS to database
3. Create admin CRUD endpoints

### Phase 11: Hand History
1. Create hands, hand_players, hand_actions, bot_decisions tables
2. Migrate in-memory history to D1
3. Create replay endpoints
