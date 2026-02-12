# CLAUDE.md — Poker Platform Project Rules

## Overview
Full-stack Texas Hold'em poker platform with AI bot players powered by local and cloud LLMs.
~4,900 lines of TypeScript across 37 files.

## Documentation
See `/docs/` for detailed documentation:
- `docs/ROADMAP.md` — Vision, requirements, 16-phase plan
- `docs/ARCHITECTURE.md` — System design, tech stack
- `docs/POKER-ENGINE.md` — State machine, hand eval, betting
- `docs/AI-BOTS.md` — Bot system, drivers, personalities
- `docs/API.md` — REST endpoint reference
- `docs/DATABASE.md` — Schema for production D1

## Tech Stack
- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **AI Models:** LM Studio (Nemotron 3 Nano), Ollama, OpenAI, Anthropic, Google via OpenAI-compatible API
- **Deploy Target:** Cloudflare Workers + Durable Objects (future); local Next.js for now
- **Port:** 3800

## Commands
```bash
npm run dev              # Dev server on port 3800
npm run build            # Production build
npx next start -p 3800   # Run production build
npm run lint             # ESLint
```

## Architecture

### File Layout
```
src/
├── app/                         # Next.js App Router
│   ├── api/v1/                  # REST API (versioned)
│   │   ├── table/[id]/          # Game state + actions (GET/POST)
│   │   ├── table/[id]/debug/    # Debug commands (reset, update_bot)
│   │   ├── drivers/             # AI driver management (GET/POST)
│   │   ├── decisions/           # Bot decision log (GET)
│   │   ├── history/             # Hand history (GET/DELETE)
│   │   ├── games/               # Active games list (GET)
│   │   ├── settings/            # Runtime game config (GET/POST)
│   │   ├── auth/                # Auth (login/register/session/logout)
│   │   └── admin/users/         # Admin user management
│   ├── (game)/lobby/            # Table lobby page
│   ├── (auth)/login|register/   # Auth pages
│   ├── (admin)/admin/           # Admin dashboard
│   └── table/[id]/              # Game table page
├── components/                  # React components
│   ├── poker-table.tsx (275)    # Main table UI with polling
│   ├── debug-panel.tsx (917)    # Full debug suite (history, drivers, decisions, state, controls)
│   ├── action-panel.tsx (134)   # Fold/Check/Call/Raise buttons + slider
│   ├── player-seat.tsx (89)     # Player seat widget with bot badge
│   ├── playing-card.tsx (52)    # Card rendering (rank + suit + color)
│   ├── community-cards.tsx (27) # Board cards display
│   └── pot-display.tsx (30)     # Pot chip display
└── lib/
    ├── poker/                   # Core poker engine (pure logic, no I/O)
    │   ├── types.ts (149)       # All type definitions
    │   ├── deck.ts (31)         # Fisher-Yates shuffle, dealing
    │   ├── hand-eval.ts (173)   # Hand evaluation (best 5 from 7)
    │   ├── game.ts (530)        # State machine: betting, streets, showdown, side pots
    │   ├── bot.ts (378)         # Hybrid rule-based + AI bot engine with decision logging
    │   ├── bot-drivers.ts (519) # AI model driver system, prompt builder, inference
    │   └── index.ts (6)         # Re-exports
    ├── game-manager.ts (391)    # Tick-based game manager (singleton, handles game lifecycle)
    ├── game-config.ts (45)      # Runtime settings (globalThis store)
    ├── hand-history.ts (58)     # Completed hand records (globalThis store)
    ├── driver-store.ts (11)     # AI driver instances (globalThis store)
    └── auth.ts (191)            # Session-based auth (in-memory prototype)
```

### Game Types
- **Demo (6-max):** `/table/demo` — 1 human + 5 AI bots
- **Heads-Up:** `/table/heads-up-{driverId}` — 1 human vs 1 AI bot
  - Example: `/table/heads-up-nemotron-local` for Nemotron Nano

### Key Patterns
- **Server-authoritative:** Clients never see opponent hole cards until showdown
- **Tick-based game loop:** Game advances on each GET poll (no background timers)
- **globalThis singletons:** GameManager, DriverStore, HandHistory, DecisionLog, Settings all survive HMR
- **Polling at 1000ms:** Client polls GET /api/v1/table/:id every second
- **Rule-based fallback:** If AI model call fails/times out, bot uses parameterized rule-based strategy
- **Decision transparency:** Every bot decision logged with prompt, response, reasoning, tokens, time

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
- Bots always labeled with 🤖 badge + model name
- All state stores use globalThis pattern for HMR/module boundary survival

## Human Player
- ID: `human-1` (hardcoded, no real auth yet)
- Auth system exists (in-memory) but not wired to game state

## Keyboard Shortcuts
- `D` — Toggle debug panel
- `F` — Fold
- `C` — Check/Call
- `R` — Raise (min)

## Known Issues
- Nemotron first inference can timeout (model loading); subsequent calls ~10-14s
- `response_format: { type: 'json_object' }` not supported by LM Studio — only sent for OpenAI/OpenRouter
- Nemotron uses `reasoning_content` field — parser checks both `content` and `reasoning_content`
