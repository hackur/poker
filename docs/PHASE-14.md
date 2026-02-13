# Phase 14: Real-Time Persistence

**Status:** ✅ KV persistence implemented (Phase 14A) | 🔜 WebSocket via DO (Phase 14B future)

## What's Implemented

### Phase 14A: KV Persistence (Current)
Solves the edge runtime state isolation issue using Cloudflare KV.

**Architecture:**
```
┌─────────────────────────────────┐
│  Client (Poker Table)           │
│  - Polls /api/v1/table/[id]     │
│  - 1000ms polling interval      │
└────────────┬────────────────────┘
             │ GET/POST
             ▼
┌─────────────────────────────────┐
│  Edge Function (API Route)       │
│  - KVGameManager                 │
│  - Loads state from KV           │
│  - Saves state to KV after action│
└────────────┬────────────────────┘
             │ get/put
             ▼
┌─────────────────────────────────┐
│  Cloudflare KV                   │
│  - game:{gameId} → GameState    │
│  - 24h TTL                       │
└─────────────────────────────────┘
```

**Key Files:**
- `src/lib/game-manager-kv.ts` - KV-backed game manager
- `src/lib/cf-context.ts` - Cloudflare binding helper
- `src/app/api/v1/table/[id]/route.ts` - Updated API route

**Free Tier Limits:**
- 100,000 reads/day
- 1,000 writes/day (each action = 1 write)
- 1 GB storage

**Status:** ✅ Complete - game state persists across edge workers

---

### Phase 14B: WebSocket via Durable Objects (Future)

When real-time updates become critical (< 200ms latency needed), upgrade to Durable Objects:

**Files Ready (not deployed):**
- `worker/game-session-do.ts` - Durable Object class
- `worker/wrangler.toml` - Worker config
- `src/hooks/useGameWebSocket.ts` - Client WebSocket hook
- `src/components/poker-table-ws.tsx` - WS-enabled table component

**To Deploy DO (when needed):**
```bash
# 1. Deploy DO worker
cd worker
wrangler deploy

# 2. Update main wrangler.toml service binding
# 3. Enable WebSocket in ResponsiveTableWrapper
```

**DO Free Tier:**
- 100,000 requests/day
- 1 GB-second duration/day

---

## Current Behavior

1. **New Game:** First request creates game, saves to KV
2. **Polling:** Client polls every 1000ms
3. **Actions:** POST saves updated state to KV
4. **Bots:** Rule-based decisions (AI integration via LM Studio still available locally)
5. **Persistence:** Games survive edge worker restarts, 24h TTL

## Migration Path

| Phase | Latency | Architecture | Status |
|-------|---------|--------------|--------|
| 9.5 | 0-1000ms | Memory only | ❌ Broken on edge |
| 14A | 0-1000ms | KV persistence | ✅ Current |
| 14B | ~50-100ms | DO + WebSocket | 🔜 Future |

---

## Testing

```bash
# Local (no KV, uses in-memory)
npm run dev

# Production with KV
npm run pages:deploy
# Visit poker.jeremysarda.com/lobby
```

---

*Last updated: 2026-02-12*
