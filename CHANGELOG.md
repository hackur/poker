# Changelog

All notable changes to the AI Poker platform.

## [0.9.7] - 2026-02-12

### Added
- **KV-Backed Auth** -- `src/lib/auth-kv.ts` with PBKDF2 hashing (Web Crypto API)
- **Guest Auto-Login** -- unauthenticated users get a guest account automatically
- **Per-Seat Bot Controls** -- `EmptySeat` component with "Sit Here" + bot profile picker
- **Move Seat Endpoint** -- `POST /api/v1/table/[id]/move-seat` to change seats
- **Targeted Bot Placement** -- `POST /api/v1/table/[id]/add-bot` accepts `seat` parameter
- **maxPlayers** field added to GameState, GameConfig, PlayerGameView
- **Design System** -- Portfolio HSL tokens, Inter/Space Grotesk/JetBrains Mono fonts

### Changed
- All table endpoints now use cookie session authentication pattern
- Auth sessions stored in Cloudflare KV with 7-day TTL
- Admin account auto-seeds on first KV access

### Removed
- **Demo content** -- Quick Play, AI Battle, Practice modes deleted
- `createDemo()` and `createHeadsUp()` functions removed
- Hardcoded `human-1` / `HUMAN_PLAYER_ID` references removed

---

## [0.9.6] - 2026-02-12

### Added
- **Comprehensive Test Suite Expansion** — 280 tests total (was 146)
  - `deck.test.ts` — 18 tests for deck creation, shuffling, dealing
  - `player-stats.test.ts` — 21 tests for player tracking, positions, sessions
  - `auth.test.ts` — 37 tests for user creation, auth, sessions, roles
  - `table-store.test.ts` — 37 tests for lobby table management
  - `leaderboard.test.ts` — 21 tests for rankings, weekly changes, pagination

### Documentation
- Test coverage documented in CHANGELOG
- All new test files follow established patterns

---

## [0.9.5] - 2026-02-12

### Added
- **KV Persistence (Phase 14A)** — Game state survives edge worker restarts
  - New `game-manager-kv.ts` with Cloudflare KV integration
  - Falls back to in-memory for local development
  - 24-hour TTL on game state
  - Fixes the edge runtime `globalThis` isolation issue
  
- **WebSocket Infrastructure** (prepared for Phase 14B)
  - `useGameWebSocket` hook with polling fallback
  - `poker-table-ws.tsx` WebSocket-enabled table component
  - Durable Object worker ready (not deployed yet)
  - Connection status indicator with latency display

### Changed
- API routes now use KV-backed game manager
- Auth middleware updated for KV session pattern
- TypeScript config excludes `worker/` directory

### Fixed
- **Edge runtime state persistence** — Game state now persists on Cloudflare Pages
- Build errors from Durable Object types

---

## [0.9.0] - 2026-02-12

### Added
- **Lobby System** — Full table management at `/lobby`
  - Create tables with configurable blinds, buy-ins, max players
  - Join/leave tables with buy-in validation
  - Real-time table list with 5-second polling
  - Filter by status (All / Open Seats / Waiting)
  - Spectator mode for full tables
  
- **Audio System** — Immersive sound effects
  - 9 procedural sounds via Web Audio API (no external files)
  - Deal, chip, check, call, raise, fold, tick, win, yourTurn, allIn
  - Volume control with mute toggle
  - Preferences persisted in localStorage
  - Sound toggle button in table header
  
- **Player Statistics** — Performance tracking
  - Stats page at `/profile/[playerId]`
  - Metrics: hands played, win rate, biggest pot, net chips
  - Position stats (dealer/SB/BB/UTG/MP/CO)
  - Cumulative P&L sparkline chart
  - Recent hands list with color-coded results
  - API: `GET /api/v1/players/[id]/stats`
  
- **Analytics Integration**
  - Support for GA4, GTM, Microsoft Clarity, FB Pixel, Hotjar
  - Admin config page at `/admin/analytics`
  - Environment variable configuration
  
- **Auth System**
  - Auth.js (NextAuth) with Google + GitHub OAuth
  - Email/password credentials
  - Edge-compatible password hashing (Web Crypto PBKDF2)
  - JWT sessions for Cloudflare Workers
  - Protected routes via middleware
  
- **Cloudflare Deployment**
  - Deployed to Cloudflare Pages
  - Production URL: poker-70o.pages.dev
  - Custom domain: poker.jeremysarda.com

### Changed
- Upgraded game manager to v2 with stats integration
- Table API routes now use Node runtime (edge runtime breaks globalThis)

### Fixed
- Edge runtime globalThis isolation issues for shared state

---

## [0.8.0] - 2026-02-11

### Added
- Advanced bot intelligence (Phase 7.5)
- UUID-based identification for games, hands, decisions
- Bot session system with isolated conversation contexts
- Multi-turn deliberation system
- Configurable deliberation (steps, question types, timeouts)

---

## [0.7.0] - 2026-02-10

### Added
- Animations with Framer Motion (Phase 7)
- Card dealing, flip, chip animations
- Winner highlight with pulsing glow + confetti
- Winner overlay with trophy, amount, hand name
- Bot thinking indicator with elapsed time

---

## [0.6.0] - 2026-02-09

### Added
- Unit tests with Vitest (Phase 6)
- 61 tests passing
- Hand evaluation 100% coverage
- Game.ts 91% coverage

---

## [0.5.0] - 2026-02-08

### Added
- Debug panel with 5 tabs (Phase 4)
- Hand history viewer
- AI reasoning inspector
- Driver management
- Runtime config sliders
- State inspector

---

## [0.1.0-0.4.0] - 2026-02-07

### Added
- Initial poker engine (Phase 1)
- AI bot system (Phase 2)
- Table UI + game loop (Phase 3)
- REST API infrastructure (Phase 5)
