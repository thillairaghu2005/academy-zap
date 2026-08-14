# Foundation Status

This file records what is safe to expose before the first production vertical slice. A route that
is not implemented must remain an explicit typed 501 response; it must not create fake state.

## Required Now

| Area | Status |
|---|---|
| Platform health | Implemented at `/api/v1/health` |
| Authentication | Implemented with Argon2id, short-lived access JWTs, httpOnly refresh cookies, Redis denylist, origin checks, and RBAC |
| Content catalog | Published-only catalog/detail reads implemented; enrollment/progress/playback remain deferred |
| Event bus | Redis Streams producer/consumer and PostgreSQL idempotency markers implemented |
| Gamification Phase 0 | Course/assessment events flow through Integrity Gate, hash-chained ledger, and ProgressContext |
| Database | PostgreSQL 16/TimescaleDB with Alembic subsystem heads merged into one release head |

## Deferred Vertical Slices

| Area | Classification | Current behavior |
|---|---|---|
| Judge execution | D | Typed, authenticated, rate-limited 501; no code is executed |
| Lab provisioning | D | Typed, authenticated 501; no session or sandbox is provisioned |
| Lab terminal | D | Authenticated and ownership/expiry checked, then explicit WebSocket 4501 |
| Assessment grading | D | Catalog reads work; attempts and grading are explicit 501 |
| SSE judge/gamification updates | D | No fake stream and no polling substitute is exposed |
| Leaderboards/projections | D | No public projection is exposed as live data; route returns typed 501 |
| Credentials/badges | D | Public verify route returns typed 501; no unsigned claims are issued |
| Leagues/guilds | D | No standings are calculated or exposed before their season model exists |
| Payments/webhooks | D | Hosted checkout and webhook routes return typed 501; no fulfillment occurs |
| Search/notifications/analytics | D | Routes return typed 501 until their owned stores and workers exist |

## Removed Unsafe Demo Paths

- Browser-local demo authentication was removed from the production auth path.
- SSO buttons no longer create synthetic accounts.
- The frontend uses a same-origin Next.js API proxy to FastAPI; access tokens remain in memory and
  refresh tokens remain httpOnly cookies.
- Deferred demo-state controls default to disabled and are not an authentication boundary.
