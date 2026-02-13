# ROADMAP.md -- Multi-Phase Development Plan

> **IMPORTANT:** This file contains the original roadmap. It is partially outdated.
> For the current accurate phase plan, see **`docs/ROADMAP.md`**.
>
> Key changes since this was written:
> - Demo content removed (Quick Play, AI Battle, Practice modes deleted)
> - Auth migrated to KV-backed system (`auth-kv.ts`)
> - Per-seat bot controls replace auto-fill
> - KV persistence replaces globalThis singletons for production
> - WebSocket + polling hybrid implemented

> **Project:** AI Poker Platform
> **Stack:** Next.js 15 . React 19 . TypeScript . Tailwind v4 . Cloudflare Pages + KV
> **Last Updated:** 2026-02-12

---

## Phase Overview

Note: This roadmap reflects the original plan. Actual implementation diverged significantly.
See `docs/ROADMAP.md` for the current accurate phase plan.

| # | Phase | Status | Est. Hours | Dependencies |
|---|-------|--------|------------|--------------|
| 1 | Core Engine & Prototype | ✅ DONE | 16–20 | -- |
| 2 | AI Bot Driver System | ✅ DONE | 12–16 | Phase 1 |
| 3 | Authentication & User System | ✅ DONE (KV-backed) | 14–18 | Phase 1 |
| 4 | Lobby, Menu & Navigation | ✅ DONE | 12–16 | Phase 3 |
| 5 | Real-Time WebSocket Migration | 🔶 PARTIAL (WS + polling) | 16–20 | Phase 4 |
| 6 | Admin Dashboard | ⬜ TODO | 14–18 | Phase 3, 5 |
| 7 | Economy, Ledger & Security Hardening | ⬜ TODO | 16–22 | Phase 6 |
| 8 | Polish, Animations & Sound | ✅ DONE | 12–16 | Phase 5 |
| 9 | Cloudflare Production Deployment | ✅ DONE (Pages + KV) | 16–20 | Phase 7 |
| 10 | Tournament Mode & Advanced Features | ⬜ TODO | 20–30 | Phase 9 |

---

## Phase 1: Core Engine & Prototype ✅ DONE

**Goal:** Playable poker in the browser — prove the engine works.

### Deliverables (all complete)

- [x] **Poker Engine** (`src/lib/poker/`) — 3,200+ lines
  - `types.ts` — Card, Hand, Game, Player types + display helpers
  - `deck.ts` — 52-card deck, Fisher-Yates shuffle, deal function
  - `hand-eval.ts` — Full hand evaluator (best 5 from 7, all 10 hand ranks, tiebreakers)
  - `game.ts` — Complete game state machine (deal → preflop → flop → turn → river → showdown)
  - Betting engine: fold, check, call, bet, raise, all-in
  - Side pot calculation for multi-way all-in scenarios
  - Blind posting, dealer rotation, street advancement
  - Server-authoritative player views (hides opponent hole cards)
  - Action validation (only legal actions accepted)

- [x] **Bot System** (`bot.ts`)
  - 5 rule-based bot profiles with tunable aggression, tightness, bluff frequency
  - Preflop hand strength assessment
  - Post-flop hand evaluation with pot odds calculation
  - Dynamic bet sizing based on hand strength and personality

- [x] **Game Manager** (`game-manager.ts`)
  - Tick-based game advancement (no background loops — compatible with any server)
  - Auto-play bots with simulated think time (1–2.5s)
  - Human action queue with 30s timeout → auto-fold
  - Game reset and debug controls
  - Singleton pattern surviving hot reloads

- [x] **REST API** (`/api/v1/`)
  - `GET /api/v1` — Health check + version
  - `GET /api/v1/table/:id` — Player-specific game view (also ticks game forward)
  - `POST /api/v1/table/:id` — Submit player action
  - `POST /api/v1/table/:id/debug` — Debug controls (reset, update bot)

