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

### ✅ Phase 8: Auth + Deployment — COMPLETE (2026-02-12)

**8A: Auth System**
- [x] Auth.js (NextAuth) integration
- [x] Google + GitHub OAuth providers
- [x] Email/password credentials provider
- [x] Edge-compatible password hashing (Web Crypto PBKDF2)
- [x] JWT sessions (Cloudflare Workers compatible)
- [x] Login page with OAuth buttons + credential form
- [x] Route protection middleware

**8B: Cloudflare Deployment**
- [x] Cloudflare Pages deployment via @cloudflare/next-on-pages
- [x] Production URL: poker-70o.pages.dev
- [x] Custom domain configured: poker.jeremysarda.com (CNAME pending)
- [x] wrangler.toml configuration
- [x] Edge runtime for API routes

### ✅ Phase 9: Lobby + Table Management — COMPLETE (2026-02-12)
- [x] Table store (`src/lib/table-store.ts`) with globalThis pattern
- [x] API routes: GET/POST `/api/v1/tables`, join/leave endpoints
- [x] Lobby page (`/lobby`) with real-time polling
- [x] Create table modal (name, blinds, buy-in range, max players)
- [x] Join table modal with buy-in slider
- [x] Table status badges (waiting/playing/full)
- [x] Filter tabs (All / Open Seats / Waiting)
- [x] Spectator mode for full tables
- [x] Auto-cleanup of empty tables

### ✅ Phase 9.5: Audio + Stats + Analytics — COMPLETE (2026-02-12)

**Audio System**
- [x] 9 procedural sounds (Web Audio API, no external files)
- [x] Sounds: deal, chip, check, call, raise, fold, tick, win, yourTurn, allIn
- [x] AudioManager singleton with volume control
- [x] Mute toggle with localStorage persistence
- [x] `useGameSounds` hook for automatic game event sounds

**Player Statistics**
- [x] Stats store (`src/lib/player-stats.ts`) tracking all metrics
- [x] Tracks: hands played, win rate, biggest pot, chips won/lost
- [x] Position stats (dealer/SB/BB/UTG/MP/CO)
- [x] Last 100 session records per player
- [x] API: `GET /api/v1/players/[id]/stats`
- [x] Profile page at `/profile/[playerId]` with P&L chart

**Analytics**
- [x] Analytics component with GA4, GTM, Clarity, FB Pixel, Hotjar support
- [x] Admin config page at `/admin/analytics`
- [x] Microsoft Clarity: vg3f6aaou9
- [x] Google Analytics 4: G-62WRD1JVX9

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
| ✅ Complete | 1-9.5 | ~70 |
| 🔲 Remaining | 10-16 | ~50-70 |
| **Total** | 16 | ~120-140 |

### Recommended Priority
1. **Phase 10** (chat) → Social features
2. **Phase 14** (WebSocket) → Production-ready real-time
3. **Phase 11** (persistent stats) → Player retention
4. **Phase 12** (admin) → Operations
5. **Phase 16** (tournaments) → Advanced gameplay

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
