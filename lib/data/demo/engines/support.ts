/**
 * Local demo Support service (add-on surface — beyond build.md's F0–F7 plan).
 *
 * This module owns the ticket state and workflow directly. Its async
 * signatures keep loading behavior realistic. Workflow
 * rules live HERE (the mock server), never in components:
 *
 *  - Learner isolation: a learner can only read their own tickets (404 for
 *    anyone else's) — enforced by the demo service.
 *  - Internal notes: stripped from every learner read; only agents can
 *    post them (403 otherwise).
 *  - Status machine: TICKET_TRANSITIONS (contracts/support.ts), enforced
 *    with 409 invalid_transition. Auto-transitions on replies: an agent
 *    reply moves open → pending; a learner reply reopens resolved → open
 *    and pending → open. Replies on closed tickets are rejected (409).
 *  - Admin ops (status change, assignment) are role-gated (403 for
 *    learners) and appended to the append-only audit log — the same
 *    discipline as F7 admin writes.
 *
 * Mock hooks (deterministic, demoable):
 *  - userId "missing-user"  → empty list (empty state)
 *  - userId "boom"          → 503 (error state)
 *  - ticket id "tkt-missing" → 404 (detail error state)
 *  - create with subject containing "boom" → 503 (create error state)
 */

import type {
  CreateTicketInput,
  SupportTicket,
  TicketStatus,
} from "@/lib/contracts/support";
import { TICKET_TRANSITIONS } from "@/lib/contracts/support";
import type { SessionUser } from "@/lib/contracts/session";
import {
  addMessageToTicket,
  mockTickets,
  setTicketAssignee,
  setTicketStatus,
} from "@/lib/mocks/support";
import { MOCK_ADMIN_USERS, logAudit } from "@/lib/mocks/admin";
import { MockDataError } from "@/lib/data/demo/errors";
import { delay, jitter } from "@/lib/data/demo/helpers";

const MISSING = "missing-user";
const BOOM = "boom";

let nextTicketNumber = 1007;

/** Defensive copy — callers never hold a live reference into the store. */
function snapshot(ticket: SupportTicket): SupportTicket {
  return structuredClone(ticket);
}

/** Strip internal notes for learner reads (the server, not the UI, decides). */
function stripInternalNotes(ticket: SupportTicket): SupportTicket {
  const copy = snapshot(ticket);
  copy.messages = copy.messages.filter((message) => !message.internal_note);
  return copy;
}

function byId(ticketId: string): SupportTicket {
  const ticket = mockTickets.get(ticketId);
  if (!ticket) {
    throw new MockDataError(
      "ticket_not_found",
      `Ticket ${ticketId} was not found.`,
      404,
    );
  }
  return ticket;
}

function assertAdmin(actor: SessionUser): void {
  if (actor.role !== "admin") {
    throw new MockDataError(
      "forbidden",
      "Only support agents can perform this action.",
      403,
    );
  }
}

