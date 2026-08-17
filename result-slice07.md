# ZAPSTERS — SLICE 07 RESULT
# REAL-TIME SSE → GAMIFICATION / LEADERBOARD READ MODEL UPDATES

Slice 07 is COMPLETE. Slices 01–06 remain frozen. The locked UI is untouched — the only
frontend change is one null-rendering hook mount in the app shell plus the new SSE client
module; no component visuals, spacing, typography, or layout changed.

---

## 1. Existing SSE architecture (discovered)

- **Nothing existed.** A repo-wide search (excluding venv) for `sse`, `EventSource`,
  `streaming`, `pub/sub`, `connection manager` found zero application code. The
  architecture docs (ZAPSTERS_GAMIFICATION_ENGINE.md §2.3, §5.4) specify SSE for leaderboard
  ticks and combo/streak updates, but no implementation existed.
- **Auth constraint found in audit:** the refresh cookie is path-scoped to `/api/v1/auth`
  (rewritten by the Next.js proxy to `/api/backend/auth`), so EventSource on any other path
  cannot carry credentials — and EventSource cannot set an `Authorization` header anyway.
- **Existing event pipeline (reused, not duplicated):** the arq worker
  (`poll_gamification_events`) already consumes `AssessmentSubmittedEvent` from real Redis
  Streams → Integrity Gate → XP Ledger → ProgressContext → leaderboard projection. That was
  the natural hook point for notifications.

## 2. SSE endpoint

- `POST /api/v1/events/ticket` — authenticated exchange (normal `Authorization: Bearer`)
  of the access token for a short-lived single-use SSE ticket.
