# Auth Migration -- Complete

**Date:** 2026-02-12
**Status:** Complete

The authentication system has been migrated from in-memory `globalThis` Maps to Cloudflare KV-backed storage. All API routes use `auth-kv.ts` with cookie sessions.

For full documentation, see:
- `docs/AUTH.md` -- Authentication system documentation
- `CLAUDE.md` -- Auth section with KV key schema
- `src/lib/auth-kv.ts` -- Implementation

Key changes:
- PBKDF2 password hashing (Web Crypto API, edge-safe)
- Sessions in KV with 7-day TTL
- Guest auto-login (no registration required)
- Admin auto-seeding on first access
- All hardcoded `human-1` references removed
- In-memory fallback for local development
