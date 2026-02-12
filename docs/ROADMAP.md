# Roadmap — Vision & Phase Plan

## Vision

A production-quality Texas Hold'em No-Limit poker platform where:
- **Real players** create accounts, login, sit at tables, and play
- **AI bots** fill empty seats — each powered by a different LLM, clearly labeled
- **BotPlayer presets** define complete bot compositions (model, personality, deliberation)
- **Admin** manages everything: users, tables, bots, balances, game logs
- **Security** is real-money grade (provably fair, server-authoritative, audit trail)
- **Balances** are simulated for now but the ledger system supports real currency

## Core Requirements

| Requirement | Detail |
|---|---|
| Game type | Texas Hold'em No-Limit (2-9 players) |
| Real-time | WebSocket connections via Cloudflare Durable Objects |
| AI bots | Configurable BotPlayer presets with full model/personality/deliberation |
| Bot labeling | Visible bot badge + model name on table at all times |
| Auth | Email/password + OAuth (Google, GitHub) |
| Admin | Full CRUD: users, tables, BotPlayers, balances, audit logs |
| Lobby | Browse tables, filter by stakes, create private tables |
| Balance | Fake currency ledger with double-entry bookkeeping |
| Security | Provably fair RNG, server-authoritative, anti-collusion |
| Performance | <100ms action latency, 60fps animations |

## Non-Requirements (for v1)
- Real payment processing (Stripe/crypto integration deferred)
- Tournament mode (cash games only)
- Mobile native apps (responsive web only)
- Voice/video chat (text chat only)

---

## Phase Plan

### ✅ Phase 1: Foundation + Engine — COMPLETE
- [x] Project planning (46KB master doc, 16 sections)
- [x] Next.js 15 + React 19 + TypeScript + Tailwind v4 setup
- [x] Poker engine: types, deck (Fisher-Yates), hand evaluation (best 5 from 7)
- [x] Game state machine: betting, streets, showdown, side pots
- [x] Heads-up blind rules (dealer posts SB)
- [x] Player view (server-authoritative, hides opponent cards)

### ✅ Phase 2: AI Bot System — COMPLETE
- [x] Hybrid bot engine (AI model + rule-based fallback)
- [x] OpenAI-compatible API caller for all providers
- [x] 10+ pre-configured drivers (Nemotron, Qwen, GLM, Mistral, DeepSeek, etc.)
- [x] Structured game prompt builder with full context
- [x] JSON response parsing with text fallback
- [x] Decision logging (prompt, response, reasoning, tokens, inference time)
- [x] Personality system (aggression, tightness, bluffFreq, riskTolerance)
- [x] Model warmup to keep LLMs loaded
- [x] Provider health checking

### ✅ Phase 3: Table UI + Game Loop — COMPLETE
- [x] Green felt oval table with dynamic seat layout (2-player and 6-player)
- [x] Card rendering (rank + suit + color)
- [x] Player seats with bot badge (🤖) + model name
- [x] Action panel (Fold/Check/Call/Bet/Raise with slider + presets)
- [x] Community cards, pot display, dealer button
- [x] Showdown results overlay
- [x] Keyboard shortcuts (D/F/C/R)
- [x] Tick-based game loop (no background timers)
- [x] Auto-rebuy on bust (configurable)

### ✅ Phase 4: Debug Tooling — COMPLETE
- [x] Debug panel with 5 tabs: History, Drivers, Decisions, State, Controls
- [x] Hand history: per-hand record with players, stacks, actions, board, winners
- [x] AI reasoning: expandable per-decision with full prompt, response, assessment
- [x] Driver management: health check, warmup, enable/disable
- [x] Runtime config sliders (AI timeout with unlimited, think time, showdown hold)

### ✅ Phase 5: Prototype Infrastructure — COMPLETE
- [x] REST API: 12+ endpoints under `/api/v1/`
- [x] Table lobby page with Quick Play cards
- [x] Game type routing (demo, heads-up-{driverId})
- [x] In-memory auth system (login, register, session, logout)
- [x] ~4,900 lines of TypeScript across 37 files

### ✅ Phase 6: Game Correctness + Testing — COMPLETE
- [x] Unit tests for poker engine (61 tests, Vitest)
- [x] Hand evaluation 100% coverage, game.ts 91% coverage
- [x] Test every hand rank, kicker tiebreakers, split pots
- [x] Test heads-up all-in, wheel straight (A-2-3-4-5)
- [x] Betting logic, street progression, side pots

### ✅ Phase 7: Animations + Polish — COMPLETE
- [x] Card dealing animation (fly from deck)
- [x] Card flip animation (community cards)
- [x] Chip stack animation (bet chips appear)
- [x] Winner highlight animation (pulsing glow + confetti)
- [x] Winner overlay (trophy, amount, hand name)
- [x] Bot thinking indicator (spinner + elapsed time)
- [x] Framer Motion integration

### ✅ Phase 7.5: Advanced Bot Intelligence — COMPLETE
- [x] UUID-based identification (gameId, handId, decisionId, sessionId)
- [x] Bot session system (isolated conversation contexts per bot)
- [x] Single-model mode (same model, separate sessions — no model swapping)
- [x] Multi-turn deliberation system (bots "ask themselves" questions)
- [x] Configurable deliberation (steps, question types, timeouts)
- [x] Quick mode for trivial decisions
- [x] Full deliberation logging for debug panel

---

### 🔲 Phase 8: Auth + BotPlayer System (12-16 hours)