- `GET /api/v1/events?ticket=...` — the EventSource stream (`text/event-stream`, headers
  `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, `Connection: keep-alive`).
- Both mounted under `gamification/router.py` (prefix `/api/v1`).

## 3. Authentication mechanism

- **Ticket, not token-in-URL.** `POST /events/ticket` returns a `secrets.token_urlsafe(32)`
  value stored in Redis with a 30s TTL (`SSE_TICKET_KEY_PREFIX`, `SSE_TICKET_TTL_SECONDS`).
  `GET /events` consumes it atomically via `GETDEL` (single-use). The long-lived access
  token never appears in a URL, and a leaked SSE URL cannot be replayed into the API.
- Unauthenticated ticket issuance → 401; unknown/consumed ticket on the stream → 401 before
  any event data is sent; invalid UUID / inactive user → 401.

## 4. Authorization model

- **Private channel:** each user's notifications are published to
  `zapsters:sse:user:{user_id}` and fanned out only to that user's queues — User A can
  never receive User B's `progress.updated`.
- **Public channel:** `zapsters:sse:leaderboard:global` broadcasts to every connected
  client. The payload carries NO private data (no XP, no integrity flags, no org metadata,
  no user IDs) — only `{"type":"leaderboard.updated","scope":"global"}`. Clients refetch
  the public board API.
- **Frozen users:** the transport never carries freeze/integrity state at all; the frontend
  re-reads `/me/progress` and renders whatever the authoritative API returns. Tested.

## 5. Event types

Small explicit transport envelope (slice 07 §3): `connected`, `progress.updated`,
`leaderboard.updated`, and `update` (generic fallback for unknown/malformed payloads). Only
these client-facing types exist; internal database/Redis events are never exposed.

## 6. Event envelope

Every SSE frame is `event: <type>\ndata: {"type":"<type>"[, "scope":"global"]}\n\n`.
Frames carry **no authoritative values** — SSE only says "something changed". Malformed
JSON or unknown types map to a generic `update` frame rather than being dropped.

## 7. Heartbeat

- Interval: `SSE_HEARTBEAT_INTERVAL_SECONDS` (10s, config constant) read at stream time so
  tests can monkeypatch it.
- Implemented as a timeout race with the client queue (no per-connection timer task): on
  idle, the generator yields an SSE comment `: ping` — keeps proxies/aload balancers from
  closing the connection, never creates an application event, and never triggers a frontend
  refetch.
- Verified by the transport test: `connected` frame first, then `: ping` on idle.

## 8. Reconnect strategy

- Frontend: EventSource auto-reconnects, but the ticket is single-use, so the retry URL
  fails auth — the hook tears down and re-opens with a **fresh ticket** (fetch →
  `getSseTicketFromApi`), with exponential backoff capped at 15s. `attempt` resets on each
  successful open.
- Design assumption is **at-least-once**: duplicate deliveries are harmless because the
  handler only invalidates queries and the server stays authoritative.

## 9. Last-Event-ID behavior

- Not used. The transport carries no event IDs (by design, payloads carry no values), so
  Last-Event-ID replay has nothing to replay. Correctness comes from the invalidate-then-
  refetch pattern: any missed notification is repaired by the next refetch or the next
  reconnect's `connected` invalidation, and the authoritative APIs are always fresh on
  page load. Documented in the module docstring.

## 10. Ordering behavior

- No client-side arithmetic on event order. Every event triggers `invalidateQueries`, and
  the UI always renders the result of the authoritative fetch. Even if
  `progress.updated` and `leaderboard.updated` arrive out of order (they're independent
  keys), each invalidation refetches its own source of truth.

## 11. Query invalidation strategy

- `lib/real-time/sse.ts` — `invalidationsFor(type)` (pure, unit-tested):
  - `progress.updated` → `["progress-context"]`
  - `leaderboard.updated` → `["leaderboard"], ["my-standing"], ["public-leaderboard-preview"]`
  - `connected` / `update` → all of the above (cheap idempotent refetches on connect/unknown).
- The hook (`useRealtimeUpdates`) registers per-type `addEventListener` handlers — a real
  bug found during E2E: the backend frames are NAMED SSE events, and `onmessage` only fires
  for the default `message` type, so the original hook never processed any frame.
- Mounted once in `AppShell` via a null-rendering `RealtimeUpdates` component, active only
  when a user is signed in.

## 12. Leaderboard update behavior

- Worker → `publish_leaderboard_updated(redis)` after each accepted event updates the
  projection. Payload: `{"type":"leaderboard.updated","scope":"global"}` (no entries, no
  scores). Frontend: SSE → invalidate `leaderboard`/`my-standing`/preview → refetch
  `GET /leaderboards/global` → render the Redis-backed read model. The full board is never
  sent through SSE.

## 13. Personal progression update behavior

- Worker → `publish_progress_updated(redis, user_id)` after each accepted event. Payload:
  `{"type":"progress.updated"}` (no XP/rank/streak values). Frontend: SSE → invalidate
  `["progress-context"]` → refetch `GET /me/progress` → render authoritative state. The
  client never increments XP/rank/streak locally.

## 14. Demo-mode behavior

- `AUTH_MODE=demo` → `useRealtimeUpdates` is a no-op (no ticket fetch, no EventSource, no
  backend calls). Verified in browser: dashboard/rank/leaderboard render fully with
  **zero** SSE and **zero** backend API requests.

## 15. Backend-mode behavior

- Full real chain verified live: UI login → EventSource through the Next.js proxy →
  assessment finalized through the app's own API client → real worker drains the real Redis
  stream → Integrity Gate → ledger → `progress.updated` + `leaderboard.updated` frames →
  frontend invalidates → `GET /me/progress` refetches → dashboard MomentumPanel rank
  progress moves **0% → 60% with no manual refresh**. 12/12 browser checks passed.

## 16. Failure behavior

- SSE is an enhancement, never a dependency: ticket fetch failure or EventSource error is
  logged and retried with backoff; pages still render from the authoritative APIs (tested:
  the page renders normally even while the network is offline).
- Redis unavailable during subscribe → listener exits with the error logged; the HTTP stream
  still serves heartbeats and the rest of the API remains usable (module docstring + tests).
- A publish failure never fails the event pipeline (`publish_progress_updated` /
  `publish_leaderboard_updated` swallow+log).
- Verified in E2E: `context.setOffline(true)` → page stays rendered; reconnect → state
  recovers; the final authoritative `/me/progress` matches the rendered UI exactly.

## 17. Connection cleanup

- One `asyncio.Queue` per open stream; the stream generator's `finally` calls
  `sse_manager.detach` on client disconnect/cancellation. A per-redis refcount keeps the
  single pub/sub listener alive while ≥1 stream is open and cancels it when the last client
  leaves. `maxsize=64` queues with drop-oldest on overflow prevent a slow client from
  blocking fan-out. Tested: `test_disconnect_releases_queues` + refcount assertions.

## 18. Security results (all tested)

- [x] Unauthenticated private SSE rejected (`test_stream_rejects_unauthenticated_ticket`)
- [x] Ticket issuance requires authentication (`test_ticket_exchange_requires_authentication`)
- [x] Single-use ticket — replay rejected (`test_ticket_is_single_use`, `test_stream_rejects_replayed_ticket`)
- [x] Authenticated user only receives own private progression events (`test_private_progress_event_only_reaches_its_user`)
- [x] Public leaderboard events contain no private data (`test_public_leaderboard_broadcast_reaches_all_without_private_data` — no user_id/xp/org in payloads)
- [x] Tokens never appear in URLs (ticket is a separate short-lived secret, consumed once)
- [x] Tokens never appear in logs (no logging of ticket/authorization values)
- [x] Malformed events → generic `update`, never a crash (`test_stream_generator_malformed_payload_maps_to_generic_event`)
- [x] Internal Redis data never exposed (payloads are the explicit transport envelope only)
- [x] SSE cannot mutate authoritative state (handler only invalidates queries)
- [x] Frontend cannot use SSE to forge XP/rank (payloads carry no values)
- [x] Frozen-state privacy preserved (`test_frozen_user_privacy_preserved_in_stream`)

## 19. Performance findings

- **One Redis subscription total** regardless of client count (pattern `user:*` +
  `leaderboard:global` on a single pubsub connection) — no per-client subscription, no
  per-event connection churn.
- Heartbeat is a timeout race, not a timer task — nothing to leak per connection.
- Fan-out is in-memory queue puts; a full leaderboard is never sent through SSE (clients
  fetch the Redis-backed read model).
- Invalidation refetches are idempotent and scoped to the changed key; no polling anywhere.

## 20. Real infrastructure verification

- **Real PostgreSQL + real Redis + real worker + real SSE connection**, no mocks for the
  pipeline: `test_sse_acceptance.py` drives the actual `poll_gamification_events` worker on
  the real stream and asserts both notifications arrive on the real pub/sub channels with
  correct authorization. Live curl session against the running backend captured
  `connected` → `progress.updated` → `leaderboard.updated` frames on one real stream.

## 21. E2E results

- **BACKEND mode (live, Playwright): 12/12 PASS** — UI login → SSE channel opens → enroll +
  assessment finalized through the app's own proxied client → worker processes → dashboard
  rank-progress updates **0% → 60% without manual refresh** → offline: page stays rendered →
  reconnect: state recovers → authoritative `/me/progress` matches rendered UI (60% = 60%)
  → no unexpected console errors.
- **DEMO mode (Playwright): 7/7 PASS** — demo login, dashboard renders, rank surfaces demo
  data, rank page, leaderboard page, **0 SSE requests**, **0 backend API requests**.
- Full test suites: backend 145/145, frontend 84/84.

## 22. Exact test results

| Suite | Result |
|---|---|
| Backend `pytest tests/` | **145 passed** (132 prior + 13 new: 12 SSE transport + 1 real-pipeline acceptance) |
| Backend ruff | All checks passed |
| Backend mypy (85 files) | Success, no issues |
| Alembic upgrade → downgrade → upgrade | Clean (no migration needed — no schema change) |
| pip-audit | No known vulnerabilities |
| import-linter lint | 1 contract kept, 0 broken |
| Frontend `pnpm lint` | Clean |
| Frontend `pnpm typecheck` | Clean |
| Frontend `pnpm test` | **84 passed** (77 prior + 7 new SSE invalidation tests) |
| Frontend `pnpm build` (demo mode) | Pass |
| Frontend `pnpm build` (backend mode) | Pass |
| Browser E2E backend mode | **12/12** |
| Browser E2E demo mode | **7/7** |

## 23. UI regression status

**UI REGRESSION: NONE.** The only frontend change is `components/layout/app-shell.tsx`
(one null-rendering `<RealtimeUpdates />` mount) plus the new `lib/real-time/sse.ts`
module. No component, page, color, typography, spacing, or layout changed.

## 24. Deferred work

- SSE for judge/lab/combo/streak surfaces (only progression + leaderboard are wired; the
  transport supports adding channels later).
- Last-Event-ID replay (documented above — not needed for the invalidate-then-refetch model).
- Connection sharing across multiple tabs (each tab opens its own stream; tested that one
  tab's disconnect doesn't affect the shared backend listener, but no cross-tab sharing).
- League/guild/badge/credential real-time updates (those features are future slices).

## 25. Architectural decisions (documentation silent or ambiguous)

1. **Ticket auth** — the docs say "SSE with auth" but not how. EventSource cannot set
   headers and the refresh cookie is auth-path-scoped, so the short-lived single-use Redis
   ticket is the smallest compliant mechanism; documented in the route docstring.
2. **Named SSE events** — the docs don't specify frame format; named events were chosen to
   give the client explicit type routing (and the frontend bug this caught is now covered
   by tests).
3. **No Last-Event-ID** — the envelope deliberately carries no event IDs (payloads carry no
   values), so replay-by-ID is meaningless; correctness rests on invalidate-then-refetch.
4. **Heartbeat interval 10s** — docs silent; 10s is the standard proxy-friendly choice and
   is a constant, not a behavior.
5. **Notification granularity** — only `progress.updated` and `leaderboard.updated` are
   emitted (the two surfaces this slice touches); the docs' combo/streak events are left to
   their feature slices.
