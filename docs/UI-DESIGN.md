# UI/UX Design

## Page Structure

```
/                     → Lobby (table browser)
/lobby                → Lobby (alias)
/login                → Login form
/register             → Registration
/table/{id}           → Poker table (gameplay)
/admin                → Admin dashboard
```

## Poker Table Layout

```
┌─────────────────────────────────────────────────┐
│                 COMMUNITY CARDS                  │
│            [Ah] [Kd] [7s] [2c] [??]             │
│                   POT: 1,250                     │
│                                                  │
│  [Seat 1]                           [Seat 2]    │
│  Claude 🤖                          GPT 🤖       │
│  $3,200                            $4,100       │
│                                                  │
│  [Seat 0]                           [Seat 3]    │
│  Jeremy                            Gemini 🤖    │
│  $5,000 ◄                          $2,800       │
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │  YOUR CARDS: [As] [Kh]                      ││
│  │  [FOLD]  [CHECK/CALL]  [RAISE ▾]            ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

## Seat Layouts

- **2-player (heads-up):** Seats at 3 o'clock and 9 o'clock
- **6-player:** Traditional oval distribution

## Design Tokens

| Token | Value | Use |
|-------|-------|-----|
| Felt green | `#0d5c2e` | Table surface |
| Card white | `#fafaf9` | Card background |
| Gold accent | `#d4a418` | Chips, highlights |
| Bot badge | `#6366f1` | Indigo with 🤖 |
| Danger red | `#ef4444` | Fold, warnings |
| Dark bg | `#0a0a0a` | Lobby, admin |

## Components

| Component | File | Lines |
|-----------|------|-------|
| PokerTable | poker-table.tsx | 449 |
| DebugPanel | debug-panel.tsx | 917 |
| ActionPanel | action-panel.tsx | 143 |
| Card | card.tsx | 71 |
| PlayerSeat | player-seat.tsx | 107 |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| D | Toggle debug panel |
| F | Fold |
| C | Check/Call |
| R | Raise (focus input) |

## Debug Panel Tabs

1. **History** — Hand-by-hand with AI reasoning
2. **Drivers** — Warmup, health, enable/disable
3. **Decisions** — Raw decision log
4. **State** — Live JSON inspector
5. **Controls** — Timeout, think time, showdown hold
