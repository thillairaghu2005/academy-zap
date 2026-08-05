/**
 * Support ticket contracts.
 *
 * The source docs do NOT lock a support schema — the only mentions are
 * prose (gamification doc: \"a rank... must survive a support ticket\"). This
 * surface is an ADD-ON beyond build.md's F0–F7 plan, so the shapes below
 * are reasonable decisions (Zendesk-shaped: subject/category/priority/
 * status workflow + message thread), logged in the assumption register.
 * They will be reconciled with the real support platform contract during
 * integration (build.md §4).
 */

export type TicketCategory =
  | "billing"
  | "courses"
  | "judge"
  | "labs"
  | "assessments"
  | "account"
  | "other";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketStatus = "open" | "pending" | "resolved" | "closed";

/**
 * Single source of truth for the category/priority values — forms, filters
 * and zod schemas derive from these instead of re-listing the literals.
 */
export const TICKET_CATEGORIES = [
  "billing",
  "courses",
  "judge",
  "labs",
  "assessments",
  "account",
  "other",
] as const satisfies readonly TicketCategory[];

export const TICKET_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const satisfies readonly TicketPriority[];

export type TicketAuthorRole = "learner" | "agent";

export interface TicketMessage {
  id: string;
  author_id: string;
  author_name: string;
  author_role: TicketAuthorRole;
  body: string;
  /**
   * Visible to agents only. Stripped from learner reads server-side (the
   * mock API never leaks an internal note to its author's counterpart).
   */
  internal_note: boolean;
  created_at: string;
}

export interface SupportTicket {
  /** Human-friendly id, e.g. "tkt-1001". */
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_by: string;
  created_by_name: string;
  /** Admin agent currently owning the ticket; null = unassigned. */
  assignee_id: string | null;
  assignee_name: string | null;
  messages: TicketMessage[];
  created_at: string;
  updated_at: string;
}

/** Learner-facing create payload (the form's contract). */
export interface CreateTicketInput {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  body: string;
}

/**
 * The status workflow the mock enforces server-side (mirrors the real
 * support platform's state machine):
 *
 *   open ──(agent replies)──▶ pending ──(learner replies)──▶ open
 *    │                            │
 *    ├─▶ resolved ◀───────────────┤        resolved/closed ──(reopen)──▶ open
 *    └─▶ closed  ◀────────────────┘
 *
 * Any transition not in the table → 409 invalid_transition.
 */
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["pending", "resolved", "closed"],
  pending: ["open", "resolved", "closed"],
  resolved: ["open", "closed"],
  closed: ["open"],
};