- [x] **Table UI** (`src/components/`)
  - Green felt oval table with wood rail and shadows
  - 6 player seats with absolute positioning around the ellipse
  - Playing card component (face up with rank/suit, face down with pattern)
  - Community cards display (5 slots, deal animation)
  - Pot display with side pot breakdown
  - Action panel (Fold/Check/Call/Bet/Raise/All-In + slider + quick-bet buttons)
  - Player seat: name, stack, current bet, all-in indicator, dealer chip
  - Bot badge (🤖 + model name) on every bot — always visible
  - Active player highlight (yellow ring + timer bar)
  - Hero's enlarged hole cards at bottom center
  - Showdown results panel with hand names
  - Winner announcement overlay

- [x] **Keyboard shortcuts:** F=fold, C=check/call, R=raise, D=debug panel

### Technical Decisions
- **Polling over SSE/WebSocket** for prototype (SSE crashed Next.js dev server under memory pressure)
- **Tick-based game loop** — game advances on each API poll, no timers needed
- **Single Next.js app** for prototype speed — will split into monorepo for production

---

## Phase 2: AI Bot Driver System 🔶 IN PROGRESS

**Goal:** Pluggable AI model integration with full decision transparency. Support local models (LM Studio, Ollama) and cloud APIs.

### Deliverables

- [x] **Bot Driver Architecture** (`bot-drivers.ts` — 17.7KB)
  - Provider-agnostic driver interface supporting any OpenAI-compatible endpoint
  - 7 provider types: `lmstudio`, `ollama`, `openai`, `anthropic`, `google`, `openrouter`, `custom`
  - Driver configuration: model ID, base URL, API key, personality, transparency level
  - Health checking via `/models` endpoint ping

- [x] **6 Pre-configured Drivers**
  | Driver | Provider | Model | Style | Description |
  |--------|----------|-------|-------|-------------|
  | Nemotron Nano | LM Studio | nemotron-3-nano | tight-aggressive | Local Nemotron on M3 Max. Pot-odds focused, positionally aware. |
  | Nemotron Deep | LM Studio | nemotron-3-nano | balanced | Reasoning mode enabled. Chain-of-thought GTO analysis. |
  | Ollama Bot | Ollama | llama3.3:70b | loose-aggressive | Fearless gambler, bluffs rivers with missed draws. |
  | Claude | OpenRouter | claude-sonnet-4 | tight-aggressive | Methodical, precise calculations, devastating rare bluffs. |
  | GPT | OpenRouter | gpt-4o | maniac | Maximum chaos and pressure, creative lines. |
  | Gemini | OpenRouter | gemini-2.5-flash | tight-passive | The rock — premium hands only, max value extraction. |

- [x] **Decision Transparency System**
  - Every bot decision logged: prompt sent, raw response, parsed action, reasoning, hand assessment
  - Inference time and token usage tracking
  - Fallback indicator (rule-based vs model-driven)
  - Decision log API: `GET /api/v1/decisions`

- [x] **Game Prompt Builder**
  - Structured prompt with: hole cards, community cards, pot, bets, stacks, position, valid actions
  - System prompt per personality defining strategy and thought process
  - JSON response format with action, amount, reasoning, hand_assessment

- [x] **Debug Panel Upgrade** (21.6KB)
  - **Drivers tab**: All 6 drivers with health check, enable/disable, personality stats radar (AGG/TIGHT/BLUFF/RISK), endpoint display
  - **Decisions tab**: Live scrolling decision log, click to expand full prompt/response/reasoning
  - **State tab**: Game state inspector with all values
  - **Controls tab**: Reset game, environment info, keyboard shortcuts

- [x] **Driver Management API** (`/api/v1/drivers`)
  - List all drivers
  - Check individual or all health
  - Update driver config (model, URL, key, enabled, personality)
  - Add new custom drivers

### Remaining Phase 2 Work

- [ ] **Wire drivers to game manager** — connect driver system to tick loop so bots actually call AI models when drivers are healthy
- [ ] **Async bot action support** — game manager tick needs to handle async model calls (currently sync rule-based only)
- [ ] **Driver assignment UI** — drag-and-drop or dropdown to assign a driver to each table seat
- [ ] **LM Studio auto-detection** — attempt connection on page load, auto-enable if Nemotron responding
- [ ] **Ollama model list** — query `/api/tags` to show available local models
- [ ] **API key management** — secure input field in debug panel for cloud provider keys
- [ ] **Prompt tuning interface** — edit system prompts per driver directly in debug panel
- [ ] **Decision replay** — click a past decision to see the exact game state at that moment
- [ ] **Performance benchmarks** — track and display avg inference time per driver, compare models

