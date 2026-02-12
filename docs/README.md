# Poker Platform Documentation

> **Status:** Prototype — Playable (Heads-Up + 6-max vs AI)  
> **Stack:** Next.js 15 · React 19 · TypeScript · Tailwind v4  
> **Lines:** ~4,900 across 37 files

## Quick Links

| Document | Description |
|----------|-------------|
| [ROADMAP.md](./ROADMAP.md) | Vision, requirements, and 16-phase development plan |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, tech stack, repository structure |
| [POKER-ENGINE.md](./POKER-ENGINE.md) | Game state machine, hand evaluation, betting logic |
| [AI-BOTS.md](./AI-BOTS.md) | Bot system, personalities, model integration |
| [DATABASE.md](./DATABASE.md) | D1 schema for users, tables, hands, ledger |
| [WEBSOCKET.md](./WEBSOCKET.md) | Real-time protocol (future) |
| [AUTH.md](./AUTH.md) | Authentication and authorization |
| [SECURITY.md](./SECURITY.md) | Provably fair RNG, server-authoritative design |
| [UI-DESIGN.md](./UI-DESIGN.md) | Page structure, table layout, design tokens |
| [ADMIN.md](./ADMIN.md) | Admin dashboard features |
| [API.md](./API.md) | REST API endpoint reference |
| [TESTING.md](./TESTING.md) | Testing strategy (unit, integration, E2E) |

## Project Files

| File | Purpose |
|------|---------|
| `/CLAUDE.md` | AI coding guidelines and project rules |
| `/README.md` | Quick start and feature overview |
| `/docs/*` | This documentation folder |

## Current State (Phase 5 Complete)

✅ **Working:**
- Full poker engine (betting, side pots, showdown)
- Heads-up and 6-max game types
- 10+ local AI models via LM Studio
- Debug panel with hand history, AI reasoning, runtime config
- Model warmup to keep LLMs loaded

🔲 **Next:**
- Unit tests (Phase 6)
- Animations and sound (Phase 7)
- Persistent auth and storage (Phase 8)
