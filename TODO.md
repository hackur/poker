# TODO -- Poker Platform

## Current Priority

### Auth Enhancements (Optional)
- [ ] Migrate tests from `auth.ts` to `auth-kv.ts`
- [ ] Add password reset flow
- [ ] Add email verification
- [ ] Add OAuth login (Google, GitHub)
- [ ] Add rate limiting on login attempts
- [ ] Delete old `src/lib/auth.ts` after full test migration
- [ ] Add user profile editing
- [ ] Add avatar upload

### Bot System
- [ ] BotPlayer entity system with database-backed profiles
- [ ] Admin UI for bot management
- [ ] Bot performance analytics (win rate, chips won/lost per model)

---

## Backlog

### Phase 10: Chat + Social
- [ ] Table chat component
- [ ] Chat message API
- [ ] Emoji reactions
- [ ] Moderation (mute/report)

### Phase 11: Hand History + Stats (Persistent)
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

### Phase 14B: Durable Objects WebSocket
- [ ] Deploy Durable Object worker
- [ ] Full WebSocket protocol (replace polling entirely)
- [ ] Reconnection logic
- [ ] Presence indicators

### Phase 15: Production Hardening
- [ ] D1 database for persistent storage
- [ ] CI/CD pipeline
- [ ] Monitoring + error tracking

### Phase 16: Tournaments
- [ ] Sit-and-go tournaments
- [ ] Multi-table tournaments
- [ ] Blind schedule
- [ ] Prize pool distribution

---

## Known Issues

### Minor
- [ ] AnimatePresence warning in console (Framer Motion mode="wait")
- [ ] Missing favicon (404)

### Deferred
- [ ] Ollama integration untested (LM Studio focus first)

---

## Ideas for Later

- Tournament mode (sit-and-go, MTT)
- Hand range visualizer
- Equity calculator
- Bot vs bot simulation mode
- Training mode with hints
- Mobile-optimized UI
- Voice chat integration
- Leaderboards

---

## Recently Completed (2026-02-12)

- [x] Auth migrated to KV (`auth-kv.ts`) with PBKDF2 hashing
- [x] Guest auto-login (no registration required to play)
- [x] Per-seat bot controls (EmptySeat component + bot profile picker)
- [x] `POST /api/v1/table/[id]/move-seat` endpoint
- [x] `POST /api/v1/table/[id]/add-bot` accepts `seat` param
- [x] maxPlayers added to GameState, GameConfig, PlayerGameView
- [x] KV persistence for game state, table store, auth
- [x] WebSocket + polling hybrid (`useGameWebSocket` hook)
- [x] Design system (portfolio HSL tokens, Inter/Space Grotesk/JetBrains Mono)
- [x] Cookie session auth on all table endpoints
- [x] Removed demo content (Quick Play, AI Battle, Practice modes)
- [x] 280 tests across 14 test files
