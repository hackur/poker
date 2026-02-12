# Phase 12: Multi-Table Tournaments

## Overview
Full tournament infrastructure for poker.jeremysarda.com supporting multiple tournament formats, blind schedules, bracket management, and payout calculation.

## Architecture

### Core Libraries
- **`/src/lib/tournament-manager.ts`** — Tournament lifecycle (state machine, registration, elimination, table management)
- **`/src/lib/blind-schedule.ts`** — Configurable blind level progression with presets (turbo/standard/deep-stack)
- **`/src/lib/bracket-generator.ts`** — Seating algorithms (snake/random) and bracket generation (single/double elim, round robin)
- **`/src/lib/payout-calculator.ts`** — Prize distribution with standard/top-heavy/flat structures + ICM chop

### Tournament Types
| Type | Trigger | Description |
|------|---------|-------------|
| Sit & Go | Auto-starts when full | Quick games |
| Scheduled | Fixed start time | Planned events |
| Single Elimination | Losers out | Bracket format |
| Double Elimination | Losers bracket | Second chance |
| Round Robin | Everyone plays everyone | League format |

### State Machine
```
Pending → Registering → Active → Complete
                          ↓         ↑
                        Paused ────┘
                          ↓
                       Cancelled
```

### Blind Presets
- **Turbo**: 5 min/level, starts 10/20
- **Standard**: 15 min/level, starts 10/20  
- **Deep Stack**: 20 min/level, starts 5/10

### Seating
- **Snake seating**: ELO-balanced distribution across tables
- **Random**: Shuffled distribution
- **Auto-consolidation**: Tables merge when player count drops below minimum

### Payout Structure
- Automatic paid-place calculation based on field size
- Standard, top-heavy, and flat distributions
- ICM chip chop calculation for deal-making

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tournaments` | List all tournaments |
| POST | `/api/v1/tournaments` | Create tournament |
| GET | `/api/v1/tournaments/[id]` | Tournament details |
| PUT | `/api/v1/tournaments/[id]` | Actions (start/pause/register/eliminate/rebuy) |
| DELETE | `/api/v1/tournaments/[id]` | Delete tournament |
| GET | `/api/v1/tournaments/[id]/bracket` | Bracket state |
| GET | `/api/v1/tournaments/[id]/payouts` | Prize distribution |

## UI Pages

- `/tournaments` — Tournament list + create form
- `/tournaments/[id]` — Tournament details, blinds, tables, bracket, payouts
- `/tournaments/[id]/table/[tableId]` — Table view with oval visualization

## Edge Runtime
All API routes use `export const runtime = 'edge'` for Cloudflare Workers compatibility.
In-memory tournament store (Map-based) — production should use D1/KV.

## Testing
```bash
npx vitest run src/__tests__/tournament.test.ts
```

Covers: blind schedules, seating algorithms, table consolidation, bracket generation, payouts, ICM, tournament lifecycle.
