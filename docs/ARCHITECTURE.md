# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                │
│  Next.js 15 App Router · React 19 · Tailwind v4     │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Lobby  │  │  Table   │  │  Admin   │           │
│  │  UI     │  │  Canvas  │  │  Panel   │           │
│  └────┬────┘  └────┬─────┘  └────┬─────┘           │
│       └──────┬─────┴─────────────┘                  │
│              │ WebSocket + REST API (polling fallback)│
└──────────────┼──────────────────────────────────────┘
               │
     ┌─────────▼───────────┐
     │  Next.js API Routes  │
     │  (Edge Runtime)      │
     │                      │
     │  • Game state GET    │
     │  • Action POST       │
     │  • Auth endpoints    │
     │  • Admin API         │
     │  • Driver mgmt       │
     └─────────┬────────────┘
               │
     ┌─────────▼───────────┐
     │  Cloudflare KV       │
     │  (GAME_STATE)        │
     │                      │
     │  • game:{id} state   │
     │  • table:{id} lobby  │
     │  • user:{id} auth    │
     │  • session:{id}      │
     │  • tables:index      │
     └─────────────────────┘
```

## Current Architecture

The platform uses **KV-backed persistence** with **WebSocket + polling** hybrid:

1. **Client connects** via WebSocket (`useGameWebSocket` hook) to Durable Object worker
2. **Fallback:** If WebSocket unavailable, polls `GET /api/v1/table/:id` every 1000ms
3. **Game state** loaded from/saved to Cloudflare KV on every action
4. **Bot decisions** fire during ticks when think time has elapsed
5. **Auth** validated via cookie session against KV-stored sessions

### Why KV + Polling Hybrid
- KV persistence solves edge worker isolate state loss
- WebSocket provides real-time updates when DO worker is available
- Polling fallback ensures the game works in all environments
- In-memory fallback for local development (no KV required)

## Identification System

All entities use **UUIDs** for proper audit trails and distributed system support:

| Entity | ID Type | Example |
|--------|---------|---------|
| Game | UUID v4 | `5ded07ce-c459-4b5e-a622-829ebd4e3e4a` |
| Hand | UUID v4 | `e8fc341f-68e2-4ed0-bfd7-6b28d5234840` |
| Decision | UUID v4 | `a1b2c3d4-...` |
| Bot Session | UUID v4 | `19b3e7cc-...` |
| User | UUID v4 | `a3f2b1c4-...` |

## Authentication Model

All API endpoints use cookie-based session authentication:

```
Request → Read session cookie → KV lookup → playerId
                                         ↘ Guest auto-create if no session
```

Key files:
- `src/lib/auth-kv.ts` -- PBKDF2 hashing, KV sessions, guest auto-login
- `src/lib/get-user.ts` -- Helper for extracting authenticated user from request

## Per-Seat Bot Controls

Empty seats at a table display interactive controls:
- **"Sit Here"** button for human players
- **Bot profile picker** for adding AI bots to specific seats

The `EmptySeat` component (`src/components/empty-seat.tsx`) renders the seat menu.
The `POST /api/v1/table/[id]/add-bot` endpoint accepts an optional `seat` parameter.
The `POST /api/v1/table/[id]/move-seat` endpoint allows moving a player to an empty seat.

## Bot Session System

Each bot gets a **unique session** for conversation context isolation:

```
Bot 1 ────> Session A (systemPrompt + message history)
Bot 2 ────> Session B (systemPrompt + message history)
Bot 3 ────> Session C (systemPrompt + message history)
      ↓           ↓           ↓
   Same Model (shared via LM Studio or cloud API)
```

### Single-Model Mode
By default, all bots use the **same loaded model** but with separate sessions:
- Prevents LM Studio from swapping models (which causes delays)
- Each bot maintains its own conversation history for context
- History is trimmed to 20 messages (rolling window)
- Session cleared on model change

## KV Persistence

All state is stored in the `GAME_STATE` Cloudflare KV namespace:

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `game:{gameId}` | GameState JSON | 24 hours |
| `table:{tableId}` | Table JSON | 24 hours |
| `tables:index` | Table ID list | 24 hours |
| `user:{userId}` | User JSON | Permanent |
| `user-email:{email}` | User ID | Permanent |
| `user-username:{username}` | User ID | Permanent |
| `session:{sessionId}` | Session JSON | 7 days |

In-memory fallback is used when KV is unavailable (local development).

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.x | App Router, SSR, API routes |
| React | 19.x | UI rendering |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling (portfolio HSL tokens) |
| Framer Motion | 12.x | Animations |

### Backend
| Technology | Purpose |
|---|---|
| Cloudflare Pages | Hosting + edge runtime |
| Cloudflare KV | Game state, auth, table persistence |
| Edge API Routes | All endpoints run on edge runtime |
| Cookie sessions | Auth via `auth-kv.ts` |

### AI Infrastructure
| Provider | Access |
|---|---|
| LM Studio (local) | `http://localhost:1234/v1` |
| Ollama (local) | `http://localhost:11434/v1` |
| OpenRouter (cloud) | Any model via API key |

### Design System
- **Color tokens:** Portfolio HSL design tokens
- **Fonts:** Inter (body), Space Grotesk (headings), JetBrains Mono (code)
- **Theme:** Dark mode default

## Repository Structure

```
/Volumes/JS-DEV/poker/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/v1/             # REST API endpoints (edge runtime)
│   │   ├── (game)/lobby/       # Lobby page
│   │   ├── (auth)/             # Login/register
│   │   └── table/[id]/         # Game table page
│   ├── components/             # React components
│   │   ├── poker-table-ws.tsx  # WebSocket table (primary)
│   │   ├── empty-seat.tsx      # Per-seat controls
│   │   ├── debug-panel.tsx     # Debug tools
│   │   └── ...
│   └── lib/
│       ├── poker/              # Pure game logic
│       ├── auth-kv.ts          # KV-backed auth
│       ├── game-manager-kv.ts  # KV-backed game manager
│       ├── table-store-kv.ts   # KV-backed table store
│       └── ...
├── worker/                     # Durable Object worker (future)
├── docs/                       # Documentation
├── CLAUDE.md                   # AI coding rules
├── README.md                   # Quick start
└── package.json
```

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Persistence | Cloudflare KV | Survives edge isolate restarts |
| Real-time | WebSocket + polling fallback | Best of both worlds |
| Auth | KV sessions + PBKDF2 | Edge-safe, no external deps |
| Bot placement | Per-seat controls | More control than auto-fill |
| State management | KV with in-memory fallback | Works locally and in production |
| Bot architecture | Hybrid AI + rule-based | Never stalls game on API failure |
| Card hiding | Server-authoritative | Client never sees opponent cards |
| maxPlayers | In GameState/GameConfig | Configurable table sizes |
