# WebSocket Protocol

> **Status:** Planned for Phase 14  
> **Current:** REST polling (1000ms)

## Connection Flow (Planned)

```
1. Client authenticates via REST → session token
2. Client opens WebSocket: wss://game.example.com/table/{id}?token={token}
3. Game Server Worker routes to TableRoom Durable Object
4. DO validates token, adds player to room
5. Bidirectional messages until disconnect
```

## Message Types

### Client → Server

```typescript
type ClientMessage =
  | { type: 'join_table'; seat?: number }
  | { type: 'leave_table' }
  | { type: 'action'; action: PlayerAction }
  | { type: 'chat'; text: string }
  | { type: 'ping' }
```

### Server → Client

```typescript
type ServerMessage =
  | { type: 'table_state'; state: TableView }
  | { type: 'player_joined'; seat: number; player: PublicPlayerInfo }
  | { type: 'player_left'; seat: number }
  | { type: 'hole_cards'; cards: [Card, Card] }
  | { type: 'player_action'; seat: number; action: PlayerAction }
  | { type: 'community_cards'; street: Street; cards: Card[] }
  | { type: 'pot_update'; pots: Pot[] }
  | { type: 'showdown'; results: ShowdownResult[] }
  | { type: 'hand_end'; winners: WinnerInfo[] }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' }
```

## Key Design

- **Server-authoritative:** Client never sees opponent hole cards
- **TableView:** Personalized per player
- **Seed commitment:** Hash before hand, reveal after
- **Action timeout:** 30 seconds default, auto-fold
- **Reconnection:** Full state sync on reconnect

## Current Polling Approach

```typescript
// Client polls every 1000ms
const { data } = await fetch(`/api/v1/table/${id}`);

// Game advances on each poll (tick-based)
gameManager.tick();
```

Benefits for prototype:
- No connection lifecycle
- Easy debugging (curl)
- HMR-friendly
