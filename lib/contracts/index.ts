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
 */

export * from "./session";
export * from "./content";
export * from "./judge";
export * from "./lab";
export * from "./assessment";
export * from "./gamification";
