# Phase 11: Leaderboards, ELO Ratings & Achievement Badges

## Overview
Dynamic player ranking system with ELO ratings, achievement badges, and leaderboards.

## Architecture

### ELO System (`/src/lib/elo-system.ts`)
- **K-factor**: 32 (standard chess-like)
- **Default rating**: 1200
- **Formula**: Standard ELO — `K * (actual - expected)` where `expected = 1/(1 + 10^((Rb-Ra)/400))`
- After each hand, each winner is paired against each loser; deltas are averaged
- Rating history kept (last 200 entries) for chart rendering

### Badge System
| Badge | Requirement |
|-------|-------------|
| First Win | Win 1 hand |
| First 5 Wins | Win 5 hands |
| 50-Win Club | Win 50 hands |
| $100 Winnings | 100 cumulative chips won |
| $1K Winnings | 1,000 cumulative chips won |
| $10K Winnings | 10,000 cumulative chips won |
| 10-Win Streak | 10 consecutive wins |
| Comeback Kid | Win after being down 50% of session start |
| Risk Taker | 5+ all-ins in a single session |

### Leaderboard Store (`/src/lib/leaderboard-store.ts`)
- **Periods**: all-time, weekly
- **Weekly resets**: Snapshots current ratings on Monday 00:00 UTC; weekly change = current - snapshot
- **Stake levels**: micro (≤10bb), low (≤50bb), mid (≤200bb), high (>200bb)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/rankings?period=&limit=&offset=` | GET | Global leaderboard |
| `/api/v1/players/[id]/badges` | GET | Player badges + ELO |
| `/api/v1/players/[id]/badges` | POST | Manually trigger badge check |
| `/api/v1/leaderboards/[period]/[stake]` | GET | Filtered leaderboard |

## UI Pages

- **`/rankings`** — Global leaderboard with period toggle (all-time / weekly)
- **`/profile/[playerId]`** — Updated with ELO chart and achievement badges
- **`/stats`** — Personal stats (existing, enhanced)

## Integration
To integrate with the game loop, call after each hand:
```typescript
import { updateEloAfterHand, updateBadgeProgress } from '@/lib/elo-system';

// After hand completes:
updateEloAfterHand({
  handId: hand.handId,
  players: hand.players.map(p => ({
    id: p.id,
    name: p.name,
    won: winners.has(p.seat),
  })),
});

// For each player:
updateBadgeProgress(playerId, playerName, {
  won: isWinner,
  chipsWon: chipDelta > 0 ? chipDelta : undefined,
  wentAllIn: player.allIn,
  currentStack: player.endStack,
  startStack: player.startStack,
});
```

## Storage
All data stored in-memory via `globalThis` singletons (same pattern as existing player-stats). Survives HMR, resets on server restart.

## Files Created/Modified
- ✅ `/src/lib/elo-system.ts` — ELO + badges
- ✅ `/src/lib/leaderboard-store.ts` — Rankings
- ✅ `/src/app/api/v1/rankings/route.ts` — Rankings API
- ✅ `/src/app/api/v1/players/[id]/badges/route.ts` — Badges API
- ✅ `/src/app/api/v1/leaderboards/[period]/[stake]/route.ts` — Filtered leaderboards API
- ✅ `/src/app/rankings/page.tsx` — Leaderboard UI
- ✅ `/src/components/badge-display.tsx` — Badge + ELO chart components
- ✅ `/src/app/profile/[playerId]/page.tsx` — Updated with ELO chart + badges
- ✅ `/tests/elo-system.test.ts` — Tests
