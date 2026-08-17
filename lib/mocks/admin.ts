import type { SessionUser } from "@/lib/contracts/session";
import {
  MOCK_ADMIN,
  MOCK_LEARNER,
  MOCK_REVIEWERS,
} from "@/lib/mocks/users";
import { auditLedgerLinkFor } from "@/lib/mocks/gamification";
import type {
  BadgeStatus,
  CredentialReview,
  CredentialReviewDetail,
  CredentialStatusHistory,
} from "@/lib/contracts/gamification";

/**
 * Admin/CMS fixtures (build.md F7).
 *
 * Two stores:
 *  - a small user directory the admin Users screen manages (role toggles),
 *    seeded with the platform's mock identities.
 *  - an APPEND-ONLY audit log — the moderation/audit view renders this and
 *    nothing ever rewrites an entry (mirrors the real CMS's append-only
 *    audit tables).
 */

export const MOCK_ADMIN_USERS: SessionUser[] = [
  MOCK_LEARNER,
  MOCK_ADMIN,
  ...MOCK_REVIEWERS.filter((reviewer) =>
    reviewer.id !== MOCK_ADMIN.id && reviewer.id !== MOCK_LEARNER.id,
  ),
  {
    id: "9f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81",
    display_name: "Ravi Kapoor",
    email: "ravi@zapsters.dev",
    avatar_url: null,
    role: "learner",
    org_id: null,
  },
  {
    id: "5f1a9e3b-2c4d-4f6b-8c0d-7e2a9f3b1c81",
    display_name: "Sana Iyer",
    email: "sana@zapsters.dev",
    avatar_url: null,
    role: "learner",
    org_id: null,
  },
  {
    id: "0a2f9e3b-5c6d-4a7b-9e0f-1b3c5d7e9f01",
    display_name: "Kenji Tanaka",
    email: "kenji@zapsters.dev",
    avatar_url: null,
    role: "learner",
    org_id: null,
  },
  {
    id: "1b3f9e4c-6d7e-4b8c-af10-2c4d6e8f0a12",
    display_name: "Sofia Rossi",
    email: "sofia@zapsters.dev",
    avatar_url: null,
    role: "learner",
    org_id: null,
  },
];

/* ------------------------------------------------------------------ */
/*  B3 — credential review queue fixtures (§7.4)                       */
/* ------------------------------------------------------------------ */

const reviewHistory = (
  steps: [BadgeStatus, BadgeStatus, string][],
): CredentialStatusHistory[] =>
  steps.map(([previous_status, new_status, reason], index) => ({
    id: `hist-${index + 1}`,
    previous_status,
    new_status,
    reviewer_id: MOCK_ADMIN.id,
    org_id: null,
    reason,
    created_at: new Date(Date.now() - (index + 1) * 86_400_000).toISOString(),
  }));

/** The demo review queue — mirrors the admin API read model (B3). */
export const MOCK_CREDENTIAL_REVIEWS: CredentialReview[] = [
  {
    id: "rev-2c9e-0000-0000-000000000001",
    public_id: "b-flagged-2c9e",
    user_id: MOCK_LEARNER.id,
    badge_id: "bdg-bash-02",
    credential_type: "badge",
    status: "flagged",
    issuer: "Zapsters",
    source_event_id: "00000000-0000-4000-8000-000000000011",
    issued_at: new Date(Date.now() - 12 * 86_400_000).toISOString(),
  },
  {
    id: "rev-8d11-0000-0000-000000000002",
    public_id: "b-revoked-8d11",
    user_id: MOCK_LEARNER.id,
    badge_id: "bdg-rev-03",
    credential_type: "badge",
    status: "revoked",
    issuer: "Zapsters",
    source_event_id: "00000000-0000-4000-8000-000000000012",
    issued_at: new Date(Date.now() - 70 * 86_400_000).toISOString(),
  },
];

const flaggedReview = MOCK_CREDENTIAL_REVIEWS[0] as CredentialReview;
const revokedReview = MOCK_CREDENTIAL_REVIEWS[1] as CredentialReview;

/** Append-only decision history per demo review (matches the real table). */
export const MOCK_CREDENTIAL_REVIEW_DETAILS: Record<string, CredentialReviewDetail> = {
  [flaggedReview.id]: {
    ...flaggedReview,
    history: reviewHistory([
      ["verified", "flagged", "Flagged by integrity gate (suspicious answer timing)."],
    ]),
  },
  [revokedReview.id]: {
    ...revokedReview,
    history: reviewHistory([
      ["flagged", "verified", "Cleared after review — timing anomaly explained."],
      ["verified", "revoked", "Reversed: underlying ledger entries corrected by admin."],
    ]),
  },
};

/**
 * Apply a review decision in the demo: the credential's status updates and the decision
 * is APPENDED to its immutable history (never rewritten, never deleted).
 */
