# Phase 10: Real-Time Chat & Social System

## Architecture

### Data Layer (`/src/lib/chat-manager.ts`)
- **globalThis singleton pattern** — survives HMR, edge-compatible
- `ChatMessage` — id, tableId, playerId, playerName, content, timestamp, reactions, type
- `PlayerProfile` — playerId, playerName, friends[], lastSeen, online
- In-memory stores: `Map<tableId, ChatMessage[]>` and `Map<playerId, PlayerProfile>`
- 200 message cap per table (FIFO eviction)

### API Endpoints (all `runtime = 'edge'`)

| Endpoint | Methods | Description |
|---|---|---|
| `/api/v1/chat/messages` | GET, POST | Fetch messages (with `?since=` polling), send messages |
| `/api/v1/reactions` | POST, DELETE | Add/remove emoji reactions on messages |
| `/api/v1/players/[id]/friends` | GET, POST, DELETE | Friend list CRUD with online status |

### Polling Design
- Client polls GET `/api/v1/chat/messages?tableId=X&since=T` every 1000ms
- Response includes `timestamp` for next `since` parameter
- WebSocket-ready: same message format, swap transport later

### UI (`/src/components/chat-panel.tsx`)
- Fixed-position panel (bottom-right), toggle button with unread badge
- Framer Motion slide-in/out animation + message bubble animations
- Quick preset messages ("Nice hand! 👍", "GG 🎉", etc.)
- Click message → emoji reaction picker (6 reactions)
- Audio notification via Web Audio API (800Hz chirp, 150ms)

### Integration
- `ChatPanel` added to `PokerTable` component
- Uses first player's id/name from game state

## Files Changed/Added
- `src/lib/chat-manager.ts` — Core logic
- `src/components/chat-panel.tsx` — Chat UI
- `src/app/api/v1/chat/messages/route.ts` — Message API
- `src/app/api/v1/reactions/route.ts` — Reaction API
- `src/app/api/v1/players/[id]/friends/route.ts` — Friend API
- `src/components/poker-table.tsx` — Integration (ChatPanel added)
- `tests/chat-manager.test.ts` — 12 unit tests
- `docs/PHASE-10.md` — This file
