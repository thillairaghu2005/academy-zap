import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mockTickets } from "@/lib/mocks/support";
import type { SupportTicket } from "@/lib/contracts/support";
import { MOCK_ADMIN, MOCK_LEARNER, MOCK_REVIEWERS } from "@/lib/mocks/users";
import {
  assignTicket,
  createTicket,
  getTicket,
  listAdminTickets,
  listMyTickets,
  replyToTicket,
  updateTicketStatus,
} from "./support";
import type { CreateTicketInput } from "@/lib/contracts/support";

/**
 * Support state-machine tests (audit Track A2). Covers the server-side
 * workflow rules in lib/api/support.ts: learner isolation, internal-note
 * stripping, the open → pending ↔ open → resolved/closed machine with
 * 409s, and role-gated admin ops.
 */

const TICKET: CreateTicketInput = {
  subject: "Lab flag not detected",
  category: "labs",
  priority: "medium",
  body: "I found the flag but the objective stayed unchecked.",
};

const OTHER_TICKET_ID = "tkt-1004"; // owned by Ravi Kapoor, not MOCK_LEARNER
const INTERNAL_NOTE_TICKET_ID = "tkt-1005"; // has an agent internal note

/**
 * The support store is module-level mutable state — snapshot it before each
 * test and restore afterwards so tests stay hermetic and order-independent.
 */
let storeSnapshot: Map<string, SupportTicket>;
beforeEach(() => {
  storeSnapshot = structuredClone(mockTickets);
});
afterEach(() => {
  mockTickets.clear();
  for (const [id, ticket] of storeSnapshot) mockTickets.set(id, ticket);
});

describe("support tickets — create + read", () => {
  it("creates an open ticket that appears in the owner's list", async () => {
    const ticket = await createTicket(TICKET, MOCK_LEARNER);
    expect(ticket.status).toBe("open");
    expect(ticket.messages).toHaveLength(1);
    expect(ticket.messages[0]!.author_id).toBe(MOCK_LEARNER.id);

    const mine = await listMyTickets(MOCK_LEARNER.id);
    expect(mine.some((t) => t.id === ticket.id)).toBe(true);
  });

  it("hides another learner's ticket as a 404 (no existence leak)", async () => {
    await expect(getTicket(OTHER_TICKET_ID, MOCK_LEARNER)).rejects.toMatchObject({
      code: "ticket_not_found",
      status: 404,
    });
  });

  it("strips internal notes from learner reads but keeps them for agents", async () => {
    const learnerView = await getTicket(INTERNAL_NOTE_TICKET_ID, MOCK_LEARNER);
    expect(learnerView.messages.some((m) => m.internal_note)).toBe(false);

    const agentView = await getTicket(INTERNAL_NOTE_TICKET_ID, MOCK_ADMIN);
    expect(agentView.messages.some((m) => m.internal_note)).toBe(true);
  });
});

describe("support tickets — status machine", () => {
  it("agent reply moves open → pending; learner reply reopens pending → open", async () => {
    const ticket = await createTicket(TICKET, MOCK_LEARNER);

    const afterAgent = await replyToTicket(
      ticket.id,
      { body: "Looking into it." },
      MOCK_ADMIN,
    );
    expect(afterAgent.status).toBe("pending");

    const afterLearner = await replyToTicket(
      ticket.id,
      { body: "Thanks, it works now." },
      MOCK_LEARNER,
    );
    expect(afterLearner.status).toBe("open");
  });

  it("rejects replies on closed tickets with a 409", async () => {
    await expect(
      replyToTicket("tkt-1006", { body: "Hello?" }, MOCK_LEARNER),
    ).rejects.toMatchObject({ code: "ticket_closed", status: 409 });
  });

  it("rejects learner-posted internal notes with a 403", async () => {
    const ticket = await createTicket(TICKET, MOCK_LEARNER);
    await expect(
      replyToTicket(ticket.id, { body: "note", internal_note: true }, MOCK_LEARNER),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("rejects a learner replying to someone else's ticket with a 404", async () => {
    await expect(
      replyToTicket(OTHER_TICKET_ID, { body: "poke" }, MOCK_LEARNER),
    ).rejects.toMatchObject({ code: "ticket_not_found", status: 404 });
  });

  it("enforces the transition table with 409s", async () => {
    // tkt-1006 is closed — only open is reachable.
    await expect(
      updateTicketStatus("tkt-1006", "pending", MOCK_ADMIN),
    ).rejects.toMatchObject({ code: "invalid_transition", status: 409 });
    // Moving a ticket to its own status is also an invalid transition.
    await expect(
      updateTicketStatus("tkt-1001", "open", MOCK_ADMIN),
    ).rejects.toMatchObject({ code: "invalid_transition", status: 409 });
  });
});

describe("support tickets — admin-only ops", () => {
  it("rejects learner status changes with a 403", async () => {
    await expect(
      updateTicketStatus("tkt-1001", "pending", MOCK_LEARNER),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("rejects learner queue reads with a 403", async () => {
    await expect(listAdminTickets(MOCK_LEARNER)).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
  });

  it("assigns a known agent and rejects unknown agent ids", async () => {
    const reviewer = MOCK_REVIEWERS[1]!;
    const assigned = await assignTicket("tkt-1002", reviewer.id, MOCK_ADMIN);
    expect(assigned.assignee_id).toBe(reviewer.id);
    expect(assigned.assignee_name).toBe(reviewer.display_name);

    await expect(
      assignTicket("tkt-1002", "no-such-agent", MOCK_ADMIN),
    ).rejects.toMatchObject({ code: "agent_not_found", status: 404 });
  });
});
