# Poker -- AI-Powered Texas Hold'em Platform

A full-stack Texas Hold'em poker platform where you play against AI opponents powered by local and cloud LLMs. Built with Next.js 15, React 19, and TypeScript. Deployed on Cloudflare Pages with KV persistence.

## Features

- **Lobby-based table system** -- create, join, and manage poker tables
- **Per-seat bot controls** -- add AI bots to specific seats with profile selection
- **Local AI support** via LM Studio and Ollama (any OpenAI-compatible model)
- **Cloud AI support** via OpenAI, Anthropic, Google, OpenRouter
- **Full decision transparency** -- see every bot's reasoning, hand assessment, and inference time
- **Hand history** -- complete record of every hand with actions, cards, and AI reasoning
- **Debug panel** -- live driver health, decision log, hand history, game config, state inspector
- **Runtime configuration** -- adjust AI timeout (including unlimited), think times, showdown hold
- **Server-authoritative** -- hole cards hidden until showdown
- **Real poker rules** -- proper blinds, side pots, heads-up blind posting
- **KV-backed persistence** -- game state survives edge worker restarts
- **WebSocket + polling** -- real-time updates with automatic polling fallback
- **Guest auto-login** -- play immediately without registration

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3800
```

For production:
```bash
npm run build && npx next start -p 3800
```

Run tests:
```bash
npm test          # 280 tests across 14 test files
```

## How to Play

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3800/lobby`
3. Create a table (configure blinds, buy-in, max players)
4. Sit at a seat, then add AI bots to empty seats using the seat menu
5. Press `D` to open the Debug Panel for full AI transparency

## AI Bot System

Bots use a hybrid approach:
1. **AI model call** via OpenAI-compatible API (LM Studio, Ollama, cloud)
2. **Rule-based fallback** if model is unavailable or times out

### Per-Seat Bot Controls

Empty seats display a "Sit Here" button for humans and a bot profile picker. The `EmptySeat` component lets you choose from available bot profiles and place bots at specific seats.

### Pre-configured Drivers

| Name | Model | Play Style | Provider |
|------|-------|------------|----------|
| Claude | claude-sonnet-4 | Tight-Aggressive | OpenRouter |
| GPT | gpt-4o | Maniac | OpenRouter |
| Gemini | gemini-2.5-flash | Tight-Passive | OpenRouter |

Local models (LM Studio/Ollama) can use any OpenAI-compatible model.

### LM Studio Setup

LM Studio provides local LLM inference via an OpenAI-compatible API. This is the recommended way to run AI bots without cloud costs.

1. Download [LM Studio](https://lmstudio.ai/) and install
2. Load a model (recommended: Qwen3 Coder 30B, Mistral Small 24B, or similar)
3. Start the local server -- it runs at `http://localhost:1234/v1` by default
4. Start the poker dev server: `npm run dev`
5. Open `http://localhost:3800/lobby` and create a table
6. Press `D` to open the Debug Panel, go to Drivers tab
7. Find your model and click Warm Up to preload it
8. Add bots to empty seats -- they will use the loaded model

### Bot AI Configuration (Debug Panel)

- **AI Mode toggle** -- Switch between LLM-powered decisions and pure rule-based
- **Deliberation toggle** -- Enable multi-turn self-questioning (more thoughtful but slower)
- **Deliberation Steps** -- How many internal questions before deciding (1-5)
- **Bot Think Time** -- Min/max simulated thinking delay for realism
- **AI Timeout** -- Max time to wait for model response (set unlimited for no cap)
- **Mistake Frequency** -- How often bots make human-like errors (0-50%)
- **Mistake Severity** -- How bad the mistakes are when they happen

### Supported Models

Any model that supports chat completions works. Tested models:

| Model | Size | Speed | Notes |
|-------|------|-------|-------|
| Qwen3 Coder | 30B | Fast | Analytical, great at JSON output |
| GLM 4.7 Flash | ~8B | Very Fast | Quick decisions, loose style |
| Mistral Small | 24B | Medium | Balanced, good reasoning |
| DeepSeek R1 | 8B | Medium | Deep reasoning chains |
| Gemma 3N | ~4B | Very Fast | Ultra-tight personality |

## Authentication

The platform uses KV-backed authentication (`src/lib/auth-kv.ts`):

- **Guest auto-login** -- new visitors automatically get a guest account and can play immediately
- **Email/password registration** -- PBKDF2 hashing with Web Crypto API (edge-safe)
- **Session cookies** -- 7-day TTL, stored in Cloudflare KV
- **Admin auto-seeding** -- default admin account created on first access
- **In-memory fallback** -- works without KV for local development

### Security Model

All table API endpoints follow this authentication pattern:
1. Read session cookie
2. Validate against KV-stored session
3. Resolve to authenticated `playerId`
4. Fall back to guest auto-creation if no session

## Debug Panel

Press `D` to open the debug panel:

| Tab | Description |
|-----|-------------|
| **History** | Complete hand history with expandable actions and AI reasoning per hand |
| **Drivers** | AI driver health check, enable/disable, personality stats |
| **Decisions** | Live decision log with full prompt/response drill-down |
| **State** | Raw game state inspector |
| **Controls** | Runtime config sliders (AI timeout, think time, showdown hold) + game reset |

## Live Demo

**[poker.jeremysarda.com](https://poker.jeremysarda.com)**

## API Endpoints

### Table Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/table/:id` | Get game state (player view) |
| POST | `/api/v1/table/:id` | Submit action `{ action: { type, amount? } }` |
| POST | `/api/v1/table/:id/add-bot` | Add bot to table `{ botProfile, seat? }` |
| POST | `/api/v1/table/:id/move-seat` | Move player to empty seat `{ toSeat }` |
| POST | `/api/v1/table/:id/debug` | Debug commands (reset, update_bot) |

### Lobby

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tables` | List lobby tables |
| POST | `/api/v1/tables` | Create table |
| POST | `/api/v1/tables/:id/join` | Join table with buy-in |
| POST | `/api/v1/tables/:id/leave` | Leave table |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Register |
| GET | `/api/v1/auth/session` | Current session (creates guest if none) |
| POST | `/api/v1/auth/logout` | Logout |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1` | Health check |
| GET | `/api/v1/games` | List active games |
| GET/POST | `/api/v1/drivers` | List/manage AI drivers |
| GET | `/api/v1/decisions` | Bot decision log |
| GET/DELETE | `/api/v1/history` | Hand history |
| GET/POST | `/api/v1/settings` | Runtime game configuration |
| GET | `/api/v1/players/:id/stats` | Player statistics |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `D` | Toggle debug panel |
| `F` | Fold |
| `C` | Check / Call |
| `R` | Raise (minimum) |

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** with portfolio HSL design tokens
- **Fonts:** Inter, Space Grotesk, JetBrains Mono
- **Persistence:** Cloudflare KV (`GAME_STATE` namespace)
- **Deploy:** Cloudflare Pages via `@cloudflare/next-on-pages`
- **AI:** OpenAI-compatible API for all model providers
- **Port:** 3800

## License

Private -- All rights reserved.
