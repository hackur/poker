# ♠ Poker — AI-Powered Texas Hold'em Platform

A full-stack Texas Hold'em poker platform where you play against AI opponents powered by local and cloud LLMs. Built with Next.js 15, React 19, and TypeScript.

## Features

- **Heads-up or 6-max tables** against AI bot players
- **Local AI support** via LM Studio (Nemotron 3 Nano) and Ollama
- **Cloud AI support** via OpenAI, Anthropic, Google, OpenRouter
- **Full decision transparency** — see every bot's reasoning, hand assessment, and inference time
- **Hand history** — complete record of every hand with actions, cards, and AI reasoning
- **Debug panel** — live driver health, decision log, hand history, game config, state inspector
- **Runtime configuration** — adjust AI timeout (including unlimited), think times, showdown hold
- **Server-authoritative** — hole cards hidden until showdown
- **Real poker rules** — proper blinds, side pots, heads-up blind posting

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3800
```

For production:
```bash
npm run build && npx next start -p 3800
```

## Game Types

| Type | URL | Description |
|------|-----|-------------|
| Demo (6-max) | `/table/demo` | 1 human + 5 AI bots, $5/$10 blinds |
| Heads-Up vs Nemotron | `/table/heads-up-nemotron-local` | 1v1 against Nemotron 3 Nano via LM Studio |
| Heads-Up vs Any | `/table/heads-up-{driverId}` | 1v1 against any configured driver |

## AI Bot System

Bots use a hybrid approach:
1. **AI model call** via OpenAI-compatible API (LM Studio, Ollama, cloud)
2. **Rule-based fallback** if model is unavailable or times out

### Pre-configured Drivers

| Name | Model | Play Style | Provider |
|------|-------|------------|----------|
| Nemotron Nano | nvidia/nemotron-3-nano | Tight-Aggressive | LM Studio |
| Nemotron Deep | nvidia/nemotron-3-nano | Balanced (reasoning) | LM Studio |
| Ollama Bot | llama3.3:70b | Loose-Aggressive | Ollama |
| Claude | claude-sonnet-4 | Tight-Aggressive | OpenRouter |
| GPT | gpt-4o | Maniac | OpenRouter |
| Gemini | gemini-2.5-flash | Tight-Passive | OpenRouter |

## Debug Panel

Press `D` to open the debug panel:

| Tab | Description |
|-----|-------------|
| **History** | Complete hand history with expandable actions and AI reasoning per hand |
| **Drivers** | AI driver health check, enable/disable, personality stats |
| **Decisions** | Live decision log with full prompt/response drill-down |
| **State** | Raw game state inspector |
| **Controls** | Runtime config sliders (AI timeout, think time, showdown hold) + game reset |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1` | Health check |
| GET | `/api/v1/table/:id` | Get game state (player view) |
| POST | `/api/v1/table/:id` | Submit action `{ action: { type, amount? } }` |
| POST | `/api/v1/table/:id/debug` | Debug commands (reset, update_bot) |
| GET | `/api/v1/games` | List active games |
| GET/POST | `/api/v1/drivers` | List/manage AI drivers |
| GET | `/api/v1/decisions` | Bot decision log |
| GET/DELETE | `/api/v1/history` | Hand history (supports `?gameId=` filter) |
| GET/POST | `/api/v1/settings` | Runtime game configuration |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Register |
| GET | `/api/v1/auth/session` | Current session |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `D` | Toggle debug panel |
| `F` | Fold |
| `C` | Check / Call |
| `R` | Raise (minimum) |

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4**
- **OpenAI-compatible API** for all model providers
- **~4,900 lines** of TypeScript

## License

Private — All rights reserved.
