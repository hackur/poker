# CLAUDE.md — Poker Project

## Stack
- Next.js 15, React 19, TypeScript, Tailwind CSS v4
- Target: Cloudflare Workers + Durable Objects (production)
- Prototype: Next.js dev server with in-memory game state + SSE

## Commands
- `npm run dev` — start dev server on port 3800
- `npm run build` — production build
- `npm run lint` — lint

## Architecture
- `src/lib/poker/` — pure game engine (zero side effects, zero I/O)
- `src/lib/game-manager.ts` — server-side singleton managing active games
- `src/app/api/table/[id]/` — REST actions + SSE event stream
- `src/components/` — React UI components

## Rules
- SOLID, DRY, KISS — always
- Server-authoritative: client NEVER sees other players' hole cards
- All actions validated server-side
- Bots always clearly labeled with 🤖 badge
- No headless browser testing — always headed/visible
