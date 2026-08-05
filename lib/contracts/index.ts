/**
 * Zapsters — contract layer
 * ==========================
 *
 * Contract-first discipline (build.md §0): every UI surface consumes the
 * exact contract shapes locked in the source docs
 * (`ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md` §4.1/§4.3 and
 * `ZAPSTERS_GAMIFICATION_ENGINE.md` §5.3). These files are the TypeScript
 * mirror of those Pydantic models, transcribed field-for-field.
 *
 * A mock is just an object satisfying these contracts with fixture data.
 * When the real backend lands, the swap is a `lib/api/*` body replacement —
 * component code never changes.
 *
 * /!\ ASSUMPTION REGISTER (provisional decisions, per working style):
 *   - session.ts : the docs do not lock a User/Profile schema (Platform Core
 *     owns auth). This minimal shell contract is provisional and will be
 *     reconciled with the real Platform Core schema during integration.
 *     Product-audit Fix 4 moved the mock auth rules server-side: a signed
 *     HttpOnly session cookie (HMAC-SHA256, 7-day expiry, SameSite=Lax)
 *     issued by app/api/auth/session and verified by proxy.ts, which
 *     redirects anonymous visitors to /login?next=<path>. The client auth
 *     module (lib/api/auth.ts) is a thin fetch wrapper with unchanged
 *     signatures. This is the boundary SHAPE, not real security: SESSION_SECRET
 *     falls back to a mock constant when unset (a real deployment MUST set
 *     it) and the user directory is fixture data. DEMO_MODE
 *     (NEXT_PUBLIC_DEMO_MODE) disables the middleware gate and auto-issues
 *     the demo learner session; the signed-out marker cookie makes logout
 *     stick even in demo mode.
 *   - content.ts : the docs lock the ContentProvider Protocol method shapes
 *     (get_course, get_playback_manifest) but not full Course/SignedManifest/
 *     Enrollment field lists (those come from the `courses`/`lessons`/
 *     `enrollments` table references). Field choices are reasonable decisions;
 *     the Meilisearch response shape mirrors the real Meilisearch JSON API so
 *     the later swap to the self-hosted instance is field-identical.
 *   - F1 provisional : paid courses enroll directly through the mock `enroll`
 *     (no checkout gate) — F6 (Commerce) owns entitlement gating; the F1 CTA
 *     just demonstrates the enroll path. Captions use a public WebVTT sample;
 *     article lessons render a placeholder body until Content ships authored
 *     markdown.
 *   - judge.ts : the docs lock the JudgeEngine Protocol signatures + the
 *     JudgeSubmissionGradedEvent fields verbatim; the full Problem /
 *     CodeSubmission field lists (the `problems`/`submissions`/`test_cases`
 *     tables are referenced, not schematized) are reasonable decisions.
 *     JudgeResult additionally carries raw stdout/stderr per the "never
 *     discard raw" law (§5.6). Verdict literals are verbatim from §4.3.
 *   - lab.ts : the docs lock the LabEngine Protocol signatures (§4.1),
 *     LabSessionCompletedEvent (§4.3), and the session lifecycle narrative
 *     (§6) but not full Lab/LabObjective/LabSession field lists — those are
 *     reasonable decisions mirroring the TryHackMe-shaped surface. Session
 *     status literals (provisioning/running/completed/timed_out/terminated)
 *     are derived from §6's flow, not a locked enum. `terminal_url` is
 *     informational in mock mode (no real network handshake).
 *   - assessment.ts : the docs lock the AssessmentEngine Protocol (§4.1),
 *     deterministic never-AI grading + judge delegation for code questions
 *     (§2.6), the `assessment.submitted` event literal, and the anti-cheat
 *     telemetry sources (tab-visibility, paste, timing). Full Assessment /
 *     Question / Attempt field lists are reasonable decisions (the tables
 *     are referenced, not schematized). ComboState is a reasonable reading
 *     of the gamification doc's combo counter + multiplier language; the
 *     client only ever previews it.
 *   - commerce.ts : the docs lock the PaymentProvider Protocol (§4.1:
 *     create_checkout -> CheckoutSession, verify_webhook -> PaymentEvent), the
 *     `payment.succeeded` event literal, the orders/subscriptions/invoices
 *     tables (§4.2), and the HARD rule that payment UI is Razorpay/Stripe
 *     hosted-checkout embeds only (§2.2/§2.3 — never a custom card-number
 *     input). Cart / CheckoutSession / PaymentEvent / Entitlement / Order /
 *     Subscription field lists are NOT schematized in the docs — reasonable
 *     decisions, with CheckoutSession deliberately provider-shaped (id,
 *     status, hosted embed URL) so the sandbox-embed swap is field-identical.
 *     `payment.failed` / `payment.refunded` are reasonable additions to the
 *     named `payment.succeeded` literal for the all-states requirement.
 *     Webhook delivery is idempotent by idempotency_key (§8.2/§8.3). B2B
 *     seat actions (invite/suspend/reassign) are left open by the docs — the
 *     billing surface renders the read model only.
 *   - content.ts : ContentStatus gained `in_review` (F7) as a provisional
 *     intermediate state for the submit-for-review / publish workflow; §4.4
 *     names draft vs published. Course.submitted_by / reviewed_by (F7 Task 2)
 *     drive the two-person rule (publisher must differ from the submitter) —
 *     snake_case per the codebase convention, where the task brief named them
 *     `reviewedBy?`. The review workflow APIs (saveDraft / submitForReview /
 *     publishCourse / unpublishCourse / getCourseReviewDiff) live in
 *     lib/api/admin.ts, NOT lib/api/content.ts: content.ts is the public
 *     read surface (get_course / manifest / catalog), and F7 established
 *     admin.ts as the authoring surface — splitting authoring writes across
 *     the two would break that separation. Draft autosave (saveDraft) is
 *     silent by design — no audit row per keystroke-save; the explicit
 *     "Save changes" (updateCourse) logs to the audit trail.
 *   - admin (F7 Task 2/3 follow-up) : the published-version snapshot map in
 *     lib/mocks/courses.ts stands in for the CMS's versioned `courses`
 *     rows, so the review diff has a "last published version" to compare
 *     against. The diff is computed server-side (mock); the client renders
 *     it. Audit rows that changed XP/economy state carry an optional
 *     `ledger_entry_id` (resolved at read time against the real chained
 *     demo ledger — ids are random per mock build, so fixture links point
 *     at actual entries, never hardcoded ids). LedgerEntryDetail's
 *     balance_before/balance_after is a read projection (the §5.3 schema
 *     has no balance fields — the hash chain is the integrity anchor). The
 *     reconciliation fixture for Ravi Kapoor uses a cached-balance
 *     constant standing in for his ProgressContext. The admin walkthrough
 *     "seen" flag is persisted in localStorage (stand-in for the future
 *     user_prefs table; no real auth exists per build.md §3).
 *   - admin (F7) : build.md F7 scopes the admin surface to COURSE authoring
 *     + the two-person review flow + audit. Orders / Users / Labs / Problems
 *     are manage-style read lists here, not authoring CRUD. The role gate is
 *     FRONTEND-ONLY (real RBAC lives in the backend); admin ops mutate the
 *     fixture stores (upsert/deleteCourse) and write an append-only audit
 *     log. CatalogProduct.stock is mock inventory for Buy Now validation.
 *     The demo user's cart persists to localStorage (mock stand-in for the
 *     Commerce backend's cart persistence). CHECKOUT_DEMO_503 (lib/config.ts)
 *     is a demo flag that short-circuits checkout with a simulated 503.
 *     Guest checkout does NOT exist: Buy Now / Add to Cart require sign-in.
 *   - gamification.ts : the §5.3 Pydantic schemas (LedgerEntry, StreakState,
 *     RankState, LeagueStanding, GuildRollup, ProgressContext) are
 *     transcribed verbatim. The rank-ladder XP bands are ILLUSTRATIVE in the
 *     doc (§5.2: "real thresholds live in rules.py") so RANK_LADDER is a
 *     mock constant. The weighted rank function (0.6·mastery + 0.4·completion)
 *     and the momentum curve (+0.05/day, cap 2.0) are provisional weights
 *     that will come from rules.py. Projection shapes (LeaderboardEntry,
 *     GuildStanding, Badge, SkillTreeNode, SeasonPassState, ShareCardData)
 *     are named in §5.5/§6 but not schematized — reasonable decisions. The
 *     mock ledger's hash chain is REAL (SHA-256 per §7.2) so rank/XP always
 *     derive from a verifiable append-only source, mirroring the backend law.
 *   - support.ts : ADD-ON surface beyond build.md's F0–F7 plan. The source
 *     docs never lock a support schema (only prose: "a rank... must survive
 *     a support ticket"), so the Zendesk-shaped ticket/message shapes and
 *     the status state machine (open → pending ↔ open, → resolved/closed,
 *     reopen) are reasonable decisions to reconcile with the real support
 *     platform during integration (build.md §4). Learner isolation (404 for
 *     someone else's ticket) and internal-note stripping are enforced in
 *     the mock API, mirroring the server-owned-data rule.
 */

export * from "./session";
export * from "./content";
export * from "./judge";
export * from "./lab";
export * from "./assessment";
export * from "./gamification";
export * from "./commerce";
export * from "./support";
