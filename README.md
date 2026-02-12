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

### LM Studio Setup

LM Studio provides local LLM inference via an OpenAI-compatible API. This is the recommended way to run AI bots without cloud costs.

#### 1. Install & Start LM Studio
1. Download [LM Studio](https://lmstudio.ai/) and install
2. Load a model (recommended: **Nemotron 3 Nano 30B**, **Qwen3 Coder 30B**, or **Mistral Small 24B**)
3. Start the local server — it runs at `http://localhost:1234/v1` by default

#### 2. Connect to Poker
1. Start the poker dev server: `npm run dev`
2. Open `http://localhost:3800/table/demo`
3. Press `D` to open the Debug Panel → **Drivers** tab
4. Find your model and click **🔥 Warm Up** to preload it
5. The status dot turns green when connected ✓

#### 3. Bot AI Configuration (Debug Panel → Controls)
- **AI Mode toggle** — Switch between LLM-powered decisions and pure rule-based
- **Deliberation toggle** — Enable multi-turn self-questioning (more thoughtful but slower)
- **Deliberation Steps** — How many internal questions before deciding (1-5)
- **Bot Think Time** — Min/max simulated thinking delay for realism
- **AI Timeout** — Max time to wait for model response (set ∞ for unlimited)
- **Mistake Frequency** — How often bots make human-like errors (0-50%)
- **Mistake Severity** — How bad the mistakes are when they happen

#### 4. How It Works
- All bots share the currently loaded LM Studio model (avoids model swapping)
- Each bot has a unique **personality** (system prompt) and **playstyle** (aggression, tightness, bluff frequency)
- A keepalive ping prevents LM Studio from unloading the model
- If LM Studio is offline or the model fails, bots automatically fall back to rule-based play
- Mistakes include: hero-calls, scared folds, bet missizing, slow-plays — just like real humans

#### 5. Supported Models

Any model that supports chat completions works. Tested models:

| Model | Size | Speed | Notes |
|-------|------|-------|-------|
| Nemotron 3 Nano | 30B | Fast | Uses `reasoning_content` field |
| Qwen3 Coder | 30B | Fast | Analytical, great at JSON output |
| GLM 4.7 Flash | ~8B | Very Fast | Quick decisions, loose style |
| Mistral Small | 24B | Medium | Balanced, good reasoning |
| DeepSeek R1 | 8B | Medium | Deep reasoning chains |
| Gemma 3N | ~4B | Very Fast | Ultra-tight personality |

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

**[poker.jeremysarda.com](https://poker.jeremysarda.com)** — Play against AI bots right now!

## New Features (v0.9)

- **🎰 Lobby** — Browse tables, create your own, join with custom buy-in (`/lobby`)
- **🔊 Audio** — 9 procedural sounds (deal, chips, win) via Web Audio API
- **📊 Player Stats** — Track your performance at `/profile/[playerId]`
- **🔐 Auth** — Google/GitHub OAuth + email/password login
- **📈 Analytics** — GA4 + Microsoft Clarity integration

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1` | Health check |
| GET | `/api/v1/table/:id` | Get game state (player view) |
| POST | `/api/v1/table/:id` | Submit action `{ action: { type, amount? } }` |
| POST | `/api/v1/table/:id/debug` | Debug commands (reset, update_bot) |
| GET | `/api/v1/games` | List active games |
| GET/POST | `/api/v1/tables` | List/create lobby tables |
| POST | `/api/v1/tables/:id/join` | Join table with buy-in |
| POST | `/api/v1/tables/:id/leave` | Leave table |
| GET/POST | `/api/v1/drivers` | List/manage AI drivers |
| GET | `/api/v1/decisions` | Bot decision log |
| GET/DELETE | `/api/v1/history` | Hand history (supports `?gameId=` filter) |
| GET/POST | `/api/v1/settings` | Runtime game configuration |
| GET | `/api/v1/players/:id/stats` | Player statistics |
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
- **~11,000 lines** of TypeScript across 70+ files

## License

Private — All rights reserved.
