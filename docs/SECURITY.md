# Security & Provably Fair

## Server-Authoritative Design

| Threat | Mitigation |
|--------|------------|
| Client sends invalid action | Server validates ALL actions |
| Client claims wrong cards | Client never receives opponent cards |
| Balance manipulation | Double-entry ledger |
| Bot collusion | All decisions logged with reasoning |
| Replay attacks | Sequential action index per hand |
| Rate abuse | Rate limiting on actions |

## Provably Fair Shuffling

### Before Hand
1. Server generates `serverSeed = randomUUID()`
2. Server generates `salt = randomUUID()`
3. Server computes `seedHash = SHA-256(serverSeed + salt)`
4. Server sends `seedHash` to all players (commitment)

### Shuffling
5. `combinedSeed = SHA-256(serverSeed + salt)`
6. Use as PRNG seed for Fisher-Yates shuffle
7. Deck order is deterministic from seed

### After Hand
8. Server reveals `serverSeed` + `salt`
9. Players verify: `SHA-256(serverSeed + salt) === seedHash`
10. Players can re-derive deck order from seeds

## Card Hiding

The server NEVER sends opponent hole cards to the client until showdown:

```typescript
function getPlayerView(state: GameState, playerId: string): PlayerGameView {
  // Only include this player's cards
  myCards: me?.holeCards ?? [],
  
  // Opponent cards only during showdown
  showdownHands: isShowdown ? revealedHands : undefined,
}
```

## Rate Limiting (Planned)

```typescript
const LIMITS = {
  actions_per_second: 2,
  chat_per_minute: 10,
  table_joins_per_minute: 5,
  login_per_hour: 10,
};
```

## Audit Trail

Every significant action is logged:
- Login/logout
- Balance changes
- Table creation/closure
- Player bans
- Admin actions
- Hand results with full history