### Estimated Remaining: 6–10 hours

---

## Phase 3: Authentication & User System

**Goal:** Real user accounts with secure login, session management, and player profiles.

### Deliverables

- [ ] **Auth System**
  - Email/password registration with Argon2id hashing (or PBKDF2 for Workers compat)
  - Login / logout with HTTP-only secure session cookies
  - Session tokens stored in Cloudflare KV (or in-memory for dev)
  - CSRF protection on all mutations
  - Rate limiting: 10 login attempts/hour per IP

- [ ] **OAuth Providers**
  - Google OAuth2 (most users)
  - GitHub OAuth2 (dev audience)
  - Account linking (OAuth → existing email account)

- [ ] **User Profile**
  - Display name, avatar (upload or Gravatar)
  - Stats: hands played, win rate, biggest pot, total profit/loss
  - Hand history browser (paginated, filterable by date/result)
  - Session history (login times, devices)

- [ ] **Database Schema**
  - `users` table (id, email, username, password_hash, role, status, created_at)
  - `oauth_accounts` table (provider, provider_id → user_id)
  - `sessions` table (token, user_id, expires_at, ip, user_agent)

- [ ] **API Endpoints**
  - `POST /api/v1/auth/register` — Create account
  - `POST /api/v1/auth/login` — Login
  - `POST /api/v1/auth/logout` — Logout
  - `GET /api/v1/auth/session` — Current user info
  - `GET /api/v1/auth/google` — OAuth redirect
  - `GET /api/v1/users/me` — Profile + balance
  - `PATCH /api/v1/users/me` — Update profile
  - `GET /api/v1/users/me/history` — Hand history

- [ ] **Role-Based Access Control**
  - `player` — play, chat, view own data
  - `admin` — manage users, tables, bots, balances, audit logs
  - `superadmin` — manage admins, system config

- [ ] **Auth Pages**
  - `/login` — Login form (email/password + OAuth buttons)
  - `/register` — Registration form
  - `/forgot-password` — Password reset flow (requires email provider)
  - `/profile` — User profile page

### Estimated: 14–18 hours

---

## Phase 4: Lobby, Menu & Navigation

**Goal:** Full application shell with lobby, table browser, and navigation.

### Deliverables

- [ ] **Landing Page** (`/`)
  - Hero section: "Play Texas Hold'em against AI"
  - Feature highlights: AI opponents, provably fair, real-time
  - CTA: "Play Now" → lobby or quick-join demo table
  - If logged in: redirect to lobby

- [ ] **Main Navigation**
  - Top bar: Logo, Lobby, Profile, Balance display, Admin (if admin role)
  - User menu dropdown: Settings, Hand History, Logout
  - Mobile-responsive hamburger menu

- [ ] **Lobby Page** (`/lobby`)
  - Table listing grid/list view (toggle)
  - Each table card: name, blinds, players (X/Y), average pot, bot count
  - Filters: blinds range, table size, open seats, has bots
  - Sort by: blinds, players, activity
  - Quick-join: sit at first available table
  - Create table: modal with name, blinds, buy-in range, max players, private toggle

- [ ] **Table Browser Features**
  - Real-time player counts (polling or WebSocket)
  - "Join" button → buy-in modal → seat selection → sit down
  - Spectator mode: watch a table without sitting
  - Table chat visible from lobby (preview)
  - Private tables: require invite code

- [ ] **Table Page Enhancements**
  - Leave table button
  - Rebuy modal (when stack is low)
  - Sit out / sit in toggle
  - Table info panel (rules, blinds, hand history)
  - Chat panel with messages

- [ ] **API Endpoints**
  - `GET /api/v1/tables` — List active tables with filters
  - `POST /api/v1/tables` — Create new table
  - `GET /api/v1/tables/:slug` — Table details
  - `POST /api/v1/tables/:slug/join` — Join with buy-in
  - `POST /api/v1/tables/:slug/leave` — Leave table
  - `DELETE /api/v1/tables/:slug` — Close table (admin)

### Estimated: 12–16 hours

---

## Phase 5: Real-Time WebSocket Migration

