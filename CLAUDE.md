# CLAUDE.md -- Poker Platform Project Rules

## Overview
Full-stack Texas Hold'em poker platform with AI bot players powered by local and cloud LLMs.
Deployed on Cloudflare Pages with KV persistence, WebSocket + polling hybrid, and per-seat bot controls.

## Current Status (2026-02-12)
- **Deployed:** poker-70o.pages.dev (Cloudflare Pages)
- **Custom Domain:** poker.jeremysarda.com
- **Analytics:** GA4 (G-62WRD1JVX9) + Clarity (vg3f6aaou9)
- **Auth:** KV-backed with PBKDF2 hashing and guest auto-login
- **Persistence:** Cloudflare KV for game state, table store, auth sessions

## Documentation
See `/docs/` for detailed documentation:
- `docs/ROADMAP.md` -- Vision, requirements, phase plan
- `docs/ARCHITECTURE.md` -- System design, tech stack
- `docs/POKER-ENGINE.md` -- State machine, hand eval, betting
- `docs/AI-BOTS.md` -- Bot system, drivers, personalities
- `docs/API.md` -- REST endpoint reference
- `docs/AUTH.md` -- Authentication system
- `docs/SECURITY.md` -- Server-authoritative design

## Tech Stack
- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 with portfolio HSL design tokens
- **Fonts:** Inter, Space Grotesk, JetBrains Mono
- **AI Models:** Any OpenAI-compatible API (LM Studio, Ollama, OpenRouter, etc.)
- **Deploy Target:** Cloudflare Pages + KV
- **Persistence:** Cloudflare KV (`GAME_STATE` namespace)
- **Port:** 3800

## Commands
```bash
npm run dev              # Dev server on port 3800
npm run build            # Production build
npx next start -p 3800   # Run production build
npm run lint             # ESLint
npm test                 # Vitest (280 tests)
```

## Architecture

### File Layout
```
src/
├── app/                         # Next.js App Router
│   ├── api/v1/                  # REST API (versioned)
│   │   ├── table/[id]/          # Game state + actions (GET/POST)
│   │   ├── table/[id]/add-bot/  # Add bot to specific seat
│   │   ├── table/[id]/move-seat/# Move player to empty seat
│   │   ├── table/[id]/debug/    # Debug commands (reset, update_bot)
│   │   ├── tables/              # Lobby tables (list, create)
│   │   ├── tables/[id]/join/    # Join table
│   │   ├── tables/[id]/leave/   # Leave table
│   │   ├── drivers/             # AI driver management (GET/POST)
│   │   ├── decisions/           # Bot decision log (GET)
│   │   ├── history/             # Hand history (GET/DELETE)
│   │   ├── games/               # Active games list (GET)
│   │   ├── settings/            # Runtime game config (GET/POST)
│   │   ├── players/[id]/stats/  # Player statistics
│   │   ├── auth/                # Auth (login/register/session/logout)
│   │   └── admin/               # Admin (users, analytics)
│   ├── (game)/lobby/            # Table lobby page
│   ├── (auth)/login|register/   # Auth pages
│   ├── (admin)/admin/           # Admin dashboard
│   ├── profile/[playerId]/      # Player profile & stats
│   └── table/[id]/              # Game table page
├── components/                  # React components
│   ├── poker-table-ws.tsx       # WebSocket-enabled table UI (primary)
│   ├── poker-table.tsx          # Polling-based table UI (fallback)
│   ├── empty-seat.tsx           # Per-seat "Sit Here" + bot profile picker
│   ├── debug-panel.tsx          # Full debug suite
│   ├── action-panel.tsx         # Fold/Check/Call/Raise buttons + slider
│   ├── player-seat.tsx          # Player seat widget with bot badge
│   ├── responsive-table-wrapper.tsx # Handles auth + table component selection
│   └── ...
└── lib/
    ├── poker/                   # Core poker engine (pure logic, no I/O)
    │   ├── types.ts             # All type definitions (includes maxPlayers)
    │   ├── deck.ts              # Fisher-Yates shuffle, dealing
    │   ├── hand-eval.ts         # Hand evaluation (best 5 from 7)
    │   ├── game.ts              # State machine: betting, streets, showdown, side pots
    │   ├── bot.ts               # Hybrid rule-based + AI bot engine with decision logging
    │   ├── bot-drivers.ts       # AI model driver system, prompt builder, inference
    │   └── index.ts             # Re-exports
    ├── auth-kv.ts               # KV-backed auth (PBKDF2, guest auto-login, sessions)
    ├── auth.ts                  # Legacy in-memory auth (tests only)
    ├── game-manager-kv.ts       # KV-backed game manager
    ├── game-manager.ts          # In-memory game manager (local dev)
    ├── table-store-kv.ts        # KV-backed table store
    ├── table-store.ts           # In-memory table store (fallback)
    ├── game-config.ts           # Runtime settings
    ├── cf-context.ts            # Cloudflare binding helper
    ├── hand-history.ts          # Completed hand records
    ├── driver-store.ts          # AI driver instances
    ├── player-stats.ts          # Player statistics tracking
    ├── kv-game-store.ts         # Low-level KV game state operations
    └── bot-player.ts            # Bot player entity definitions
```

