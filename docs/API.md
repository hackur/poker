# API Reference

All endpoints are under `/api/v1/`. All table-related endpoints run on edge runtime and authenticate via cookie session.

## Authentication

All table endpoints use cookie-based auth:
1. Read session cookie
2. Validate against KV session
3. Resolve `playerId`
4. Guest auto-create if no session

---

## Table Endpoints

### GET /api/v1/table/:id
Get game state (player view). Hole cards hidden for opponents.

**Response:**
```json
{
  "id": "uuid",
  "phase": "preflop",
  "players": [...],
  "communityCards": [],
  "pots": [{ "amount": 20, "eligible": [] }],
  "myCards": [{ "rank": 14, "suit": "s" }, ...],
  "validActions": [{ "type": "fold" }, { "type": "call", "minAmount": 5 }],
  "maxPlayers": 6,
  ...
}
```

### POST /api/v1/table/:id
Submit a player action.

**Request:**
```json
{ "action": { "type": "call" } }
{ "action": { "type": "raise", "amount": 50 } }
```

### POST /api/v1/table/:id/add-bot
Add a bot to the table at a specific seat.

**Request:**
```json
{ "botProfile": "tight-aggressive", "seat": 3 }
```

The `seat` parameter is optional. If omitted, the bot is placed at the first available seat.

### POST /api/v1/table/:id/move-seat
Move a player to a different empty seat.

**Request:**
```json
{ "toSeat": 4 }
```

### POST /api/v1/table/:id/debug
Debug commands (dev only).

**Request:**
```json
{ "command": "reset" }
{ "command": "update_bot", "botId": "bot-0", "field": "model", "value": "gpt" }
```

---

## Lobby Endpoints

### GET /api/v1/tables
List all lobby tables.

### POST /api/v1/tables
Create a new table.

**Request:**
```json
{
  "name": "My Table",
  "smallBlind": 5,
  "bigBlind": 10,
  "minBuyIn": 100,
  "maxBuyIn": 1000,
  "maxPlayers": 6
}
```

### POST /api/v1/tables/:id/join
Join a table with buy-in.

**Request:**
```json
{ "buyIn": 500, "displayName": "Player Name" }
```

### POST /api/v1/tables/:id/leave
Leave a table.

---

## Game Endpoints

### GET /api/v1/games
List all active games.

---

## Driver Endpoints

### GET /api/v1/drivers
List all configured AI drivers.

### POST /api/v1/drivers
Driver actions.

**Check health:**
```json
{ "action": "check_health", "driverId": "nemotron-local" }
```

**Warmup model:**
```json
{ "action": "warmup", "driverId": "nemotron-local" }
```

**Update driver:**
```json
{ "action": "update", "driverId": "...", "updates": { "enabled": false } }
```

---

## History & Decision Endpoints

### GET /api/v1/history
Get hand history. Supports `?gameId=` filter.

### DELETE /api/v1/history
Clear hand history.

### GET /api/v1/decisions
Get bot decision log.

---

## Settings Endpoints

### GET /api/v1/settings
Get current game settings.

### POST /api/v1/settings
Update settings (partial).

**Request:**
```json
{ "aiTimeoutMs": 0 }
```
(`0` = unlimited)

---

## Auth Endpoints

### POST /api/v1/auth/login
```json
{ "email": "...", "password": "..." }
```

### POST /api/v1/auth/register
```json
{ "email": "...", "username": "...", "password": "..." }
```

### GET /api/v1/auth/session
Get current session. Creates guest user if no session exists.

### POST /api/v1/auth/logout
End session (deletes KV session record).

---

## Player Endpoints

### GET /api/v1/players/:id/stats
Get player statistics (hands played, win rate, etc.).

---

## Health

### GET /api/v1
Health check.

**Response:**
```json
{
  "api": "poker",
  "version": "1.0.0",
  "status": "ok",
  "timestamp": "..."
}
```
