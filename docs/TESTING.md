# Testing Strategy

> **Status:** ✅ Phase 6 Complete — 61 tests passing

## Unit Tests

### Hand Evaluation
- Every hand rank (high card → royal flush)
- Kicker comparison
- Split pots (tied hands)
- Wheel straight (A-2-3-4-5)
- Steel wheel (A-2-3-4-5 flush)
- Best 5 from 7 cards

### Betting Logic
- Min raise calculation
- All-in amounts
- Side pot creation
- Multi-way pots
- Heads-up blinds (dealer = SB)

### Game Flow
- Full hand simulation
- All-in before community cards
- Fold to win (no showdown)
- Showdown with multiple winners

### Bot Decisions
- Valid action selection
- Rule-based fallback
- Never illegal action
- Timeout handling

## Integration Tests

- REST API endpoints
- Auth flow (register → login → session → logout)
- Game creation and joining
- Multi-player hand completion
- Driver management

## E2E Tests (Playwright)

- Login flow
- Join table
- Play hand to completion
- Debug panel interaction
- Keyboard shortcuts

## Test Framework

| Tool | Purpose |
|------|---------|
| Vitest | Unit + integration tests |
| Playwright | E2E browser tests |
| MSW | API mocking |

## Run Commands

```bash
npm test            # Watch mode
npm run test:run    # Run once
npm run test:coverage  # With coverage
```

## Current Coverage

| File | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| hand-eval.ts | 100% | 100% | 100% | 100% |
| deck.ts | 100% | 100% | 100% | 100% |
| game.ts | 91% | 73% | 98% | 93% |

## Test Files

- `tests/hand-eval.test.ts` — 28 tests (hand evaluation, comparison)
- `tests/game.test.ts` — 33 tests (betting, streets, pots, views)

## Priority Tests

1. Hand evaluation (most critical)
2. Betting/pot logic
3. API endpoints
4. Auth flow
5. Game flow E2E
