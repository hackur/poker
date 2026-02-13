# POKER-MASTER.md -- Project Index

> **Project:** Texas Hold'em with AI Bot Players
> **Status:** Deployed on Cloudflare Pages with KV persistence
> **Deploy:** poker-70o.pages.dev / poker.jeremysarda.com

---

## Documentation

All detailed documentation is in `/docs/`:

| Document | Description |
|----------|-------------|
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Vision, requirements, phase plan |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, tech stack |
| [docs/POKER-ENGINE.md](./docs/POKER-ENGINE.md) | State machine, hand eval, betting |
| [docs/AI-BOTS.md](./docs/AI-BOTS.md) | Bot system, drivers, personalities |
| [docs/DATABASE.md](./docs/DATABASE.md) | Schema (KV key structure) |
| [docs/API.md](./docs/API.md) | REST endpoint reference |
| [docs/AUTH.md](./docs/AUTH.md) | Authentication system |
| [docs/SECURITY.md](./docs/SECURITY.md) | Server-authoritative design |
| [docs/UI-DESIGN.md](./docs/UI-DESIGN.md) | Layouts, components, design tokens |
| [docs/WEBSOCKET.md](./docs/WEBSOCKET.md) | WebSocket + polling protocol |
| [docs/ADMIN.md](./docs/ADMIN.md) | Admin dashboard |
| [docs/TESTING.md](./docs/TESTING.md) | Testing strategy |

---

## Quick Start

```bash
cd /Volumes/JS-DEV/poker
npm run dev    # Port 3800
```

Open:
- `http://localhost:3800/lobby` -- Create/join tables, add bots to seats

Press **D** to open debug panel.

---

## Key Files

```
/Volumes/JS-DEV/poker/
├── CLAUDE.md              # AI coding rules
├── README.md              # User-facing docs
├── docs/                  # Detailed documentation
├── src/
│   ├── app/api/v1/        # REST endpoints
│   ├── app/(game)/lobby/  # Lobby page
│   ├── app/table/[id]/    # Game table page
│   ├── components/        # React components
│   └── lib/               # Game engine, auth, persistence
└── package.json
```

---

## AI Models Available

**Local (LM Studio / Ollama):**
- Any OpenAI-compatible model (Qwen, Mistral, GLM, DeepSeek, Gemma, etc.)

**Cloud (OpenRouter):**
- Claude Sonnet 4, GPT-4o, Gemini Flash

---

*Last updated: 2026-02-12*
