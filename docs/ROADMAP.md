# Roadmap — Vision & Phase Plan

## Vision

A production-quality Texas Hold'em No-Limit poker platform where:
- **Real players** create accounts, login, sit at tables, and play
- **AI bots** fill empty seats — each powered by a different LLM, clearly labeled
- **Admin** manages everything: users, tables, bots, balances, game logs
- **Security** is real-money grade (provably fair, server-authoritative, audit trail)
- **Balances** are simulated for now but the ledger system supports real currency

## Core Requirements

| Requirement | Detail |
|---|---|
| Game type | Texas Hold'em No-Limit (2-9 players) |
| Real-time | WebSocket connections via Cloudflare Durable Objects |
| AI bots | Multiple models (Claude, GPT-4, Gemini, Llama, local LM Studio) |
| Bot labeling | Visible bot badge + model name on table at all times |
| Auth | Email/password + OAuth (Google, GitHub) |
| Admin | Full CRUD: users, tables, bots, balances, audit logs |
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

---

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

### 🔲 Phase 8: Auth + Persistence (8-10 hours)
- [ ] Wire auth to game state (real user IDs)
- [ ] Persistent user accounts (D1 or SQLite)
- [ ] Balance system with double-entry ledger
- [ ] Session management (JWT or cookie-based)
- [ ] OAuth (Google, GitHub)
- [ ] Profile page

### 🔲 Phase 9: Lobby + Table Management (6-8 hours)
- [ ] Dynamic table creation
- [ ] Real table listings from game manager
- [ ] Table browser with filters
- [ ] Spectator mode
- [ ] Leave table / stand up
- [ ] Multi-table support

### 🔲 Phase 10: Chat + Social (4-6 hours)
- [ ] Table chat
- [ ] Emoji reactions
- [ ] Chat moderation
- [ ] Player notes

### 🔲 Phase 11: Hand History + Stats (6-8 hours)
- [ ] Persistent hand history
- [ ] Visual hand replayer
- [ ] Player statistics (VPIP, PFR, AF, win rate)
- [ ] Session summary graphs
- [ ] Export hand history

### 🔲 Phase 12: Admin Dashboard (8-10 hours)
- [ ] Dashboard home with stats
- [ ] User management
- [ ] Table management
- [ ] Bot configuration CRUD
- [ ] Economy overview
- [ ] Audit log

### 🔲 Phase 13: Security + Provably Fair (6-8 hours)
- [ ] Provably fair shuffling (seed commitment + reveal)
- [ ] Verification page
- [ ] Rate limiting
- [ ] Input validation (Zod)
- [ ] Security headers

### 🔲 Phase 14: Real-Time WebSocket (10-14 hours)
- [ ] Replace polling with WebSocket
- [ ] Cloudflare Durable Objects for table rooms
- [ ] Connection lifecycle
- [ ] Graceful degradation to polling

### 🔲 Phase 15: Deployment (6-8 hours)
- [ ] Cloudflare Workers deployment
- [ ] D1 database setup
- [ ] Custom domain + SSL
- [ ] CI/CD pipeline

### 🔲 Phase 16: Tournament Mode (10-14 hours)
- [ ] Sit-and-go tournaments
- [ ] Multi-table tournaments
- [ ] Blind schedule
- [ ] Prize pool distribution

---

## Summary

| Status | Phases | Hours |
|--------|--------|-------|
| ✅ Complete | 1-7 | ~44 |
| 🔲 Remaining | 8-16 | ~70-100 |
| **Total** | 16 | ~115-145 |

### Recommended Priority
1. ~~Phase 6 (tests)~~ ✅ Done
2. ~~Phase 7 (animations)~~ ✅ Done
3. Phase 8 (auth) → needed for everything else
4. Phase 14 (WebSocket) → production-ready
5. Phase 15 (deploy) → ship it