function assertTransition(
  ticket: SupportTicket,
  target: TicketStatus,
): void {
  if (target === ticket.status) {
    throw new MockDataError(
      "invalid_transition",
      `Ticket is already ${target}.`,
      409,
    );
  }
  if (!(TICKET_TRANSITIONS[ticket.status] ?? []).includes(target)) {
    throw new MockDataError(
      "invalid_transition",
      `Cannot move a ${ticket.status} ticket to ${target}.`,
      409,
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Learner reads                                                      */
/* ------------------------------------------------------------------ */

export async function listMyTickets(
  userId: string,
): Promise<SupportTicket[]> {
  await delay(jitter(220));
  if (userId === BOOM) {
    throw new MockDataError(
      "support_down",
      "Support demo data is unavailable (simulated).",
      503,
    );
  }
  const tickets = [...mockTickets.values()]
    .filter((t) => t.created_by === userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(stripInternalNotes);
  return userId === MISSING ? [] : tickets;
}

/**
 * Agent-only queue read — every ticket, newest-updated first, internal
 * notes included (agents see everything). Role-gated by the demo service.
 */
export async function listAdminTickets(
  actor: SessionUser,
): Promise<SupportTicket[]> {
  await delay(jitter(220));
  assertAdmin(actor);
  return [...mockTickets.values()]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(snapshot);
}

/**
 * Agent-only — the assignee picker options (mock admin directory). The
 * picker never hardcodes ids; the mock server validates them on assign.
 */
export async function listSupportAgents(
  actor: SessionUser,
): Promise<{ id: string; display_name: string }[]> {
  await delay(jitter(160));
  assertAdmin(actor);
  return MOCK_ADMIN_USERS.filter((u) => u.role === "admin").map((u) => ({
    id: u.id,
    display_name: u.display_name,
  }));
}

/**
 * One ticket. Learners only ever see their own (404 otherwise) and never
 * see internal notes; agents see everything.
 */
export async function getTicket(
  ticketId: string,
  viewer: SessionUser,
): Promise<SupportTicket> {
  await delay(jitter(200));
  const ticket = byId(ticketId);
  const isAgent = viewer.role === "admin";
  if (!isAgent && ticket.created_by !== viewer.id) {
    throw new MockDataError(
      "ticket_not_found",
      `Ticket ${ticketId} was not found.`,
      404,
    );
  }
  return isAgent ? snapshot(ticket) : stripInternalNotes(ticket);
}

/* ------------------------------------------------------------------ */
/*  Writes                                                             */
/* ------------------------------------------------------------------ */

export async function createTicket(
  input: CreateTicketInput,
  user: SessionUser,
): Promise<SupportTicket> {
  await delay(jitter(420));
  // Server-side validation — the form enforces the same rules, but the mock
  // server stays honest for any other caller (mirrors the real support API).
  if (input.subject.trim().length < 3 || input.body.trim().length < 10) {
    throw new MockDataError(
      "validation_error",
      "Subject (min 3 chars) and description (min 10 chars) are required.",
      400,
    );
  }
  if (input.subject.toLowerCase().includes(BOOM)) {
    throw new MockDataError(
      "support_down",
      "Support demo data is unavailable (simulated).",
      503,
    );
  }
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: `tkt-${nextTicketNumber++}`,
    subject: input.subject,
    category: input.category,
    priority: input.priority,
    status: "open",
    created_by: user.id,
    created_by_name: user.display_name,
    assignee_id: null,
    assignee_name: null,
    messages: [
      {
        id: `tmsg-${now}`,
        author_id: user.id,
        author_name: user.display_name,
        author_role: "learner",
        body: input.body,
        internal_note: false,
        created_at: now,
      },
    ],
    created_at: now,
    updated_at: now,
  };
  mockTickets.set(ticket.id, ticket);
  return snapshot(ticket);
}

export interface ReplyInput {
  body: string;
  /** Agents only — learners posting internal notes is a 403. */
  internal_note?: boolean;
}

export async function replyToTicket(
  ticketId: string,
  input: ReplyInput,
  actor: SessionUser,
): Promise<SupportTicket> {
  await delay(jitter(360));
  const ticket = byId(ticketId);
  const isAgent = actor.role === "admin";

  // Learner isolation — mirrors getTicket: a learner can only reply to
  // their own tickets (404 otherwise, so existence isn't leaked).
  if (!isAgent && ticket.created_by !== actor.id) {
    throw new MockDataError(
      "ticket_not_found",
      `Ticket ${ticketId} was not found.`,
      404,
    );
  }

  if (input.internal_note && !isAgent) {
    throw new MockDataError(
      "forbidden",
      "Only support agents can post internal notes.",
      403,
    );
  }

  // Internal notes never touch the state machine: they're agent-side
  // annotations the learner never sees, so they neither reopen nor advance
  // a ticket — and they're allowed even on closed tickets. Public replies
  // keep the full workflow (closed → 409, auto-transitions below).
  if (input.internal_note) {
    addMessageToTicket(ticketId, {
      author_id: actor.id,
      author_name: actor.display_name,
      author_role: "agent",
      body: input.body,
      internal_note: true,
    });
    return snapshot(byId(ticketId));
  }

  if (ticket.status === "closed") {
    throw new MockDataError(
      "ticket_closed",
      "This ticket is closed. Reopen it before replying.",
      409,
    );
  }

  // Auto-transitions on public reply (the state machine's edges).
  if (isAgent && ticket.status === "open") {
    setTicketStatus(ticketId, "pending");
  } else if (!isAgent && ticket.status !== "open") {
    // Learner reply: pending → open, resolved → open (reopen).
    setTicketStatus(ticketId, "open");
  }

  addMessageToTicket(ticketId, {
    author_id: actor.id,
    author_name: actor.display_name,
    author_role: isAgent ? "agent" : "learner",
    body: input.body,
    internal_note: input.internal_note ?? false,
  });

  return snapshot(byId(ticketId));
}

/** Agent-only. Enforced by the demo service (403 for learners) + audit-logged. */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  actor: SessionUser,
): Promise<SupportTicket> {
  await delay(jitter(280));
  assertAdmin(actor);
  const ticket = byId(ticketId);
  assertTransition(ticket, status);
  setTicketStatus(ticketId, status);
  logAudit({
    actor_id: actor.id,
    actor_name: actor.display_name,
    action: "support.ticket.status_changed",
    entity: "ticket",
    entity_id: ticketId,
    detail: `Moved ticket ${ticketId} ('${ticket.subject}') to ${status}.`,
  });
  return snapshot(byId(ticketId));
}

/** Agent-only. Assigns (or unassigns) an agent to the ticket. */
export async function assignTicket(
  ticketId: string,
  agentId: string | null,
  actor: SessionUser,
): Promise<SupportTicket> {
  await delay(jitter(280));
  assertAdmin(actor);
  const ticket = byId(ticketId);
  if (agentId !== null) {
    const agent = MOCK_ADMIN_USERS.find(
      (u) => u.id === agentId && u.role === "admin",
    );
    if (!agent) {
      throw new MockDataError(
        "agent_not_found",
        "No support agent with this id.",
        404,
      );
    }
    setTicketAssignee(ticketId, agent.id, agent.display_name);
    logAudit({
      actor_id: actor.id,
      actor_name: actor.display_name,
      action: "support.ticket.assigned",
      entity: "ticket",
      entity_id: ticketId,
      detail: `Assigned ticket ${ticketId} ('${ticket.subject}') to ${agent.display_name}.`,
    });
  } else {
    setTicketAssignee(ticketId, null, null);
    logAudit({
      actor_id: actor.id,
      actor_name: actor.display_name,
      action: "support.ticket.assigned",
      entity: "ticket",
      entity_id: ticketId,
      detail: `Unassigned ticket ${ticketId} ('${ticket.subject}').`,
    });
  }
  return snapshot(byId(ticketId));
}
