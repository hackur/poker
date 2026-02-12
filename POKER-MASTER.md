# POKER-MASTER.md — Project Index

> **Project:** Texas Hold'em with AI Bot Players  
> **Status:** Prototype — Playable (Phases 1-7 Complete)  
> **Lines:** ~6,850 TypeScript across 45 files

---

## Documentation

All detailed documentation is in `/docs/`:

| Document | Description |
|----------|-------------|
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Vision, requirements, 16-phase plan |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, tech stack, structure |
| [docs/POKER-ENGINE.md](./docs/POKER-ENGINE.md) | State machine, hand eval, betting |
| [docs/AI-BOTS.md](./docs/AI-BOTS.md) | Bot system, drivers, personalities |
| [docs/DATABASE.md](./docs/DATABASE.md) | Schema (D1/SQLite) |
| [docs/API.md](./docs/API.md) | REST endpoint reference |
| [docs/AUTH.md](./docs/AUTH.md) | Authentication system |
| [docs/SECURITY.md](./docs/SECURITY.md) | Provably fair, server-authoritative |
| [docs/UI-DESIGN.md](./docs/UI-DESIGN.md) | Layouts, components, design tokens |
| [docs/WEBSOCKET.md](./docs/WEBSOCKET.md) | Real-time protocol (planned) |
| [docs/ADMIN.md](./docs/ADMIN.md) | Admin dashboard (planned) |
| [docs/TESTING.md](./docs/TESTING.md) | Testing strategy |

---

## Quick Start

```bash
cd /Volumes/JS-DEV/poker
npm run dev    # Port 3800
```

Open:
- `http://localhost:3800` — Lobby
- `http://localhost:3800/table/demo` — 6-max vs 5 bots
- `http://localhost:3800/table/heads-up-nemotron-local` — Heads-up vs Nemotron

Press **D** to open debug panel.

---

## Current Progress

| Phase | Status | Hours |
|-------|--------|-------|
| 1. Foundation + Engine | ✅ Complete | ~8 |
| 2. AI Bot System | ✅ Complete | ~10 |
| 3. Table UI + Game Loop | ✅ Complete | ~10 |
| 4. Debug Tooling | ✅ Complete | ~6 |
| 5. Prototype Infrastructure | ✅ Complete | ~6 |
| 6. Unit Tests | ✅ Complete | ~2 |
| 7. Animations | ✅ Complete | ~2 |
| 8-16 | 🔲 Remaining | ~70-100 |

---

## Key Files

```
/Volumes/JS-DEV/poker/
├── CLAUDE.md              # AI coding rules
├── README.md              # User-facing docs
├── docs/                  # Detailed documentation
├── src/
│   ├── app/api/v1/        # REST endpoints
│   ├── app/table/[id]/    # Game page
│   ├── components/        # React components
│   └── lib/poker/         # Game engine
└── package.json
```

---

## AI Models Available

**Local (LM Studio):**
- Nemotron 3 Nano, Qwen 30B/8B, Qwen Coder, GLM Flash
- Magistral, DeepSeek R1, Mistral 24B, Gemma 3N, Devstral

**Cloud (OpenRouter):**
- Claude Sonnet 4, GPT-4o, Gemini Flash

---

*Last updated: 2026-02-11*
