# Known Issues & Limitations

## 🔴 Game State Persistence on Production (Critical)

**Issue:** Games reset/disappear after a few minutes on production (poker.jeremysarda.com).

**Cause:** Edge workers on Cloudflare Pages don't share memory. Each request may hit a different isolate, so `globalThis` state is lost.

**Status:** KV namespace created (`GAME_STATE`), helper functions ready in `src/lib/game-state-kv.ts`, but not yet integrated into game manager.

**Workaround:** Play locally (`npm run dev` on port 3800) for persistent games.

**Fix:** Phase 14 (Durable Objects) will provide proper real-time state persistence.

---

## 🟡 Bot AI Requires Local Model (Expected)

**Issue:** Bots use fallback rule-based strategy on production.

**Cause:** LM Studio/Ollama models only run locally at `http://localhost:1234/v1`.

**Status:** Working as designed. Fallback is intentional.

**Fix:** Configure cloud AI provider (OpenRouter, OpenAI, etc.) in driver settings for production bots.

---

## 🟡 Chat/Leaderboards/Stats Not Persisted (Expected)

**Issue:** Chat messages, ELO ratings, badges reset on deployment.

**Cause:** Same as game state - in-memory storage on edge workers.

**Status:** Expected until database integration.

**Fix:** Phase 14 + D1 database integration.

---

## ✅ Resolved Issues

- **Custom domain Error 522** — DNS propagation complete, domain active
- **Edge runtime missing** — All routes now have `export const runtime = 'edge'`
- **TypeScript errors in payout calculator** — Fixed type narrowing
