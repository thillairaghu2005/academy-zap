# F8 Public Integration Contract

This is the frontend-facing contract seed for B9. It does not implement delivery
or authentication in the browser.

## Events

Outbound events use the versioned `BaseEvent` envelope in
`lib/contracts/events.ts` and are intended for signed webhook delivery:

- `enrollment`
- `completion`
- `credential.issued`

Every event carries `event_id`, `schema_version`, `user_id`, optional `org_id`,
`occurred_at`, `idempotency_key`, and `session_fingerprint`. Consumers must
deduplicate on `idempotency_key`.

## Backend Responsibilities

The B9 service must add:

- Public read API authentication and organization scoping.
- HMAC or asymmetric webhook signatures over the raw payload.
- Retry with backoff, delivery status, and a dead-letter view.
- Event replay without duplicate side effects.
- No browser-side webhook secrets or direct provider callbacks.

The frontend will consume the documented read API through `lib/api/*` after the
Platform Core gateway and event bus are available.

## Offline Scope

The first frontend slice caches the current course contract and exposes an
offline syllabus/article-metadata view. Video segment caching is intentionally
not enabled yet: signed HLS media needs a backend/CDN policy for expiry,
entitlement, storage limits, and encrypted media behavior before it can be
cached safely.