**Goal:** Replace polling with persistent WebSocket connections for instant updates. Prepare for Durable Objects.

### Deliverables

- [ ] **WebSocket Server (Dev)**
  - Custom Node.js server wrapping Next.js with `ws` library
  - WebSocket upgrade handler at `/ws/table/:id`
  - Token-based authentication on connection
  - Ping/pong heartbeat (30s interval)
  - Automatic reconnection with exponential backoff (client)

- [ ] **WebSocket Protocol**
  - Client → Server: `join_table`, `leave_table`, `action`, `sit_out`, `chat`, `ping`
  - Server → Client: `table_state`, `player_joined`, `player_left`, `hand_start`, `hole_cards`, `action_on`, `player_action`, `community_cards`, `pot_update`, `showdown`, `hand_end`, `chat`, `error`, `pong`
  - All messages JSON with `{ type, data }` discriminated union
  - Player-specific messages (hole cards only sent to owner)

- [ ] **Game Manager Refactor**
  - Replace tick-based with event-driven architecture
  - Async game loop runs per-table, independent of client requests
  - Bot actions computed asynchronously (supports AI model calls)
  - Timeout handling: auto-fold after 30s inactivity
  - Reconnection: player can rejoin mid-hand, receives full state

- [ ] **Client Refactor**
  - Replace `setInterval(fetch, 1000)` with WebSocket connection
  - Zustand store for game state management
  - Optimistic UI updates for own actions
  - Connection status indicator (green/yellow/red)

- [ ] **Multi-Table Support**
  - Each table has its own game loop and player roster
  - Players can be seated at one table only (enforced server-side)
  - Spectators can watch any table

- [ ] **Durable Object Skeleton**
  - `TableRoom` Durable Object class with WebSocket hibernation
  - In-memory game state per instance
  - D1 writes for persistence (hand history, balance changes)
  - Can run locally via `wrangler dev` or in dev mode

### Estimated: 16–20 hours

---

## Phase 6: Admin Dashboard

**Goal:** Full administrative control panel for managing the platform.

### Deliverables

- [ ] **Admin Layout** (`/admin`)
  - Sidebar navigation: Dashboard, Users, Tables, Bots, Economy, Audit Log
  - Breadcrumb navigation
  - Admin-only access (role check middleware)

- [ ] **Dashboard Home** (`/admin`)
  - Active tables count + players online (real-time)
  - Hands played today/week/month
  - Revenue (rake collected)
  - Active bots and their win rates
  - Recent audit log entries
  - System health: WebSocket connections, error rate, uptime

- [ ] **User Management** (`/admin/users`)
  - Searchable, sortable, paginated user table
  - Columns: username, email, role, status, balance, hands played, last login
  - Actions: view profile, suspend, ban, adjust balance, change role
  - Balance adjustment modal with amount + reason (logged to audit trail)
  - User detail page: full history, stats, session log

- [ ] **Table Management** (`/admin/tables`)
  - All tables (active + closed)
  - Create table form: name, blinds, buy-in range, max players, auto-fill bots
  - Edit table settings
  - Close table (gracefully finish current hand, unseat all players)
  - Live peek: view current game state of any table

- [ ] **Bot Management** (`/admin/bots`)
  - All bot driver configurations
  - Create/edit bot profiles: name, model, provider, personality, play style
  - API key management (encrypted at rest)
  - Enable/disable bots globally
  - Bot performance dashboard: hands played, win rate, chips won/lost per model
  - A/B testing: compare two models head-to-head

- [ ] **Economy Dashboard** (`/admin/economy`)
  - Total chips in circulation
  - House balance (rake collected)
  - Top balances leaderboard
  - Distribution chart (how chips are spread across players)
  - Ledger audit: every chip transfer is traceable
  - Bulk operations: give all players X chips, reset all balances

- [ ] **Audit Log** (`/admin/audit`)
  - Filterable by: action type, actor, date range, entity
  - Full detail view for each entry
  - Export to CSV
  - Actions tracked: login, balance change, table creation, user ban, bot config change, etc.

### Estimated: 14–18 hours

---

## Phase 7: Economy, Ledger & Security Hardening

**Goal:** Production-grade financial system and security — ready for real money if desired.

### Deliverables

