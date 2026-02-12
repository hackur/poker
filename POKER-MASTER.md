# POKER-MASTER.md — Full-Stack Poker Platform

> **Project:** Real-money-capable Texas Hold'em with AI bot players  
> **Stack:** Next.js 15 · React 19 · TypeScript · Tailwind v4 · Cloudflare (Workers + Durable Objects + D1 + KV)  
> **Created:** 2026-02-11  
> **Status:** Planning

---

## Table of Contents

1. [Vision & Requirements](#1-vision--requirements)
2. [Architecture Overview](#2-architecture-overview)
3. [Repository Structure](#3-repository-structure)
4. [Tech Stack Details](#4-tech-stack-details)
5. [Database Schema](#5-database-schema)
6. [Poker Engine Design](#6-poker-engine-design)
7. [WebSocket Protocol](#7-websocket-protocol)
8. [AI Bot System](#8-ai-bot-system)
9. [Security & Provably Fair](#9-security--provably-fair)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [UI/UX Design](#11-uiux-design)
12. [Admin Dashboard](#12-admin-dashboard)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Phase Plan](#14-phase-plan)
15. [API Reference](#15-api-reference)
16. [Testing Strategy](#16-testing-strategy)

---

## 1. Vision & Requirements

### What We're Building
A production-quality Texas Hold'em No-Limit poker platform where:
- **Real players** create accounts, login, sit at tables, and play
- **AI bots** fill empty seats — each powered by a different LLM, clearly labeled
- **Admin** manages everything: users, tables, bots, balances, game logs
- **Security** is real-money grade (provably fair, server-authoritative, audit trail)
- **Balances** are simulated for now but the ledger system supports real currency

### Core Requirements

| Requirement | Detail |
|---|---|
| Game type | Texas Hold'em No-Limit (2-9 players) |
| Real-time | WebSocket connections via Cloudflare Durable Objects |
| AI bots | Multiple models (Claude, GPT-4, Gemini, Llama, etc.) |
| Bot labeling | Visible bot badge + model name on table at all times |
| Auth | Email/password + OAuth (Google, GitHub) |
| Admin | Full CRUD: users, tables, bots, balances, audit logs |
| Lobby | Browse tables, filter by stakes, create private tables |
| Balance | Fake currency ledger with double-entry bookkeeping |
| Security | Provably fair RNG, server-authoritative, anti-collusion |
| Hosting | Cloudflare Workers + Durable Objects + D1 + KV |
| Performance | <100ms action latency, 60fps animations |

### Non-Requirements (for now)
- Real payment processing (Stripe/crypto integration deferred)
- Tournament mode (cash games only in v1)
- Mobile native apps (responsive web only)
- Voice/video chat (text chat only)

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                    │
│  Next.js 15 App Router · React 19 · Tailwind v4         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Lobby   │  │  Table   │  │  Admin   │  │  Auth   │  │
│  │  UI      │  │  Canvas  │  │  Panel   │  │  Flow   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │
│       │              │              │              │       │
│       └──────┬───────┴──────────────┴──────┬──────┘       │
│              │ REST API                     │ WebSocket    │
└──────────────┼─────────────────────────────┼──────────────┘
               │                             │
     ┌─────────▼──────────┐      ┌───────────▼───────────┐
     │  Next.js API Routes │      │  Game Server Worker    │
     │  (Cloudflare Worker)│      │  (Durable Objects)     │
     │                     │      │                        │
     │  • Auth endpoints   │      │  • TableRoom DO        │
     │  • User CRUD        │      │  ┌──────────────────┐  │
     │  • Admin API        │      │  │ Poker Engine      │  │
     │  • Lobby data       │      │  │ (pure logic)      │  │
     │  • Balance ledger   │      │  ├──────────────────┤  │
     │                     │      │  │ Bot Controller    │  │
     │                     │      │  │ (AI model calls)  │  │
     │                     │      │  ├──────────────────┤  │
     │                     │      │  │ WebSocket Hub     │  │
     │                     │      │  │ (per-table state) │  │
     │                     │      │  └──────────────────┘  │
     └─────────┬───────────┘      └───────────┬────────────┘
               │                              │
     ┌─────────▼──────────────────────────────▼────────┐
     │                  Cloudflare D1                    │
     │  users · balances · ledger · tables · hands ·    │
     │  actions · audit_log · bot_configs                │
     └──────────────────────┬──────────────────────────┘
                            │
     ┌──────────────────────▼──────────────────────────┐
     │                  Cloudflare KV                    │
     │  sessions · rate-limits · table-listings-cache    │
     └─────────────────────────────────────────────────┘
```

### Why This Split Architecture

1. **Next.js Worker** handles UI rendering, REST API, auth — stateless, scales automatically
2. **Game Server Worker** with **Durable Objects** handles WebSocket connections and game state — each table is one Durable Object instance with in-memory state and persistent storage
3. **D1** is the single source of truth for all persistent data
4. **KV** caches hot data (session tokens, lobby listings, rate limits)

Durable Objects are critical here: they provide **single-threaded, in-memory state per table** with **WebSocket hibernation** — perfect for a card game where state must be consistent and real-time.

---

## 3. Repository Structure

```
/Volumes/JS-DEV/poker/
├── POKER-MASTER.md              # This document
├── CLAUDE.md                    # AI coding guidelines
├── package.json                 # Monorepo root (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json                   # Turborepo config
├── .env.example
│
├── apps/
│   ├── web/                     # Next.js 15 application
│   │   ├── next.config.ts
│   │   ├── open-next.config.ts  # OpenNext Cloudflare adapter
│   │   ├── wrangler.jsonc       # Wrangler config for web worker
│   │   ├── src/
│   │   │   ├── app/             # App Router pages
│   │   │   │   ├── (auth)/      # Auth group (login, register, forgot)
│   │   │   │   ├── (game)/      # Game group (lobby, table)
│   │   │   │   ├── (admin)/     # Admin group (dashboard, users, tables)
│   │   │   │   ├── api/         # API routes
│   │   │   │   └── layout.tsx
│   │   │   ├── components/      # React components
│   │   │   │   ├── table/       # Poker table components
│   │   │   │   ├── lobby/       # Lobby components
│   │   │   │   ├── admin/       # Admin components
│   │   │   │   ├── auth/        # Auth forms
│   │   │   │   └── ui/          # Shared UI primitives
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── lib/             # Client utilities
│   │   │   │   ├── ws-client.ts # WebSocket client
│   │   │   │   └── api-client.ts
│   │   │   └── stores/          # Zustand stores
│   │   │       ├── game-store.ts
│   │   │       ├── lobby-store.ts
│   │   │       └── auth-store.ts
│   │   └── public/
│   │       └── assets/          # Card images, sounds, etc.
│   │
│   └── game-server/             # Cloudflare Worker + Durable Objects
│       ├── wrangler.jsonc
│       ├── src/
│       │   ├── index.ts         # Worker entry, routes WS upgrades
│       │   ├── table-room.ts    # TableRoom Durable Object
│       │   ├── bot-controller.ts
│       │   └── ws-protocol.ts   # Message types + serialization
│       └── tsconfig.json
│
├── packages/
│   ├── poker-engine/            # Pure game logic (zero dependencies)
│   │   ├── src/
│   │   │   ├── deck.ts          # Card, Deck, Shuffle (provably fair)
│   │   │   ├── hand-eval.ts     # Hand ranking + comparison
│   │   │   ├── game-state.ts    # Game state machine
│   │   │   ├── betting.ts       # Betting round logic, side pots
│   │   │   ├── blinds.ts        # Blind structure
│   │   │   ├── showdown.ts      # Winner determination
│   │   │   └── types.ts         # All poker types
│   │   ├── __tests__/           # Comprehensive unit tests
│   │   └── package.json
│   │
│   ├── ai-players/              # AI bot strategy + model integration
│   │   ├── src/
│   │   │   ├── bot-strategy.ts  # Base strategy interface
│   │   │   ├── models/
│   │   │   │   ├── claude.ts    # Anthropic Claude strategy
│   │   │   │   ├── gpt.ts       # OpenAI GPT strategy
│   │   │   │   ├── gemini.ts    # Google Gemini strategy
│   │   │   │   ├── llama.ts     # Meta Llama strategy
│   │   │   │   └── random.ts    # Random bot (testing)
│   │   │   ├── prompt-builder.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── db/                      # Database schema + migrations
│   │   ├── migrations/
│   │   ├── schema.sql
│   │   ├── seed.sql
│   │   └── package.json
│   │
│   └── shared/                  # Shared types, constants, utils
│       ├── src/
│       │   ├── types.ts         # Cross-package types
│       │   ├── constants.ts     # Game constants, limits
│       │   ├── validation.ts    # Zod schemas
│       │   └── crypto.ts        # Provably fair crypto utils
│       └── package.json
│
├── scripts/
│   ├── setup-d1.sh              # Create D1 database + run migrations
│   ├── deploy.sh                # Deploy both workers
│   └── seed-bots.ts             # Create default bot configurations
│
└── docs/
    ├── websocket-protocol.md
    ├── provably-fair.md
    └── admin-guide.md
```

---

## 4. Tech Stack Details

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.x (latest) | App Router, SSR, API routes |
| React | 19.x | UI rendering |
| TypeScript | 5.x | Type safety everywhere |
| Tailwind CSS | 4.x | Styling |
| Zustand | 5.x | Client state management |
| Framer Motion | 11.x | Card/chip animations |
| Zod | 3.x | Runtime validation |

### Backend / Infrastructure
| Technology | Purpose |
|---|---|
| Cloudflare Workers | Serverless compute (Next.js + Game Server) |
| Durable Objects | Stateful WebSocket rooms (one per table) |
| Cloudflare D1 | SQLite database (users, games, ledger) |
| Cloudflare KV | Session cache, rate limiting |
| OpenNext (@opennextjs/cloudflare) | Next.js → Cloudflare Workers adapter |
| Wrangler | Cloudflare CLI for dev + deploy |

### AI / Bot Infrastructure
| Model | Provider | Use Case |
|---|---|---|
| Claude Sonnet 4 | Anthropic | Strategic, balanced play |
| Claude Haiku | Anthropic | Fast, simple decisions |
| GPT-4o | OpenAI | Aggressive, analytical play |
| GPT-4o-mini | OpenAI | Budget bot option |
| Gemini 2.5 Flash | Google | Quick decisions |
| Llama 3.3 70B | via OpenRouter | Open-source option |
| Random Bot | Internal | Testing / easy opponent |

### Build / Dev
| Tool | Purpose |
|---|---|
| pnpm | Package manager (workspaces) |
| Turborepo | Monorepo build orchestration |
| Vitest | Unit + integration tests |
| Playwright | E2E tests |
| ESLint + Prettier | Code quality |

---

## 5. Database Schema

### Core Tables

```sql
-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email           TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  password_hash   TEXT,                    -- null for OAuth-only users
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'player'  -- 'player' | 'admin' | 'superadmin'
  is_bot          INTEGER NOT NULL DEFAULT 0,
  bot_model       TEXT,                    -- e.g. 'claude-sonnet-4', 'gpt-4o'
  bot_config_id   TEXT REFERENCES bot_configs(id),
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'banned'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at   TEXT
);

CREATE TABLE oauth_accounts (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,           -- 'google' | 'github'
  provider_id     TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_id)
);

CREATE TABLE sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at      TEXT NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- BALANCE & LEDGER (Double-Entry Bookkeeping)
-- ============================================================

CREATE TABLE accounts (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id         TEXT REFERENCES users(id),
  type            TEXT NOT NULL,           -- 'player_balance' | 'house' | 'rake' | 'bonus'
  currency        TEXT NOT NULL DEFAULT 'chips',
  balance         INTEGER NOT NULL DEFAULT 0, -- stored in smallest unit (cents/chips)
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, type, currency)
);

CREATE TABLE ledger_entries (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  debit_account   TEXT NOT NULL REFERENCES accounts(id),
  credit_account  TEXT NOT NULL REFERENCES accounts(id),
  amount          INTEGER NOT NULL CHECK(amount > 0),
  currency        TEXT NOT NULL DEFAULT 'chips',
  description     TEXT NOT NULL,
  reference_type  TEXT,                    -- 'hand' | 'deposit' | 'withdrawal' | 'bonus' | 'rake'
  reference_id    TEXT,                    -- FK to relevant record
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  created_by      TEXT REFERENCES users(id)
);

-- ============================================================
-- TABLES & GAMES
-- ============================================================

CREATE TABLE tables (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  max_players     INTEGER NOT NULL DEFAULT 9 CHECK(max_players BETWEEN 2 AND 9),
  small_blind     INTEGER NOT NULL,
  big_blind       INTEGER NOT NULL,
  min_buy_in      INTEGER NOT NULL,
  max_buy_in      INTEGER NOT NULL,
  ante            INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'active' | 'paused' | 'closed'
  is_private      INTEGER NOT NULL DEFAULT 0,
  invite_code     TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE table_seats (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  table_id        TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  seat_number     INTEGER NOT NULL CHECK(seat_number BETWEEN 0 AND 8),
  user_id         TEXT REFERENCES users(id),
  stack           INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'empty', -- 'empty' | 'seated' | 'sitting_out' | 'disconnected'
  joined_at       TEXT,
  UNIQUE(table_id, seat_number),
  UNIQUE(table_id, user_id)              -- one seat per player per table
);

-- ============================================================
-- HAND HISTORY (Provably Fair)
-- ============================================================

CREATE TABLE hands (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  table_id        TEXT NOT NULL REFERENCES tables(id),
  hand_number     INTEGER NOT NULL,
  dealer_seat     INTEGER NOT NULL,
  server_seed     TEXT NOT NULL,           -- revealed after hand
  server_seed_hash TEXT NOT NULL,          -- committed before hand (SHA-256)
  client_seed     TEXT,                    -- optional: player-contributed entropy
  deck_order      TEXT NOT NULL,           -- JSON array of card indices (revealed after)
  community_cards TEXT,                    -- JSON array ['Ah', 'Kd', '7s', '2c', 'Jh']
  pot_total       INTEGER,
  rake_amount     INTEGER DEFAULT 0,
  winners         TEXT,                    -- JSON: [{ userId, amount, hand_rank }]
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at        TEXT,
  UNIQUE(table_id, hand_number)
);

CREATE TABLE hand_players (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  hand_id         TEXT NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id),
  seat_number     INTEGER NOT NULL,
  hole_cards      TEXT,                    -- JSON: ['Ah', 'Kd'] (encrypted until showdown)
  stack_start     INTEGER NOT NULL,
  stack_end       INTEGER,
  net_result      INTEGER,                 -- + or - chips
  showed_cards    INTEGER NOT NULL DEFAULT 0,
  is_winner       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE hand_actions (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  hand_id         TEXT NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id),
  action_index    INTEGER NOT NULL,        -- sequential action number within hand
  street          TEXT NOT NULL,            -- 'preflop' | 'flop' | 'turn' | 'river'
  action          TEXT NOT NULL,            -- 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in'
  amount          INTEGER,
  pot_after       INTEGER,
  timestamp       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hand_id, action_index)
);

-- ============================================================
-- BOT CONFIGURATION
-- ============================================================

CREATE TABLE bot_configs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name            TEXT NOT NULL,           -- e.g. 'Claude the Calculator'
  model_provider  TEXT NOT NULL,           -- 'anthropic' | 'openai' | 'google' | 'openrouter'
  model_id        TEXT NOT NULL,           -- 'claude-sonnet-4-20250514'
  display_model   TEXT NOT NULL,           -- 'Claude Sonnet 4' (shown to players)
  avatar_url      TEXT,
  personality     TEXT,                    -- System prompt personality flavor
  play_style      TEXT NOT NULL DEFAULT 'balanced', -- 'tight' | 'loose' | 'aggressive' | 'passive' | 'balanced'
  skill_level     TEXT NOT NULL DEFAULT 'intermediate', -- 'beginner' | 'intermediate' | 'advanced' | 'expert'
  think_time_ms   INTEGER NOT NULL DEFAULT 3000, -- Simulated think delay (feels human)
  temperature     REAL NOT NULL DEFAULT 0.7,
  enabled         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- AUDIT & SECURITY
-- ============================================================

CREATE TABLE audit_log (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  actor_id        TEXT REFERENCES users(id),
  action          TEXT NOT NULL,           -- 'login' | 'balance_adjust' | 'table_create' | 'ban_user' | etc.
  entity_type     TEXT,                    -- 'user' | 'table' | 'hand' | 'balance'
  entity_id       TEXT,
  details         TEXT,                    -- JSON with action-specific data
  ip_address      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE rate_limits (
  key             TEXT PRIMARY KEY,        -- 'login:{ip}' | 'action:{userId}'
  count           INTEGER NOT NULL DEFAULT 1,
  window_start    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE INDEX idx_ledger_debit ON ledger_entries(debit_account);
CREATE INDEX idx_ledger_credit ON ledger_entries(credit_account);
CREATE INDEX idx_ledger_ref ON ledger_entries(reference_type, reference_id);
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_seats_table ON table_seats(table_id);
CREATE INDEX idx_seats_user ON table_seats(user_id);
CREATE INDEX idx_hands_table ON hands(table_id);
CREATE INDEX idx_hand_players_hand ON hand_players(hand_id);
CREATE INDEX idx_hand_players_user ON hand_players(user_id);
CREATE INDEX idx_hand_actions_hand ON hand_actions(hand_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

---

## 6. Poker Engine Design

The poker engine is a **pure logic package** with zero side effects. No I/O, no network, no database. Just state in → state out. This makes it testable, portable, and trustworthy.

### State Machine

```
  ┌──────────┐
  │  WAITING  │  (need 2+ players to start)
  └────┬──────┘
       │ enough players seated
       ▼
  ┌──────────┐
  │  DEALING  │  Post blinds, deal hole cards, commit seed hash
  └────┬──────┘
       │
       ▼
  ┌──────────┐
  │ PRE-FLOP │  First betting round (left of BB acts first)
  └────┬──────┘
       │ round complete
       ▼
  ┌──────────┐
  │   FLOP   │  Deal 3 community cards, betting round
  └────┬──────┘
       │
       ▼
  ┌──────────┐
  │   TURN   │  Deal 1 community card, betting round
  └────┬──────┘
       │
       ▼
  ┌──────────┐
  │   RIVER  │  Deal 1 community card, final betting round
  └────┬──────┘
       │
       ▼
  ┌──────────┐
  │ SHOWDOWN │  Evaluate hands, determine winner(s), distribute pot(s)
  └────┬──────┘
       │
       ▼
  ┌──────────┐
  │  SETTLE  │  Update stacks, record to DB, reveal seed, rotate dealer
  └────┬──────┘
       │ loop back
       ▼
  ┌──────────┐
  │  DEALING  │  (next hand)
  └──────────┘
```

### Hand Evaluation Algorithm

Use a **lookup-table-based evaluator** for speed (evaluates ~100M hands/sec):

```typescript
// Hand rankings (higher = better)
enum HandRank {
  HIGH_CARD       = 1,
  ONE_PAIR        = 2,
  TWO_PAIR        = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT        = 5,
  FLUSH           = 6,
  FULL_HOUSE      = 7,
  FOUR_OF_A_KIND  = 8,
  STRAIGHT_FLUSH  = 9,
  ROYAL_FLUSH     = 10,
}

interface HandResult {
  rank: HandRank;
  score: number;       // Unique score for comparison (includes kickers)
  cards: Card[];       // Best 5-card hand
  description: string; // "Pair of Aces, King kicker"
}
```

Best 5 from 7 cards (2 hole + 5 community) = 21 combinations. Pre-computed lookup tables make this instant.

### Side Pot Logic

Critical for all-in scenarios:

```typescript
interface Pot {
  amount: number;
  eligible: string[];  // userIds who can win this pot
}

// When player goes all-in with less than current bet:
// 1. Main pot capped at all-in player's contribution × eligible players
// 2. Side pot created for remaining bets
// 3. Recursive for multiple all-ins at different levels
```

### Action Validation

Server validates EVERY action. Client only sends intent:

```typescript
interface PlayerAction {
  type: 'fold' | 'check' | 'call' | 'bet' | 'raise';
  amount?: number;  // Required for bet/raise
}

function getValidActions(state: GameState, playerId: string): ValidAction[] {
  // Returns ONLY the legal actions for this player right now
  // Includes min/max bet amounts
  // Client renders buttons based on this
}
```

---

## 7. WebSocket Protocol

### Connection Flow

```
1. Client authenticates via REST → receives session token
2. Client opens WebSocket: wss://game.poker.example.com/table/{tableId}?token={sessionToken}
3. Game Server Worker routes to TableRoom Durable Object
4. Durable Object validates token, adds player to room
5. Bidirectional messages flow until disconnect
```

### Message Format

All messages are JSON with a discriminated union type:

```typescript
// ============================================================
// Client → Server Messages
// ============================================================

type ClientMessage =
  | { type: 'join_table'; seat?: number }
  | { type: 'leave_table' }
  | { type: 'sit_out' }
  | { type: 'sit_in' }
  | { type: 'action'; action: PlayerAction }
  | { type: 'chat'; text: string }
  | { type: 'ping' }

// ============================================================
// Server → Client Messages
// ============================================================

type ServerMessage =
  | { type: 'table_state'; state: TableView }       // Full state on join
  | { type: 'player_joined'; seat: number; player: PublicPlayerInfo }
  | { type: 'player_left'; seat: number; userId: string }
  | { type: 'hand_start'; handId: string; dealer: number; seedHash: string }
  | { type: 'hole_cards'; cards: [Card, Card] }      // Only to the owning player
  | { type: 'action_on'; seat: number; validActions: ValidAction[]; timeoutMs: number }
  | { type: 'player_action'; seat: number; action: PlayerAction }
  | { type: 'community_cards'; street: Street; cards: Card[] }
  | { type: 'pot_update'; pots: Pot[] }
  | { type: 'showdown'; results: ShowdownResult[] }
  | { type: 'hand_end'; winners: WinnerInfo[]; seed: string; salt: string }
  | { type: 'chat'; userId: string; text: string; isBot: boolean }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' }
```

### Key Design Decisions

1. **Server-authoritative**: Client never sees other players' hole cards until showdown
2. **TableView**: Each player gets a personalized view (their own cards, public info for others)
3. **Seed commitment**: `seedHash` sent at hand start, `seed` + `salt` revealed at hand end
4. **Action timeout**: 30 seconds default, configurable per table. Auto-fold on timeout.
5. **Reconnection**: Client can reconnect mid-hand and receive full `table_state`

### WebSocket Hibernation

Durable Objects support [WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/#websocket-hibernation) — the DO can sleep between messages, drastically reducing costs. We'll use this:

```typescript
export class TableRoom extends DurableObject {
  async webSocketMessage(ws: WebSocket, message: string) {
    // Handle message, then DO hibernates until next message
  }

  async webSocketClose(ws: WebSocket) {
    // Handle disconnect, start reconnection timer
  }
}
```

---

## 8. AI Bot System

### Architecture

Bots are **server-side players** that live inside the Durable Object. They don't use WebSocket connections — they're called directly by the game loop:

```typescript
class BotController {
  async getAction(
    botConfig: BotConfig,
    gameState: BotGameView,
    validActions: ValidAction[]
  ): Promise<PlayerAction> {
    // 1. Build prompt with game state
    // 2. Call AI model API
    // 3. Parse response into valid action
    // 4. Fallback to rule-based if API fails
    // 5. Apply simulated think delay
    return action;
  }
}
```

### Prompt Design

Each bot receives a carefully structured prompt:

```
You are playing Texas Hold'em poker. You are {botName}, a {playStyle} player.

Current hand state:
- Your cards: {holeCards}
- Community cards: {communityCards}
- Pot: {potSize}
- Your stack: {stack}
- Position: {position} (dealer/small blind/big blind/early/middle/late)

Players at table:
{playerList with stacks, current bets, and status}

Betting history this hand:
{actionHistory}

Your valid actions:
{validActions with min/max amounts}

Respond with ONLY a JSON object:
{ "action": "fold|check|call|bet|raise", "amount": <number if bet/raise>, "reasoning": "<brief thought>" }

The reasoning is logged but never shown to other players.
```

### Bot Personalities

| Bot Name | Model | Style | Description |
|---|---|---|---|
| Claude the Calculator | Claude Sonnet 4 | Tight-Aggressive | Mathematical, pot-odds focused, selective but deadly |
| GPT Grinder | GPT-4o | Loose-Aggressive | Plays many hands, pressures with large bets |
| Gemini Flash | Gemini 2.5 Flash | Tight-Passive | Careful, calls more than raises, waits for premium hands |
| Llama Luck | Llama 3.3 70B | Loose-Passive | Calls too much, occasionally gets lucky |
| Haiku Hustler | Claude Haiku | Balanced | Fast decisions, solid fundamental play |
| RNG Randy | Random | Random | Pure chaos — teaching tool / easy opponent |

### Bot Labels (Non-Negotiable)

Bots are ALWAYS clearly labeled:
- **Table avatar**: Robot icon overlay + model name badge
- **Name plate**: "{BotName} 🤖 (Claude Sonnet 4)"
- **Chat messages**: "[BOT] Claude the Calculator: Nice hand!"
- **Lobby listing**: "3 players, 2 bots" clearly shown
- **Cannot impersonate humans**: No way to remove the bot label

### Failover Strategy

If AI API call fails:
1. **Retry once** (with backoff)
2. **Fall back to rule-based engine** using the configured play style
3. **Log the failure** for admin review
4. **Never stall the game** — bot must act within timeout

---

## 9. Security & Provably Fair

### Provably Fair Card Shuffling

This is what makes the platform auditable and trustworthy:

```
Before hand:
  1. Server generates: serverSeed = crypto.randomUUID()
  2. Server generates: salt = crypto.randomUUID()
  3. Server computes: seedHash = SHA-256(serverSeed + salt)
  4. Server sends seedHash to all players (commitment)
  5. (Optional) Players contribute clientSeed for additional entropy

Shuffling:
  5. combinedSeed = SHA-256(serverSeed + salt + clientSeed)
  6. Use combinedSeed as PRNG seed (Fisher-Yates shuffle)
  7. Deck order is deterministic from seed

After hand:
  8. Server reveals serverSeed + salt
  9. Players can verify: SHA-256(serverSeed + salt) === seedHash
  10. Players can re-derive deck order from seeds
  11. Hand history + seeds stored permanently
```

### Server-Authoritative Security

| Threat | Mitigation |
|---|---|
| Client sends invalid action | Server validates ALL actions against game state |
| Client claims wrong cards | Client never receives other players' cards |
| Man-in-the-middle | WSS (TLS) for all connections |
| Session hijacking | Cryptographic session tokens, IP binding, expiry |
| Balance manipulation | Double-entry ledger — every chip is accounted for |
| Bot collusion | All bot decisions logged with reasoning; admin can audit |
| Replay attacks | Each action has a unique sequential index per hand |
| Rate abuse | Rate limiting on actions, connections, and API calls |
| SQL injection | Parameterized queries only (D1 bindings) |
| XSS | React escapes by default + CSP headers |
| CSRF | SameSite cookies + CSRF tokens on mutations |

### Rate Limiting

```typescript
// Per-user limits
const LIMITS = {
  actions_per_second: 2,      // Poker actions
  chat_per_minute: 10,        // Chat messages
  table_joins_per_minute: 5,  // Table join attempts
  login_per_hour: 10,         // Login attempts per IP
};
```

### Audit Trail

Every significant action is logged:
- Login/logout events
- Balance changes (with before/after)
- Table creation/closure
- Player bans/unbans
- Admin actions
- Bot configuration changes
- Hand results with full action history

---

## 10. Authentication & Authorization

### Auth Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│  Server  │────▶│  D1 DB   │
│  Form    │     │  Verify  │     │  Lookup   │
└──────────┘     └────┬─────┘     └──────────┘
                      │
                      ▼
              ┌──────────────┐
              │  Set Cookie  │  httpOnly, secure, sameSite
              │  + KV Token  │  (session stored in KV for speed)
              └──────────────┘
```

### Implementation

- **Password hashing**: Argon2id (via @node-rs/argon2 or Web Crypto PBKDF2 for Workers)
- **Sessions**: Cryptographic random token → stored in KV with TTL
- **Cookies**: `httpOnly`, `secure`, `sameSite=strict`, `path=/`
- **OAuth**: Google + GitHub via Auth.js adapter (or manual OAuth2 flow)

### Role-Based Access

```typescript
type Role = 'player' | 'admin' | 'superadmin';

const PERMISSIONS: Record<Role, string[]> = {
  player: ['play', 'chat', 'view_own_history', 'view_own_balance'],
  admin: ['...player', 'view_all_users', 'manage_tables', 'manage_bots', 'view_audit_log', 'adjust_balances'],
  superadmin: ['...admin', 'manage_admins', 'system_config', 'delete_users'],
};
```

---

## 11. UI/UX Design

### Page Structure

```
/                     → Landing page (hero + features + CTA)
/login                → Login form
/register             → Registration form
/lobby                → Table browser + quick-join + create table
/table/{slug}         → Poker table (game play)
/profile              → User profile + stats + hand history
/admin                → Admin dashboard (requires admin role)
/admin/users          → User management
/admin/tables         → Table management
/admin/bots           → Bot configuration
/admin/audit          → Audit log viewer
/admin/economy        → Balance overview + adjustments
/provably-fair/{id}   → Public hand verification page
```

### Poker Table UI

```
┌─────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐ │
│  │              COMMUNITY CARDS                │ │
│  │         [Ah] [Kd] [7s] [2c] [??]          │ │
│  │              POT: 1,250                     │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│    [P1]          [P2]          [P3]              │
│   Jeremy       Claude🤖       GPT🤖            │
│   $5,000        $3,200        $4,100            │
│   ██████        ██████        ██████            │
│                                                  │
│  [P8]                              [P4]          │
│  (empty)                         Gemini🤖        │
│                                   $2,800         │
│                                                  │
│    [P7]          [P6]          [P5]              │
│   (empty)       Sarah         (empty)            │
│                 $6,100                           │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  YOUR CARDS: [As] [Kh]                      │ │
│  │                                              │ │
│  │  [FOLD]  [CHECK]  [BET ▾]   Slider: $$$    │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────┐  ┌───────────────────────────────┐   │
│  │  CHAT  │  │ Hand History                   │   │
│  │  ...   │  │ #42: Won $800 with pair of K's │   │
│  └────────┘  └───────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### Design Tokens

- **Felt green**: `#0d5c2e` (table surface)
- **Card white**: `#fafaf9` with subtle shadow
- **Gold accent**: `#d4a418` (chips, highlights)
- **Bot badge**: `#6366f1` (indigo) with robot icon
- **Danger red**: `#ef4444` (fold, warnings)
- **Dark background**: `#0a0a0a` (lobby, admin)

### Animations (Framer Motion)

- Card dealing: slide from deck to player position (200ms stagger)
- Card flip: 3D rotation reveal
- Chip movement: fly from player to pot (and back to winner)
- Player action: highlight + text pop
- Timer: circular countdown around avatar
- Win celebration: subtle pulse + chip shower

---

## 12. Admin Dashboard

### Dashboard Home
- Active tables count + players online
- Revenue (rake collected today/week/month)
- Active bots and their win rates
- Recent audit log entries
- System health (WebSocket connections, error rates)

### User Management
- Search/filter users by email, username, status, role
- View user profile: balance history, hands played, win rate
- Actions: suspend, ban, adjust balance, change role
- All actions logged to audit trail

### Table Management
- Create/edit/close tables
- Set blinds, buy-in range, max players
- Assign bots to specific tables
- View active table state (live peek)

### Bot Configuration
- Create/edit bot profiles
- Configure model, play style, personality, think time
- Enable/disable bots
- View bot performance stats (hands, win rate, chips won/lost)
- API key management per provider

### Economy Dashboard
- Total chips in circulation
- House balance (rake collected)
- Top balances leaderboard
- Ledger audit: every chip transfer is traceable
- Bulk balance adjustments (e.g., give all players 1000 chips)

### Audit Log
- Filterable by action type, actor, date range
- Full details view for each entry
- Export to CSV

---

## 13. Deployment Architecture

### Two Workers Approach

```
                 ┌──────────────────────────┐
                 │      Cloudflare CDN       │
                 │    (static assets, SSL)   │
                 └──────────┬───────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
    ┌─────────▼─────────┐     ┌───────────▼──────────┐
    │   poker-web        │     │   poker-game-server   │
    │   (Worker)         │     │   (Worker + DO)       │
    │                    │     │                       │
    │   Next.js SSR      │     │   WebSocket handler   │
    │   API Routes       │     │   TableRoom DO        │
    │   Auth             │     │   Bot Controller      │
    │   Admin UI         │     │                       │
    │                    │     │   Bindings:            │
    │   Bindings:        │     │   - D1 (read/write)   │
    │   - D1 (read/write)│     │   - KV (sessions)     │
    │   - KV (sessions)  │     │   - Service binding    │
    │   - Service binding │     │     to web worker     │
    │     to game-server │     │                       │
    └────────────────────┘     └───────────────────────┘
              │                           │
              └───────────┬───────────────┘
                          │
              ┌───────────▼───────────────┐
              │     Cloudflare D1          │
              │     (poker-db)             │
              └───────────────────────────┘
```

### Wrangler Config (Game Server)

```jsonc
// apps/game-server/wrangler.jsonc
{
  "name": "poker-game-server",
  "main": "src/index.ts",
  "compatibility_date": "2025-12-01",
  "durable_objects": {
    "bindings": [
      {
        "name": "TABLE_ROOM",
        "class_name": "TableRoom"
      }
    ]
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "poker-db",
      "database_id": "<to-be-created>"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "SESSION_KV",
      "id": "<to-be-created>"
    }
  ],
  "vars": {
    "ENVIRONMENT": "production"
  }
}
```

### Custom Domain Setup

- `poker.jeremysarda.com` → web worker (or a standalone domain)
- `game.poker.jeremysarda.com` → game-server worker (WebSocket endpoint)
- Both behind Cloudflare SSL

### Deploy Script

```bash
#!/bin/bash
# scripts/deploy.sh
set -euo pipefail

echo "🏗️  Building packages..."
pnpm turbo build

echo "🎮 Deploying game server..."
cd apps/game-server
npx wrangler deploy

echo "🌐 Deploying web app..."
cd ../web
npx wrangler deploy

echo "✅ Deployment complete!"
```

---

## 14. Phase Plan

### Phase 1: Foundation (Est. 12-16 hours)
- [x] Project planning (this document)
- [ ] Monorepo setup (pnpm + Turborepo + TypeScript)
- [ ] `poker-engine` package: deck, shuffle, hand evaluation, game state machine
- [ ] Comprehensive unit tests for poker engine (100+ test cases)
- [ ] `shared` package: types, constants, validation schemas
- [ ] `db` package: schema, migrations, seed data

### Phase 2: Game Server (Est. 10-14 hours)
- [ ] Cloudflare Worker + Durable Object skeleton
- [ ] WebSocket connection handling + hibernation
- [ ] TableRoom: join/leave/reconnect
- [ ] Game loop integration (dealing → betting → showdown)
- [ ] Provably fair seed commitment + reveal
- [ ] Action validation + timeout handling

### Phase 3: Web App Core (Est. 14-18 hours)
- [ ] Next.js 15 setup with OpenNext Cloudflare adapter
- [ ] Auth system (email/password + Google OAuth)
- [ ] Landing page
- [ ] Lobby page (table listings, filters, create table)
- [ ] Profile page (balance, stats, history)
- [ ] WebSocket client library + Zustand game store

### Phase 4: Poker Table UI (Est. 16-20 hours)
- [ ] Table canvas component (felt, seats, cards)
- [ ] Card rendering (SVG or image sprites)
- [ ] Player seat components (avatar, name, stack, action indicator)
- [ ] Action panel (fold, check, call, bet/raise with slider)
- [ ] Community cards display
- [ ] Pot display + side pots
- [ ] Chat panel
- [ ] Hand history sidebar
- [ ] Animations (deal, flip, chips, win)

### Phase 5: AI Bot System (Est. 10-14 hours)
- [ ] `ai-players` package: strategy interface
- [ ] Prompt builder for game state
- [ ] Claude integration (Anthropic API)
- [ ] GPT integration (OpenAI API)
- [ ] Gemini integration (Google AI API)
- [ ] Random bot (testing)
- [ ] Bot controller in Durable Object
- [ ] Fallback to rule-based on API failure
- [ ] Think-time simulation

### Phase 6: Admin Dashboard (Est. 10-14 hours)
- [ ] Admin layout + navigation
- [ ] Dashboard home (stats, charts)
- [ ] User management (list, search, actions)
- [ ] Table management (CRUD, live peek)
- [ ] Bot configuration (CRUD, stats)
- [ ] Economy dashboard (balances, ledger)
- [ ] Audit log viewer (filter, detail, export)

### Phase 7: Polish & Security (Est. 8-10 hours)
- [ ] Rate limiting middleware
- [ ] CSP headers + security hardening
- [ ] Error boundaries + graceful degradation
- [ ] Loading states + skeleton screens
- [ ] Responsive design (tablet + mobile)
- [ ] Sound effects (optional toggle)
- [ ] Provably fair verification page

### Phase 8: Deploy & Test (Est. 4-6 hours)
- [ ] Create D1 database + KV namespaces
- [ ] Deploy game server worker
- [ ] Deploy web worker
- [ ] Custom domain setup
- [ ] E2E testing with Playwright
- [ ] Load testing (multiple tables, many connections)
- [ ] Security audit checklist

### Total Estimated: 84-112 hours

---

## 15. API Reference

### REST Endpoints (Next.js API Routes)

```
AUTH
  POST   /api/auth/register      { email, username, password }
  POST   /api/auth/login         { email, password }
  POST   /api/auth/logout
  GET    /api/auth/session        → current user info
  GET    /api/auth/google         → OAuth redirect
  GET    /api/auth/google/callback

USERS
  GET    /api/users/me            → profile + balance
  PATCH  /api/users/me            { displayName, avatar }
  GET    /api/users/me/history    → hand history (paginated)
  GET    /api/users/me/stats      → win rate, hands played, etc.

LOBBY
  GET    /api/tables              → list active tables
  POST   /api/tables              { name, blinds, buyIn, maxPlayers }
  GET    /api/tables/:slug        → table details + seats
  POST   /api/tables/:slug/join   { seatNumber?, buyInAmount }
  DELETE /api/tables/:slug        → close table (admin)

PROVABLY FAIR
  GET    /api/hands/:id/verify    → seed + deck order for verification

ADMIN
  GET    /api/admin/users         → all users (paginated, filterable)
  PATCH  /api/admin/users/:id     { role, status }
  POST   /api/admin/users/:id/balance  { amount, description }
  GET    /api/admin/tables        → all tables (inc. closed)
  GET    /api/admin/bots          → bot configurations
  POST   /api/admin/bots          { name, model, style, ... }
  PATCH  /api/admin/bots/:id      { ...updates }
  DELETE /api/admin/bots/:id
  GET    /api/admin/audit         → audit log (paginated, filterable)
  GET    /api/admin/economy       → aggregate balance stats
```

### WebSocket Endpoint

```
wss://game.poker.example.com/table/{tableId}?token={sessionToken}
```

See Section 7 for full message protocol.

---

## 16. Testing Strategy

### Unit Tests (Vitest)

**poker-engine** (highest priority — game integrity depends on this):
- Deck: shuffle determinism, no duplicates, 52 cards
- Hand evaluation: every hand rank (Royal Flush → High Card)
- Hand comparison: same rank with different kickers
- Betting: min bet, max bet, all-in, side pots
- Game state transitions: valid sequence, invalid actions rejected
- Edge cases: heads-up, split pots, multiple side pots, one player left

**Target: 200+ test cases for poker-engine alone**

### Integration Tests

- WebSocket connection lifecycle (connect, auth, join, play, disconnect, reconnect)
- Full hand simulation (deal → showdown)
- Bot decision pipeline (API call → parse → validate → execute)
- Ledger integrity (sum of all balances = constant)

### E2E Tests (Playwright)

- Register → login → join table → play hand → leave
- Two browsers playing against each other
- Bot filling a seat and making decisions
- Admin: create table, manage bots, adjust balance
- Provably fair verification flow

### Load Tests

- 50 concurrent WebSocket connections per table
- 20 simultaneous tables
- Bot API latency under load

---

## Appendix: Key Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| WebSocket vs WebRTC | WebSocket (via Durable Objects) | Card games are low-bandwidth, ordered messages — WS is simpler and more reliable. WebRTC's peer-to-peer model is wrong for poker (server must be authoritative). |
| Monorepo vs Polyrepo | Monorepo (pnpm + Turborepo) | Shared types, shared poker engine, atomic deploys |
| Auth library | Custom (session tokens in KV) | Auth.js has poor Cloudflare Workers support. Custom is simpler and gives full control. |
| State management | Zustand | Lightweight, TypeScript-native, no boilerplate |
| Animation | Framer Motion | Best React animation library, CSS-in-JS-free |
| D1 vs external DB | D1 | Same Cloudflare network, zero-latency from Workers, free tier generous |
| Card rendering | CSS/SVG | No image loading, infinite customization, crisp at any size |
| Bot API calls | Direct from Durable Object | No extra hop, stays within game loop, handles timeouts |

---

*This document is the single source of truth. Update it as decisions change.*
