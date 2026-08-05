import type { SessionUser } from "@/lib/contracts/session";
import { MOCK_ADMIN, MOCK_LEARNER } from "@/lib/mocks/users";

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
  /** e.g. "course" | "order" | "user" */
  entity: string;
  entity_id: string | null;
  detail: string;
  created_at: string;
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

/** Newest-first. */
export const auditEntries: AuditEntry[] = [
  seededAudit("audit-1", "course.published", "course", "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", "Published 'Offensive Web App Testing' (review passed).", 2),
  seededAudit("audit-2", "course.submitted_for_review", "course", "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e", "'Zero Trust Architecture' submitted for review by author.", 1),
  seededAudit("audit-3", "user.role_changed", "user", "5f1a9e3b-2c4d-4f6b-8c0d-7e2a9f3b1c81", "Granted admin role to Sana Iyer.", 4),
  seededAudit("audit-4", "course.updated", "course", "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", "Updated pricing for 'React & TypeScript Deep Dive'.", 6),
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