- [ ] **Double-Entry Ledger**
  - Every chip movement recorded as debit/credit pair
  - Account types: `player_balance`, `house`, `rake`, `bonus`
  - Balance = sum of all ledger entries (never stored directly)
  - Atomic transactions: buy-in, rake, pot distribution, admin adjustment
  - Audit trail: every entry has actor, timestamp, description, reference

- [ ] **Rake System**
  - Configurable rake percentage (default 5%, cap at $X per hand)
  - Rake calculated at showdown, deducted from pot before distribution
  - Rake accounts tracked per table for reporting
  - No-rake option for private tables

- [ ] **Provably Fair System**
  - SHA-256 seed commitment before each hand
  - Server seed + salt → deck shuffle deterministically
  - Client seed contribution (optional, for extra trust)
  - Seed + salt revealed after hand completion
  - Public verification page: `/verify/:handId`
  - Verification API: `GET /api/v1/hands/:id/verify`

- [ ] **Security Hardening**
  - Content Security Policy headers
  - CORS configuration (restrict to known origins)
  - Rate limiting: actions/sec, connections/min, login attempts
  - Input validation: Zod schemas on all API inputs
  - SQL injection prevention: parameterized queries only (D1 bindings)
  - XSS prevention: React escaping + CSP
  - Session security: httpOnly, secure, sameSite cookies, IP validation
  - Bot collusion detection: flag unusual betting patterns between bots (or human+bot)

- [ ] **Anti-Abuse**
  - Multi-accounting detection (IP + fingerprint heuristics)
  - Table dumping detection (intentionally losing to another player)
  - Unusual balance transfers flagged for admin review
  - Account velocity limits (max buy-ins per hour)

### Estimated: 16–22 hours

---

## Phase 8: Polish, Animations & Sound

**Goal:** Production-quality user experience — smooth, engaging, delightful.

### Deliverables

- [ ] **Card Animations** (Framer Motion)
  - Dealing: cards slide from deck position to each player (200ms stagger)
  - Flop/turn/river: cards flip with 3D rotation reveal
  - Fold: cards fly to muck pile and fade
  - Showdown: cards flip face up with slight bounce

- [ ] **Chip Animations**
  - Betting: chips fly from player stack to pot
  - Winning: chips fly from pot to winner with satisfying arc
  - All-in: dramatic chip push animation
  - Pot building: chips accumulate visually

- [ ] **Player Feedback**
  - Action toast: "Claude raises to $200" slides in/out
  - Timer countdown: circular progress around active player's avatar
  - Win celebration: gold pulse effect + hand name popup
  - Fold effect: player seat dims

