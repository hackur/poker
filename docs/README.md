# Poker Platform Documentation

A production-quality Texas Hold'em No-Limit poker platform with AI bot opponents.

## Quick Links

| Doc | Description |
|-----|-------------|
| [ROADMAP.md](./ROADMAP.md) | Vision, phase plan, priorities |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flow |
| [ENTITIES.md](./ENTITIES.md) | BotPlayer & HumanPlayer specifications |
| [AUTH.md](./AUTH.md) | Authentication system design |
| [AI-BOTS.md](./AI-BOTS.md) | Bot system, deliberation, sessions |
| [DATABASE.md](./DATABASE.md) | Schema, migrations, queries |
| [API.md](./API.md) | REST API reference |
| [POKER-ENGINE.md](./POKER-ENGINE.md) | Game rules, hand evaluation |
| [UI-DESIGN.md](./UI-DESIGN.md) | Table UI, components |
| [SECURITY.md](./SECURITY.md) | Provably fair, anti-cheat |
| [TESTING.md](./TESTING.md) | Test strategy, coverage |
| [WEBSOCKET.md](./WEBSOCKET.md) | Real-time architecture |
| [ADMIN.md](./ADMIN.md) | Admin dashboard features |

## Current Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1-7 | ✅ Complete | Foundation, bots, UI, testing, animations |
| 7.5 | ✅ Complete | UUID IDs, bot sessions, deliberation system |
| 8 | 🔲 Next | Auth + BotPlayer entity system |
| 9-16 | 🔲 Planned | Lobby, chat, stats, admin, WebSocket, deploy |

## Key Concepts

### BotPlayer Entity
A complete composition defining an AI player:
- Model configuration (provider, presets)
- Personality (style, aggression, system prompt)
- Deliberation config (steps, questions)

See [ENTITIES.md](./ENTITIES.md) for full specification.

### Deliberation System
Bots "ask themselves" poker questions before deciding:
1. "What's my hand strength?"
2. "What could opponents have?"
3. "Given my style, what's the play?"
4. Final decision

### Single-Model Mode
All bots use the same loaded model but with separate conversation contexts (sessions). This prevents model swapping delays in LM Studio.

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server (port 3800)
npm run dev

# Run tests
npm run test:run

# Type check
npx tsc --noEmit
```

## Line Count

~7,000 lines of TypeScript across 50+ files

## Tech Stack

- **Framework**: Next.js 15 + React 19
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion
- **Testing**: Vitest
- **Database**: Cloudflare D1 (planned)
- **Deployment**: Cloudflare Workers (planned)
