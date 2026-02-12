# Phase 14: WebSocket Real-Time Sync via Cloudflare Durable Objects

**Objective:** Replace 1000ms polling with instant WebSocket-based game state synchronization.

**Current State (Phase 9.5):** Polling-based (1s delay, scalable but not instant)
**Target State (Phase 14):** Real-time event-driven via Durable Objects

---

## Architecture Overview

### Durable Objects as Game Session Holders
```
┌─────────────────────────────────┐
│  Client (Poker Table)           │
│  - WebSocket → Durable Object   │
└────────────┬────────────────────┘
             │ connect() | action() | subscribe()
             ▼
┌─────────────────────────────────┐
│  Durable Object (GameSession)    │
│  - Holds live game state         │
│  - Broadcasts to all clients     │
│  - Persists to D1 on hand end    │
└────────────┬────────────────────┘
             │ store()
             ▼
┌─────────────────────────────────┐
│  D1 Database (Hand History)      │
│  - Archived after hand complete  │
└─────────────────────────────────┘
```

### Event Flow
1. **Player Action** (fold, check, raise, etc.) → WebSocket to Durable Object
2. **Durable Object** processes action, updates state
3. **Broadcast** new state to all connected players instantly
4. **Optional Persistence** at key moments (hand start, showdown, end)

---

## Key Components

### 1. Durable Object Class: `GameSessionDO`
```typescript
// src/lib/durable-objects/game-session.ts
export class GameSessionDO implements DurableObject {
  state: GameState;
  env: Env;
  connections: WebSocket[] = [];

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    
    if (url.pathname === '/connect') {
      return this.handleWebSocket(req);
    }
    
    if (req.method === 'POST') {
      const action = await req.json();
      return this.handleAction(action);
    }
  }

  handleWebSocket(req: Request): Response {
    // Upgrade to WebSocket, add to connections
    // Send current game state
    // Listen for messages
  }

  async handleAction(action: PlayerAction): Promise<Response> {
    // Process action against game state
    // Validate (server authoritative!)
    // Update state
    // Broadcast to all connections
    // Return confirmation
  }

  broadcast(message: GameUpdate): void {
    // Send to all connected players
    this.connections.forEach(ws => ws.send(JSON.stringify(message)));
  }
}
```

### 2. Client Hook: `useGameWebSocket`
```typescript
// src/hooks/useGameWebSocket.ts
export function useGameWebSocket(gameId: string) {
  const [state, setState] = useState<GameState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const doId = new URL(
      `/api/v1/durable-objects/game/${gameId}`,
      window.location.href
    );
    
    wsRef.current = new WebSocket(doId);
    
    wsRef.current.onmessage = (e) => {
      const update = JSON.parse(e.data);
      setState(update);
    };
    
    return () => wsRef.current?.close();
  }, [gameId]);

  const sendAction = (action: PlayerAction) => {
    wsRef.current?.send(JSON.stringify(action));
  };

  return { state, sendAction };
}
```

### 3. API Route: Durable Object Binding
```typescript
// src/app/api/v1/durable-objects/game/[id]/route.ts
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const gameSessionDO = env.GAME_SESSIONS.get(id);
  return gameSessionDO.fetch(req);
}
```

### 4. Wrangler Configuration
```toml
# wrangler.toml
[[durable_objects.bindings]]
name = "GAME_SESSIONS"
class_name = "GameSessionDO"
script_name = "poker"
```

---

## Migration Path (Polling → WebSocket)

### Phase 9.5 (Current)
- Client polls `/api/v1/table/[id]` every 1000ms
- Latency: 0-1000ms
- Load: N players × 1 req/s

### Phase 14 (Target)
- Client connects WebSocket to Durable Object
- Latency: ~50-100ms
- Load: 1 persistent connection per player
- Fallback: XHR polling if WebSocket unavailable

### Hybrid Approach (Recommended)
1. Keep polling for initial state load
2. Upgrade to WebSocket for live updates
3. Graceful degradation if DO unavailable
4. Fallback to polling (Vercel-compatible)

---

## Acceptance Criteria

- ✅ Durable Object created and deployed
- ✅ WebSocket upgrade works from client
- ✅ Real-time action updates (< 200ms latency)
- ✅ Broadcast to all players works
- ✅ Connection recovery on disconnect
- ✅ Server-authoritative validation (no client spoofing)
- ✅ Hand history persisted to D1 on completion
- ✅ Fallback to polling if DO unavailable
- ✅ Load testing: 100 concurrent games
- ✅ All tests passing
- ✅ No TypeScript errors

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Connection drops mid-hand | Reconnect with last known state, resume |
| Too many concurrent sessions | Durable Object limits; scale horizontally |
| WebSocket not supported (old browsers) | Fallback to polling, graceful degrade |
| State divergence (bug) | Server-authoritative, replay log in DO |

---

## Performance Targets

- **Latency**: < 200ms action-to-update (WebSocket)
- **Throughput**: 1000 concurrent games (Durable Objects)
- **Persistence**: D1 write on hand end (< 500ms)
- **Reliability**: 99.9% uptime (Cloudflare SLA)

---

## Next Steps

1. Design Durable Object schema
2. Implement GameSessionDO class
3. Build client WebSocket hook
4. Integrate into table UI
5. Test with bot games
6. Load test concurrent sessions
7. Implement fallback logic
8. Deploy and monitor

---

**Estimated Timeline:** 1-2 weeks (after Phase 10-13 complete)
**Blocker:** None (Cloudflare Durable Objects included in Pages)