- [ ] **Sound Effects** (optional, toggle in settings)
  - Card deal (shuffling, dealing snaps)
  - Chip sounds (bet, raise, all-in)
  - Timer warning (ticking at 5 seconds)
  - Win fanfare (subtle)
  - Turn notification (when it's your turn)

- [ ] **Responsive Design**
  - Desktop (1200px+): full table view
  - Tablet (768–1199px): compact table, stacked action panel
  - Mobile (< 768px): vertical layout, swipe for actions, bottom sheet for chat
  - Touch-friendly: larger hit targets, swipe gestures

- [ ] **Theme & Visual Polish**
  - Dark mode (default) + light mode toggle
  - Card designs: clean SVG cards with proper pip layouts
  - Table felt textures (subtle noise pattern)
  - Player avatars: default set + upload
  - Loading skeletons for all async content

- [ ] **Accessibility**
  - Keyboard navigation for all actions
  - Screen reader announcements for game events
  - High contrast mode
  - Reduced motion preference support

### Estimated: 12–16 hours

---

## Phase 9: Cloudflare Production Deployment

**Goal:** Ship to production on Cloudflare's edge network — global, fast, scalable.

### Deliverables

- [ ] **Monorepo Migration**
  - Split into pnpm workspaces + Turborepo
  - `apps/web` — Next.js application (OpenNext → Cloudflare Workers)
  - `apps/game-server` — Cloudflare Worker + Durable Objects
  - `packages/poker-engine` — shared game logic (zero deps)
  - `packages/shared` — types, validation, constants
  - `packages/db` — D1 schema, migrations, seed

- [ ] **Cloudflare Infrastructure**
  - D1 database: `poker-db` (users, hands, ledger, audit)
  - KV namespace: `POKER_KV` (sessions, rate limits, lobby cache)
  - Durable Objects: `TableRoom` (one per active table)
  - Service bindings: web worker ↔ game-server worker
  - Custom domain: `poker.jeremysarda.com` (or standalone domain)

- [ ] **Durable Object Implementation**
  - `TableRoom` class: full game loop with WebSocket hibernation
  - In-memory game state with D1 persistence on hand completion
  - WebSocket message handling (join, action, chat, reconnect)
  - Bot controller: AI model calls from within DO
  - Graceful shutdown: finish hand on alarm, persist state

- [ ] **OpenNext Configuration**
  - `open-next.config.ts` for Cloudflare adapter
  - Static asset handling via Cloudflare CDN
  - Edge-side rendering for lobby and auth pages
  - API routes proxied to game-server worker for WebSocket

- [ ] **CI/CD Pipeline**
  - GitHub Actions: lint → test → build → deploy
  - Staging environment (preview branch deploys)
  - Production deploy via `wrangler deploy`
  - Database migrations on deploy
  - Rollback capability

- [ ] **Monitoring & Observability**
  - Cloudflare Analytics for traffic and performance
  - Error tracking (Sentry or Cloudflare Logpush)
  - Game metrics: active tables, hands/hour, player count, bot performance
  - Uptime monitoring (external ping)
  - Cost tracking: DO compute, D1 reads/writes, KV ops

- [ ] **Performance**
  - < 100ms action latency (WebSocket round-trip)
  - < 2s page load (SSR + CDN)
  - < 50MB memory per Durable Object
  - 60fps animations on mid-range devices

### Estimated: 16–20 hours

---

## Phase 10: Tournament Mode & Advanced Features

**Goal:** Expand beyond cash games — tournaments, achievements, social features.

### Deliverables

- [ ] **Tournament System**
  - Multi-table tournaments (MTT): 9-player tables, rebalance on elimination
  - Sit-and-go (SNG): 6 or 9 player single table
  - Blind level progression with configurable structure
  - Payout structure: top 10-30% of field
  - Late registration period
  - Break timer between blind levels
  - Tournament lobby with registrants, blind clock, payouts
  - Tournament results and leaderboard

- [ ] **Ring Game Variants**
  - Pot-Limit Omaha (PLO) — 4 hole cards, must use exactly 2
  - Short Deck Hold'em — remove 2-5, adjusted hand rankings
  - Heads-up tables — 2 player mode

- [ ] **Social Features**
  - Chat system: table chat + global chat
  - Player notes: private notes on other players
  - Friends list + direct messages
  - Player search
  - Leaderboard: daily, weekly, monthly, all-time
  - Achievements/badges: first win, first bluff, royal flush, etc.

- [ ] **AI Model Arena**
  - Head-to-head model comparison: pit Claude vs GPT vs Gemini
  - Automated bot-only tables for benchmarking
  - Model performance dashboard: win rate, avg profit, bluff success rate
  - ELO rating for each model
  - Public leaderboard: which AI plays the best poker?

- [ ] **Advanced Bot Features**
  - Opponent modeling: bots learn tendencies of human players
  - Adaptive strategy: bots adjust based on table dynamics
  - Voice commentary: bots narrate their decisions via TTS
  - Personality chat: bots trash-talk or compliment based on game flow

- [ ] **Mobile App**
  - React Native or Capacitor wrapper
  - Push notifications for tournament start, action required
  - Native card animations

- [ ] **Payment Integration (if going live)**
  - Stripe for deposits/withdrawals
  - Crypto wallet support (ETH, USDC)
  - KYC verification for high-volume players
  - Compliance: gambling licenses per jurisdiction

### Estimated: 20–30 hours (modular — implement features individually)

---

## Architecture Evolution

```
Phase 1-2 (NOW)              Phase 3-4                    Phase 5+                     Phase 9 (PROD)
┌─────────────┐           ┌──────────────┐           ┌──────────────┐           ┌──────────────────┐
│ Next.js App  │           │ Next.js App  │           │ Next.js App  │           │ Next.js (OpenNext)│
│ + Polling    │    →      │ + Auth       │    →      │ + WebSocket  │    →      │ CF Worker         │
│ + In-memory  │           │ + SQLite     │           │ + Custom     │           │                   │
│   game state │           │ + Lobby      │           │   Server     │           │ Durable Objects   │
│              │           │              │           │              │           │ (per-table state)  │
│ localhost    │           │ localhost    │           │ localhost    │           │                   │
│ :3800        │           │ :3800        │           │ :3800        │           │ D1 + KV           │
└─────────────┘           └──────────────┘           └──────────────┘           │ Edge CDN          │
                                                                                │ poker.*.com       │
                                                                                └──────────────────┘
```

---

## File Inventory (Phase 1-2 Complete)

```
/Volumes/JS-DEV/poker/
├── POKER-MASTER.md              # 46KB architecture document (16 sections)
├── ROADMAP.md                   # This file
├── CLAUDE.md                    # AI coding guidelines
├── package.json                 # Next.js 15 + React 19 + Tailwind v4
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
│
├── src/
│   ├── lib/
│   │   ├── poker/
│   │   │   ├── types.ts         # Core poker types + display helpers (125 lines)
│   │   │   ├── deck.ts          # Deck creation, shuffle, deal (30 lines)
│   │   │   ├── hand-eval.ts     # Hand evaluation + comparison (150 lines)
│   │   │   ├── game.ts          # Game state machine + betting (450 lines)
│   │   │   ├── bot.ts           # Hybrid rule-based + AI bot engine (380 lines)
│   │   │   ├── bot-drivers.ts   # AI driver system — providers, prompts, inference (500 lines)
│   │   │   └── index.ts         # Public exports
│   │   ├── game-manager.ts      # Tick-based game coordinator (150 lines)
│   │   └── driver-store.ts      # Driver config singleton (15 lines)
│   │
│   ├── components/
│   │   ├── poker-table.tsx      # Main table orchestrator (280 lines)
│   │   ├── debug-panel.tsx      # 4-tab debug drawer (600 lines)
│   │   ├── player-seat.tsx      # Player seat component (95 lines)
│   │   ├── playing-card.tsx     # Card rendering (55 lines)
│   │   ├── community-cards.tsx  # Community card slots (25 lines)
│   │   ├── pot-display.tsx      # Pot + side pots (30 lines)
│   │   └── action-panel.tsx     # Betting action buttons + slider (130 lines)
│   │
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css          # Tailwind v4 + custom animations
│   │   ├── page.tsx             # Redirect to /lobby
│   │   ├── table/[id]/page.tsx  # Table page
│   │   └── api/v1/
│   │       ├── route.ts                    # Health check
│   │       ├── decisions/route.ts          # Bot decision log
│   │       ├── drivers/route.ts            # Driver CRUD + health
│   │       └── table/[id]/
│   │           ├── route.ts                # Game state + actions
│   │           └── debug/route.ts          # Debug controls
│
│   Total: 24 files, 3,204 lines of TypeScript/TSX
```

---

## Priority Order (What to Build Next)

1. **Finish Phase 2** — Wire AI drivers to game loop, test with LM Studio + Nemotron
2. **Phase 3** — Auth system (unlocks multi-player, persistent profiles)
3. **Phase 4** — Lobby + navigation (makes it feel like a real product)
4. **Phase 5** — WebSocket migration (eliminates polling, enables real-time)
5. **Phase 9** — Deploy to Cloudflare (get it live on the internet)
6. **Phase 6-8** — Admin, economy, polish (can be done incrementally after deploy)
7. **Phase 10** — Advanced features (ongoing)

Phases 3+4 and 6+7 can be parallelized if desired.

---

## Quick Start

```bash
# Development
cd /Volumes/JS-DEV/poker
npm install
npm run dev          # http://localhost:3800

# Production build
npm run build
npx next start -p 3800

# With LM Studio (Nemotron)
# 1. Open LM Studio, load nemotron-3-nano
# 2. Start local server (default :1234)
# 3. Open game, press D for debug panel
# 4. Go to Drivers tab → Check Health on "Nemotron Nano"
# 5. Bots will now make AI-driven decisions with full transparency
```

---

*This is a living document. Updated as phases complete.*