**8A: Core Auth (4-5 hours)**
- [ ] Database schema migration (users, sessions, auth_methods)
- [ ] Password hashing with Argon2id
- [ ] JWT token generation/validation (access + refresh)
- [ ] Register/login/logout endpoints
- [ ] Session middleware (protect routes)
- [ ] Wire game state to real user IDs (remove hardcoded `human-1`)

**8B: OAuth (3-4 hours)**
- [ ] Google OAuth flow
- [ ] GitHub OAuth flow  
- [ ] Account linking (multiple auth methods per user)
- [ ] OAuth callback handlers

**8C: BotPlayer Entity System (3-4 hours)**
- [ ] Database schema (bot_players table)
- [ ] BotPlayer CRUD API (`/api/v1/admin/bots`)
- [ ] Complete BotPlayer entity: model config + presets + personality + deliberation
- [ ] Pre-built bot library (7 bots with distinct configurations)
- [ ] Wire game manager to use BotPlayer entities instead of hardcoded drivers
- [ ] Admin UI for bot management

**8D: Profile & Persistence (2-3 hours)**
- [ ] User profile page
- [ ] Preferences API
- [ ] Balance system with double-entry ledger
- [ ] Password change / account deletion

### 🔲 Phase 9: Lobby + Table Management (6-8 hours)
- [ ] Dynamic table creation (from BotPlayer library)
- [ ] Real table listings from game manager
- [ ] Table browser with filters (stakes, seats, type)
- [ ] Spectator mode
- [ ] Leave table / stand up / rebuy
- [ ] Multi-table support
- [ ] Private tables with invite codes

### 🔲 Phase 10: Chat + Social (4-6 hours)
- [ ] Table chat (WebSocket or polling)
- [ ] Emoji reactions
- [ ] Chat moderation (mute, ban, report)
- [ ] Player notes (private per-user)
- [ ] Friends list (deferred to v2)

### 🔲 Phase 11: Hand History + Stats (6-8 hours)
- [ ] Persistent hand history (D1 database)
- [ ] Visual hand replayer
- [ ] Player statistics (VPIP, PFR, AF, win rate)
- [ ] Session summary graphs
- [ ] Export hand history (JSON, PokerStars format)
- [ ] Bot performance analytics

### 🔲 Phase 12: Admin Dashboard (8-10 hours)
- [ ] Dashboard home with stats (users, tables, hands, revenue)
- [ ] User management (view, edit, suspend, ban)
- [ ] Table management (create, close, configure)
- [ ] BotPlayer configuration CRUD (full editor)
- [ ] Economy overview (balance distribution, transactions)
- [ ] Audit log viewer

### 🔲 Phase 13: Security + Provably Fair (6-8 hours)
- [ ] Provably fair shuffling (seed commitment + reveal)
- [ ] Verification page (user can verify any hand)
- [ ] Rate limiting (IP + user-based)
- [ ] Input validation (Zod schemas)
- [ ] Security headers (CSP, HSTS, etc.)
- [ ] Collusion detection (deferred research)

### 🔲 Phase 14: Real-Time WebSocket (10-14 hours)
- [ ] Replace polling with WebSocket
- [ ] Cloudflare Durable Objects for table rooms
- [ ] Connection lifecycle (connect, disconnect, reconnect)
- [ ] Graceful degradation to polling
- [ ] Presence indicators (online/away)
- [ ] Typing indicators in chat

### 🔲 Phase 15: Deployment (6-8 hours)
- [ ] Cloudflare Workers deployment (OpenNext)
- [ ] D1 database setup + migrations
- [ ] KV for sessions/cache
- [ ] Custom domain + SSL
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring + error tracking

### 🔲 Phase 16: Tournament Mode (10-14 hours)
- [ ] Sit-and-go tournaments
- [ ] Multi-table tournaments
- [ ] Blind schedule (configurable)
- [ ] Prize pool distribution
- [ ] Late registration
- [ ] Rebuy/Add-on periods

---

## Summary

| Status | Phases | Hours |
|--------|--------|-------|
| ✅ Complete | 1-7.5 | ~48 |
| 🔲 Remaining | 8-16 | ~70-100 |
| **Total** | 16 | ~120-150 |

### Recommended Priority
1. **Phase 8** (auth + BotPlayer) → Foundation for everything else
2. **Phase 9** (lobby) → Real multi-table experience
3. **Phase 14** (WebSocket) → Production-ready real-time
4. **Phase 15** (deploy) → Ship it
5. Phase 11 (stats) → Player retention
6. Phase 12 (admin) → Operations

---

## BotPlayer Quick Reference

See [ENTITIES.md](./ENTITIES.md) for full BotPlayer specification.

### Pre-Built Library

| Slug | Name | Style | Model | Deliberation |
|------|------|-------|-------|--------------|
| `nemotron-shark` | Shark | TAG | nemotron-3-nano | 3 steps |
| `qwen-professor` | Professor | Balanced | qwen3-30b | 4 steps |
| `flash-gunslinger` | Gunslinger | LAG | glm-4.7-flash | 1 step |
| `gemma-rock` | The Rock | Tight-Passive | gemma-3n | 2 steps |
| `mistral-gambler` | Gambler | Maniac | mistral-24b | 2 steps |
| `deepseek-solver` | Solver | Balanced | deepseek-r1 | 5 steps |
| `devstral-hunter` | Hunter | Exploitative | devstral | 3 steps |

### Key Concepts

- **Single Model Mode**: All bots at a table use the same loaded model (no swapping)
- **Separate Sessions**: Each bot maintains its own conversation context
- **Deliberation**: Bots "ask themselves" poker questions before deciding
- **UUID Tracking**: Every game, hand, and decision has a unique identifier
