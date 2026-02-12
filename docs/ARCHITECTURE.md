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
│              │ REST API (polling)                   │
└──────────────┼──────────────────────────────────────┘
               │
     ┌─────────▼───────────┐
     │  Next.js API Routes  │
     │                      │
     │  • Game state GET    │
     │  • Action POST       │
     │  • Auth endpoints    │
     │  • Admin API         │
     │  • Driver mgmt       │
     └─────────┬────────────┘
               │
     ┌─────────▼───────────┐
     │   Game Manager       │
     │   (globalThis)       │
     │                      │
     │  • Poker Engine      │
     │  • Bot Controller    │
     │  • Hand History      │
     │  • Settings          │
     └─────────────────────┘
```

## Current Architecture (Prototype)

The prototype uses a **tick-based polling** approach:

1. **Client polls** `GET /api/v1/table/:id` every 1000ms
2. **Game Manager** advances state on each poll (tick)
3. **Bot decisions** fire during ticks when think time has elapsed
4. **No background timers** — all state advances on request

### Why Polling (for now)
- Simpler than WebSocket during development
- No connection lifecycle to manage
- Easy to debug (just curl the API)
- HMR-friendly (survives hot reload)

### globalThis Singletons

To survive Next.js HMR and module boundaries:

```typescript
const g = globalThis as Record<string, unknown>;
if (!g.__pokerGameManager) g.__pokerGameManager = new GameManager();
export const gameManager = g.__pokerGameManager as GameManager;
```

This pattern is used for:
- `GameManager` — game state and tick loop
- `HandHistory` — completed hand records
- `DecisionLog` — bot decision records
- `GameSettings` — runtime configuration
- `DriverStore` — AI driver instances

## Production Architecture (Planned)

```
┌──────────────────────────────────────────────────────┐
│                    Cloudflare CDN                     │
└───────────────────────┬──────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
┌─────────▼─────────┐     ┌───────────▼──────────┐
│   poker-web        │     │   poker-game-server   │
│   (Worker)         │     │   (Worker + DO)       │
│                    │     │                       │
│   Next.js SSR      │     │   WebSocket handler   │
│   API Routes       │     │   TableRoom DO        │
│   Auth             │     │   Bot Controller      │
│                    │     │                       │
└────────────────────┘     └───────────────────────┘
          │                           │
          └───────────┬───────────────┘
                      │
          ┌───────────▼───────────────┐
          │     Cloudflare D1          │
          │     (persistent storage)   │
          └───────────────────────────┘
```

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.x | App Router, SSR, API routes |
| React | 19.x | UI rendering |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |

### Backend (Current)
| Technology | Purpose |
|---|---|
| Next.js API Routes | REST endpoints |
| In-memory stores | Game state, sessions |
| globalThis singletons | HMR survival |

### Backend (Production)
| Technology | Purpose |
|---|---|
| Cloudflare Workers | Serverless compute |
| Durable Objects | Stateful WebSocket rooms |
| Cloudflare D1 | SQLite database |
| Cloudflare KV | Session cache |

### AI Infrastructure
| Provider | Models |
|---|---|
| LM Studio (local) | Nemotron, Qwen, GLM, Mistral, DeepSeek, Gemma |
| Ollama (local) | Llama 3.3 |
| OpenRouter (cloud) | Claude, GPT-4o, Gemini |

## Repository Structure

```
/Volumes/JS-DEV/poker/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/v1/             # REST API endpoints
│   │   ├── (game)/lobby/       # Lobby page
│   │   ├── (auth)/             # Login/register
│   │   └── table/[id]/         # Game table page
│   ├── components/             # React components
│   │   ├── poker-table.tsx     # Main table UI
│   │   ├── debug-panel.tsx     # Debug tools
│   │   ├── action-panel.tsx    # Action buttons
│   │   └── ...
│   └── lib/
│       ├── poker/              # Pure game logic
│       │   ├── types.ts
│       │   ├── deck.ts
│       │   ├── hand-eval.ts
│       │   ├── game.ts
│       │   ├── bot.ts
│       │   └── bot-drivers.ts
│       ├── game-manager.ts     # Tick-based manager
│       ├── game-config.ts      # Runtime settings
│       ├── hand-history.ts     # Hand records
│       └── auth.ts             # Session auth
├── docs/                       # Documentation
├── CLAUDE.md                   # AI coding rules
├── README.md                   # Quick start
└── package.json
```

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Polling vs WebSocket | Polling (prototype) | Simpler for dev, WS planned for prod |
| State management | globalThis singletons | Survives HMR, no external deps |
| Bot architecture | Hybrid AI + rule-based | Never stalls game on API failure |
| Card hiding | Server-authoritative | Client never sees opponent cards |
| Game loop | Tick-based on poll | No background timers needed |