### Key Patterns
- **Server-authoritative:** Clients never see opponent hole cards until showdown
- **KV persistence:** Game state, table store, and auth all backed by Cloudflare KV
- **In-memory fallback:** All KV stores fall back to in-memory Maps for local dev
- **WebSocket + polling:** `useGameWebSocket` hook connects to DO worker, falls back to 1000ms polling
- **Per-seat bot controls:** Empty seats show "Sit Here" + bot profile picker via `EmptySeat` component
- **Cookie session auth:** All table endpoints authenticate via cookie -> KV session -> playerId
- **Guest auto-login:** Unauthenticated users automatically get a guest account
- **Rule-based fallback:** If AI model call fails/times out, bot uses parameterized rule-based strategy
- **Decision transparency:** Every bot decision logged with prompt, response, reasoning, tokens, time
- **maxPlayers:** GameState, GameConfig, and PlayerGameView all include maxPlayers field

### Authentication Flow
All table API endpoints use this pattern:
```typescript
const cookieUser = await getCurrentUser();  // Check session cookie
if (cookieUser) {
  playerId = cookieUser.id;
} else if (bodyPlayerId) {
  const user = await getUserById(bodyPlayerId);
  playerId = user ? user.id : (await getOrCreateGuestUser()).id;
} else {
  playerId = (await getOrCreateGuestUser()).id;
}
```

### AI Driver System
All models use OpenAI-compatible `/v1/chat/completions` endpoint:
- **LM Studio:** `http://localhost:1234/v1` (no API key)
- **Ollama:** `http://localhost:11434/v1` (no API key)
- **Cloud:** OpenRouter, OpenAI, etc. (API key required)

Models respond with JSON: `{ action, amount?, reasoning, hand_assessment }`

### Heads-Up Blind Rules
In 2-player games, dealer posts small blind (per standard poker rules).
The `smallBlindSeat()` function in `game.ts` handles this.

## Code Standards
- SOLID, DRY, KISS
- TypeScript strict mode
- No `any` types without justification
- All bot decisions logged with full transparency
- Bots always labeled with bot badge + model name
- Edge runtime on all API routes
- All auth via `auth-kv.ts` (not legacy `auth.ts`)

## Authentication System
- **Production:** KV-backed auth (`src/lib/auth-kv.ts`) with PBKDF2 password hashing
- **Legacy:** In-memory auth (`src/lib/auth.ts`) kept for test backward compatibility only
- **Guest Auto-Login:** Users without a session automatically get a guest account
- **Admin Seeding:** Default admin account created on first KV access
  - Email: admin@poker.jeremysarda.com
  - Username: admin
  - Password: admin123
  - Role: superadmin
- **Session Management:** 7-day session TTL, stored in KV with auto-expiration
- **Edge Runtime:** All auth functions are async and work on Cloudflare Workers

## KV Key Schema
```
game:{gameId}                → GameState JSON (24h TTL)
table:{tableId}              → Table JSON (24h TTL)
tables:index                 → Table ID list (for consistent listing)
user:{id}                    → User JSON (permanent)
user-email:{email}           → user ID (email lookup)
user-username:{username}     → user ID (username lookup)
session:{sessionId}          → Session JSON (7-day TTL)
decision:{decisionId}        → Bot decision log
```

## Keyboard Shortcuts
- `D` -- Toggle debug panel
- `F` -- Fold
- `C` -- Check/Call
- `R` -- Raise (min)
