# lib/contracts — the frozen frontend contract layer

Every schema the frontend touches is transcribed here, field-for-field, from
the source docs:

| Contract | Source | Landed in |
|---|---|---|
| `SessionUser` / `SessionState` (provisional) | docs don't lock a User schema — Platform Core owns auth | F0 |
| `Course`, `SignedManifest`, `Enrollment`, `MeilisearchCatalogResponse`, `CatalogQuery` | platform §4.1, §4.4 | F1 |
| `Problem`, `CodeSubmission`, `SubmissionAccepted`, `JudgeResult` | platform §4.1, §4.3 | F2 |
| `Lab`, `LabObjective`, `LabSession`, `ObjectiveResult`, `LabSessionCompletedEvent` | platform §4.1, §4.3 | F3 |
| `Assessment`, `AssessmentQuestion`, `AssessmentSubmission`, `GradeResult`, `AssessmentAttempt`, `AssessmentSubmittedEvent`, `ComboState`, `TelemetryEvent` | platform §4.1, §2.6 | F4 |
| `ProgressContext`, `RankState`, `StreakState`, `LeagueStanding`, `GuildRollup`, `LedgerEntry`, events | gamification §5.3, §4 | F5 |
| `Cart`, `CheckoutSession`, `PaymentEvent` | platform §4.1 | F6 |

Rules:

1. Never invent a shape that isn't in the docs. When a doc defers something
   ("open, to be decided"), encode the reasonable choice and log it in the
   assumption register in `lib/contracts/index.ts`.
2. Enums/literals (`verdict`, `integrity_status`, `league_tier`, credential
   `status`) are transcribed verbatim and used verbatim in the UI.
3. When the real backend lands, diff these files against the Pydantic models
   (build.md §4) before wiring `lib/api` to real endpoints.
