# TODO — Poker Platform

## 🎯 Current Priority: Phase 8 (Auth + BotPlayer)

### Phase 8A: Core Auth (4-5 hours)
- [ ] Create database schema migration script
- [ ] Implement Argon2id password hashing utilities
- [ ] Create JWT generation/validation helpers
- [ ] Build session middleware for protected routes
- [ ] `/api/v1/auth/register` — Email/password registration
- [ ] `/api/v1/auth/login` — Email/password login
- [ ] `/api/v1/auth/logout` — Invalidate tokens
- [ ] `/api/v1/auth/session` — Get current session
- [ ] `/api/v1/auth/refresh` — Refresh access token
- [ ] Wire game state to real user IDs (remove hardcoded `human-1`)

### Phase 8B: OAuth (3-4 hours)
- [ ] OAuth state management (CSRF protection)
- [ ] `/api/v1/auth/oauth/google` — Start Google OAuth
- [ ] `/api/v1/auth/oauth/github` — Start GitHub OAuth
- [ ] `/api/v1/auth/callback/:provider` — OAuth callbacks
- [ ] Account linking logic (multiple providers per user)
- [ ] Create user from OAuth if not exists

### Phase 8C: BotPlayer Entity System (3-4 hours)
- [ ] Create `bot_players` database table
- [ ] Define BotPlayer TypeScript interface
- [ ] `/api/v1/admin/bots` — CRUD endpoints
- [ ] `/api/v1/bots` — List public bots (for table selection)
- [ ] Create 7 pre-built BotPlayers with distinct configs:
  - [ ] `nemotron-shark` — TAG, 3-step deliberation
  - [ ] `qwen-professor` — Balanced, 4-step, educational
  - [ ] `flash-gunslinger` — LAG, 1-step, fast
  - [ ] `gemma-rock` — Tight-passive, 2-step
  - [ ] `mistral-gambler` — Maniac, 2-step
  - [ ] `deepseek-solver` — Balanced, 5-step, GTO
  - [ ] `devstral-hunter` — Exploitative, 3-step
- [ ] Update GameManager to use BotPlayer entities
- [ ] Admin UI for bot management in debug panel

### Phase 8D: Profile & Persistence (2-3 hours)
- [ ] User profile page (`/profile`)
- [ ] `/api/v1/users/me` — Get/update profile
- [ ] `/api/v1/users/me/password` — Change password
- [ ] Balance system with ledger entries
- [ ] Account deletion endpoint

---

## 📋 Backlog

### Phase 9: Lobby + Table Management
- [ ] Dynamic table creation UI
- [ ] Table browser with filters
- [ ] Join/leave table flows
- [ ] Spectator mode
- [ ] Private tables with invite codes
- [ ] Multi-table support

### Phase 10: Chat + Social
- [ ] Table chat component
- [ ] Chat message API
- [ ] Emoji reactions
- [ ] Moderation (mute/report)

### Phase 11: Hand History + Stats
- [ ] Persistent hand storage (D1)
- [ ] Visual hand replayer
- [ ] Player stats (VPIP, PFR, AF)
- [ ] Session graphs

### Phase 12: Admin Dashboard
- [ ] Dashboard home with KPIs
- [ ] User management CRUD
- [ ] Table management CRUD
- [ ] Full BotPlayer editor
- [ ] Audit log viewer

### Phase 13: Security
- [ ] Provably fair shuffling
- [ ] Verification page
- [ ] Rate limiting
- [ ] Input validation (Zod)

### Phase 14: WebSocket
- [ ] Replace polling with WebSocket
- [ ] Cloudflare Durable Objects
- [ ] Reconnection logic

### Phase 15: Deployment
- [ ] Cloudflare Workers setup
- [ ] D1 database migrations
- [ ] CI/CD pipeline

---

## 🐛 Known Issues

### Minor
- [ ] AnimatePresence warning in console (Framer Motion mode="wait")
- [ ] Missing favicon (404)

### Deferred
- [ ] Model presets not yet wired to LM Studio API (uses defaults)
- [ ] Ollama integration untested (LM Studio focus first)

---

## 💡 Ideas for Later

- Tournament mode (sit-and-go, MTT)
- Hand range visualizer
- Equity calculator
- Bot vs bot simulation mode
- Training mode with hints
- Mobile-optimized UI
- Voice chat integration
- Cryptocurrency payments
- Leaderboards

---

## ✅ Recently Completed

### Phase 7.5: Advanced Bot Intelligence (2026-02-11)
- [x] UUID-based identification (gameId, handId, decisionId, sessionId)
- [x] Bot session system with conversation context
- [x] Single-model mode (all bots share loaded model)
- [x] Multi-turn deliberation system
- [x] Configurable deliberation (steps, questions, timeouts)
- [x] Quick mode for trivial decisions
- [x] Updated all documentation

### Phase 7: Animations (2026-02-10)
- [x] Card dealing animation
- [x] Card flip animation
- [x] Chip animations
- [x] Winner overlay
- [x] Thinking indicator

### Phase 6: Testing (2026-02-10)
- [x] 61 unit tests passing
- [x] Hand evaluation 100% coverage
- [x] Game logic 91% coverage
