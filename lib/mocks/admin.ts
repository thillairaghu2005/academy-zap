import type { SessionUser } from "@/lib/contracts/session";
import {
  MOCK_ADMIN,
  MOCK_LEARNER,
  MOCK_REVIEWERS,
} from "@/lib/mocks/users";
import { auditLedgerLinkFor } from "@/lib/mocks/gamification";

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
