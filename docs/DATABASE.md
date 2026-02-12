# Database Schema

> **Current:** In-memory (prototype)  
> **Production:** Cloudflare D1 (SQLite)

## Core Tables

### users
```sql
CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  password_hash   TEXT,
  role            TEXT DEFAULT 'player',  -- player | admin | superadmin
  is_bot          INTEGER DEFAULT 0,
  bot_model       TEXT,
  balance         INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active',
  created_at      TEXT DEFAULT (datetime('now'))
);
```

### tables
```sql
CREATE TABLE tables (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  max_players     INTEGER DEFAULT 9,
  small_blind     INTEGER NOT NULL,
  big_blind       INTEGER NOT NULL,
  min_buy_in      INTEGER NOT NULL,
  max_buy_in      INTEGER NOT NULL,
  status          TEXT DEFAULT 'waiting',  -- waiting | active | closed
  created_at      TEXT DEFAULT (datetime('now'))
);
```

### hands
```sql
CREATE TABLE hands (
  id              TEXT PRIMARY KEY,
  table_id        TEXT REFERENCES tables(id),
  hand_number     INTEGER NOT NULL,
  dealer_seat     INTEGER NOT NULL,
  server_seed     TEXT NOT NULL,           -- revealed after hand
  server_seed_hash TEXT NOT NULL,          -- committed before hand
  deck_order      TEXT NOT NULL,           -- JSON array
  community_cards TEXT,                    -- JSON array
  pot_total       INTEGER,
  winners         TEXT,                    -- JSON
  started_at      TEXT DEFAULT (datetime('now')),
  ended_at        TEXT
);
```

### hand_actions
```sql
CREATE TABLE hand_actions (
  id              TEXT PRIMARY KEY,
  hand_id         TEXT REFERENCES hands(id),
  user_id         TEXT REFERENCES users(id),
  action_index    INTEGER NOT NULL,
  street          TEXT NOT NULL,           -- preflop | flop | turn | river
  action          TEXT NOT NULL,           -- fold | check | call | bet | raise | all_in
  amount          INTEGER,
  timestamp       TEXT DEFAULT (datetime('now'))
);
```

### ledger_entries (Double-Entry)
```sql
CREATE TABLE ledger_entries (
  id              TEXT PRIMARY KEY,
  debit_account   TEXT NOT NULL,
  credit_account  TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  description     TEXT NOT NULL,
  reference_type  TEXT,                    -- hand | deposit | withdrawal
  reference_id    TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);
```

### audit_log
```sql
CREATE TABLE audit_log (
  id              TEXT PRIMARY KEY,
  actor_id        TEXT,
  action          TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       TEXT,
  details         TEXT,                    -- JSON
  ip_address      TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);
```

## In-Memory Stores (Current)

The prototype uses globalThis singletons:

| Store | Key | Purpose |
|-------|-----|---------|
| GameManager | `__pokerGameManager` | Game state, tick loop |
| HandHistory | `__pokerHandHistory__` | Completed hands |
| DecisionLog | `__pokerDecisionLog__` | Bot decisions |
| Settings | `__pokerGameSettings__` | Runtime config |
| Drivers | `__pokerDrivers` | AI drivers |
| Users | `__pokerUsers` | User accounts |
| Sessions | `__pokerSessions` | Auth sessions |
