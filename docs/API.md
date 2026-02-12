# API Reference

All endpoints are under `/api/v1/`.

## Game Endpoints

### GET /api/v1/table/:id
Get game state (player view).

**Response:**
```json
{
  "id": "heads-up-nemotron-local",
  "phase": "preflop",
  "players": [...],
  "communityCards": [],
  "pots": [{ "amount": 20, "eligible": [] }],
  "myCards": [{ "rank": 14, "suit": "s" }, ...],
  "validActions": [{ "type": "fold" }, { "type": "call", "minAmount": 5 }],
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

### POST /api/v1/table/:id/debug
Debug commands (dev only).

**Request:**
```json
{ "command": "reset" }
{ "command": "update_bot", "botId": "bot-0", "field": "model", "value": "gpt" }
```

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

## History Endpoints

### GET /api/v1/history
Get hand history with AI decisions.

**Query params:**
- `gameId` — filter by game

### DELETE /api/v1/history
Clear hand history.

### GET /api/v1/decisions
Get bot decision log.

---

## Settings Endpoints

### GET /api/v1/settings
Get current game settings.

**Response:**
```json
{
  "aiTimeoutMs": 30000,
  "botThinkMinMs": 1000,
  "botThinkMaxMs": 2500,
  "showdownHoldMs": 3000,
  "rebuyStack": 1000
}
```

### POST /api/v1/settings
Update settings (partial).

**Request:**
```json
{ "aiTimeoutMs": 0 }  // 0 = unlimited
```

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
Get current session info.

### POST /api/v1/auth/logout
End session.

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