export function applyDemoReviewTransition(
  credentialId: string,
  toStatus: BadgeStatus,
  reason: string | null,
): CredentialReviewDetail {
  const existing = MOCK_CREDENTIAL_REVIEW_DETAILS[credentialId];
  if (!existing) {
    throw new Error("review_not_found");
  }
  const updated: CredentialReviewDetail = {
    ...existing,
    status: toStatus,
    history: [
      ...existing.history,
      {
        id: `hist-${existing.history.length + 1}`,
        previous_status: existing.status,
        new_status: toStatus,
        reviewer_id: MOCK_ADMIN.id,
        org_id: null,
        reason,
        created_at: new Date().toISOString(),
      },
    ],
  };
  MOCK_CREDENTIAL_REVIEW_DETAILS[credentialId] = updated;
  const queueIndex = MOCK_CREDENTIAL_REVIEWS.findIndex((r) => r.id === credentialId);
  if (queueIndex >= 0) {
    const { history: _history, ...reviewOnly } = updated;
    MOCK_CREDENTIAL_REVIEWS[queueIndex] = reviewOnly;
  }
  return updated;
}

export interface AuditEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  /** e.g. "course.created", "course.published", "user.role_changed" */
  action: string;
  /** e.g. "course" | "order" | "user" | "xp" */
  entity: string;
  entity_id: string | null;
  detail: string;
  created_at: string;
  /**
   * When this log row resulted in an XP/economy balance change (grant,
   * reversal, credential revocation), the id of the linked ledger entry.
   * Absent for rows that never touched the ledger (Task 3 wiring).
   */
  ledger_entry_id?: string | null;
}

/**
 * Seed-only marker: which demo ledger entry a fixture row links to. The
 * ledger's entry ids are random per mock build, so the link is resolved at
 * read time against the real chained ledger — never hardcoded (keeps the
 * audit fixtures pointing at actual entries).
 */
type LedgerLinkMarker = "grant" | "reversal";
type AuditSeed = AuditEntry & { ledger_link?: LedgerLinkMarker };

/**
 * Resolve a seeded audit row's ledger link to a real entry id (or null).
 * Returns null for rows that never touched the ledger.
 */
export async function ledgerEntryIdForAuditSeed(
  seed: AuditEntry,
): Promise<string | null> {
  const marker = (seed as AuditSeed).ledger_link;
  if (!marker) return null;
  return (await auditLedgerLinkFor(marker)).id;
}

let auditCounter = 1;

function seededAudit(
  id: string,
  action: string,
  entity: string,
  entityId: string | null,
  detail: string,
  daysAgo: number,
): AuditEntry {
  return {
    id,
    actor_id: MOCK_ADMIN.id,
    actor_name: MOCK_ADMIN.display_name,
    action,
    entity,
    entity_id: entityId,
    detail,
    created_at: new Date(Date.now() - daysAgo * 86400_000).toISOString(),
  };
}

/**
 * Newest-first. Rows audit-1..4 never touched the ledger (empty link state);
 * audit-5/audit-6 carry ledger_link markers that resolve to real entries in
 * the chained demo ledger at read time (normal grant + reversal/revocation).
 */
export const auditEntries: AuditSeed[] = [
  seededAudit("audit-1", "course.published", "course", "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", "Published 'Offensive Web App Testing' (review passed).", 2),
  seededAudit("audit-2", "course.updated", "course", "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e", "Autosaved draft changes to 'Zero Trust Architecture'.", 1),
  seededAudit("audit-3", "user.role_changed", "user", "5f1a9e3b-2c4d-4f6b-8c0d-7e2a9f3b1c81", "Granted admin role to Sana Iyer.", 4),
  seededAudit("audit-4", "course.updated", "course", "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", "Updated pricing for 'React & TypeScript Deep Dive'.", 6),
  {
    ...seededAudit(
      "audit-5",
      "xp.grant",
      "xp",
      "demo-user-001",
      "Awarded 400 XP (COURSE_COMPLETE) to Raghunandhan.",
      3,
    ),
    ledger_link: "grant",
  },
  {
    ...seededAudit(
      "audit-6",
      "xp.reversal",
      "xp",
      "demo-user-001",
      "Reversed a MAIN_ASSESSMENT award (-220 XP) after integrity review — First Blood badge revoked.",
      5,
    ),
    ledger_link: "reversal",
  },
];

/**
 * Append-only write — the one place audit entries are created. Entries are
 * never mutated or deleted by any admin operation.
 */
export function logAudit(
  entry: Omit<AuditEntry, "id" | "created_at">,
): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${auditCounter++}`,
    created_at: new Date().toISOString(),
  };
  auditEntries.unshift(full);
  return full;
}
