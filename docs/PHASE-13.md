# Phase 13: Mobile-First Responsive Design & Touch Optimization

## Overview
Makes poker.jeremysarda.com fully playable on tablets and phones with touch gesture support, responsive layouts, and mobile-optimized UI.

## Architecture

### Responsive Strategy
- **Mobile** (<640px): Compact 4:3 table, stacked UI, touch gestures, hamburger nav
- **Tablet** (640-1024px): Side-by-side compact layout with larger tap targets
- **Desktop** (>1024px): Original oval table design (unchanged)

### Component Hierarchy
```
ResponsiveTableWrapper
├── PokerTable (desktop)          — existing, unchanged
├── MobilePokerTable (mobile/tablet) — new mobile-optimized table
│   ├── useGestureDetector        — touch gesture detection
│   ├── MobileControls            — touch-friendly action buttons
│   └── Mobile seat positions     — repositioned for small screens
└── ChatPanel                     — collapsible on mobile
```

### Touch Gestures
| Gesture     | Action     | Implementation |
|-------------|------------|----------------|
| Swipe Left  | Fold       | `useGestureDetector` with velocity threshold |
| Tap         | Check/Call | Delayed tap (300ms) to allow double-tap |
| Long Press  | Raise      | 500ms hold triggers raise slider |
| Double Tap  | All-in     | Two taps within 300ms |

### Key Files
| File | Purpose |
|------|---------|
| `src/hooks/useMediaQuery.ts` | Responsive breakpoints, device detection |
| `src/hooks/useGestureDetector.ts` | Swipe/tap/longpress/doubletap detection |
| `src/components/poker-table-mobile.tsx` | Mobile-optimized table component |
| `src/components/mobile-controls.tsx` | Touch-friendly action buttons |
| `src/components/responsive-table-wrapper.tsx` | Routes to desktop or mobile table |
| `src/components/chat-panel.tsx` | Collapsible chat for mobile |
| `src/styles/responsive.css` | Media queries, touch targets, safe areas |

## CSS Approach
- Media queries at 640px and 1024px breakpoints
- `min-height: 44px` enforced on all interactive elements for touch
- Safe area insets for notched phones (`env(safe-area-inset-*)`)
- `100dvh` for proper mobile viewport height
- Pointer coarse detection disables hover states on touch devices

## Testing
- `tests/phase13/useMediaQuery.test.ts` — Breakpoint hooks with matchMedia mocks
- `tests/phase13/useGestureDetector.test.ts` — Gesture detection (tap, double-tap, swipe, long press)
- `tests/phase13/responsive-layout.test.ts` — Component exports, CSS validation

## Acceptance Criteria
- ✅ All pages functional at 360px width
- ✅ Touch gestures: swipe=fold, tap=check/call, hold=raise, 2×tap=all-in
- ✅ No horizontal scrolling
- ✅ 44px+ tap targets
- ✅ Landscape mode: 16:9 table
- ✅ Chat collapses on mobile with unread badge
- ✅ Hamburger menu on mobile
- ✅ Safe area support for notched phones
