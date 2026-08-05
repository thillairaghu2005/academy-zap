import type {
  SupportTicket,
  TicketMessage,
} from "@/lib/contracts/support";
import { MOCK_ADMIN, MOCK_LEARNER, MOCK_REVIEWERS } from "@/lib/mocks/users";

/**
 * Support ticket fixtures + mutation helpers.
 *
 * The status workflow rules live in lib/api/support.ts (the mock server
 * layer); this module owns the store and the message/status/assignee
 * writes that keep it consistent — the same split as courses (fixtures in
 * mocks, workflow in api/admin).
 *
 * Seeded to exercise every ticket state for both viewer roles:
 *  - open / pending / resolved / closed for the demo learner
 *  - an internal note on tkt-1005/1006 (learners must never see it)
 *  - a ticket owned by ANOTHER learner (learner isolation 404)
 */

const DAY = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number, hourOffset = 0) =>
  new Date(Date.now() - daysAgo * DAY + hourOffset * 3_600_000).toISOString();

const MEERA = MOCK_REVIEWERS[1]!;
const DIEGO = MOCK_REVIEWERS[2]!;

let messageCounter = 1;
function m(
  authorId: string,
  authorName: string,
  role: TicketMessage["author_role"],
  body: string,
  internalNote: boolean,
  daysAgo: number,
  hourOffset: number,
): TicketMessage {
  return {
    id: `tmsg-${messageCounter++}`,
    author_id: authorId,
    author_name: authorName,
    author_role: role,
    body,
    internal_note: internalNote,
    created_at: iso(daysAgo, hourOffset),
  };
}

function ticket(
  id: string,
  subject: string,
  category: SupportTicket["category"],
  priority: SupportTicket["priority"],
  status: SupportTicket["status"],
  createdBy: string,
  createdByName: string,
  assigneeId: string | null,
  assigneeName: string | null,
  messages: TicketMessage[],
  createdDaysAgo: number,
  updatedDaysAgo: number,
): SupportTicket {
  return {
    id,
    subject,
    category,
    priority,
    status,
    created_by: createdBy,
    created_by_name: createdByName,
    assignee_id: assigneeId,
    assignee_name: assigneeName,
    messages,
    created_at: iso(createdDaysAgo),
    updated_at: iso(updatedDaysAgo, 5),
  };
}

export const mockTickets = new Map<string, SupportTicket>([
  [
    "tkt-1001",
    ticket(
      "tkt-1001",
      "Double charge on Cloud Security Essentials",
      "billing",
      "urgent",
      "open",
      MOCK_LEARNER.id,
      MOCK_LEARNER.display_name,
      MOCK_ADMIN.id,
      MOCK_ADMIN.display_name,
      [
        m(MOCK_LEARNER.id, MOCK_LEARNER.display_name, "learner", "I was charged twice for Cloud Security Essentials — two Razorpay receipts, one course access. Can you refund one?", false, 2, 1),
        m(MOCK_ADMIN.id, MOCK_ADMIN.display_name, "agent", "Hi Aarav — I can see both charges on the order history. We'll refund the duplicate within 24h; access stays on your account meanwhile.", false, 1, 2),
      ],
      2,
      1,
    ),
  ],
  [
    "tkt-1002",
    ticket(
      "tkt-1002",
      "Video player freezes on lesson 3",
      "courses",
      "medium",
      "pending",
      MOCK_LEARNER.id,
      MOCK_LEARNER.display_name,
      MEERA.id,
      MEERA.display_name,
      [
        m(MOCK_LEARNER.id, MOCK_LEARNER.display_name, "learner", "The player freezes ~2 minutes into lesson 3 of React & TypeScript Deep Dive. Buffering spinner never resolves.", false, 3, 1),
        m(MEERA.id, MEERA.display_name, "agent", "Can you share your browser version and whether a captions toggle was on? Meanwhile, try the 'Low latency' quality option.", false, 1, 4),
      ],
      3,
      1,
    ),
  ],
  [
    "tkt-1003",
    ticket(
      "tkt-1003",
      "Lab flag not detected",
      "labs",
      "low",
      "resolved",
      MOCK_LEARNER.id,
      MOCK_LEARNER.display_name,
      MOCK_ADMIN.id,
      MOCK_ADMIN.display_name,
      [
        m(MOCK_LEARNER.id, MOCK_LEARNER.display_name, "learner", "I found the flag in the log file but the objective stayed unchecked. The format looked right.", false, 5, 1),
        m(MOCK_ADMIN.id, MOCK_ADMIN.display_name, "agent", "The objective checks the flag on the *root* log path — you read the rotated copy. Copying it to /var/log/app.log resolved it for us.", false, 4, 3),
        m(MOCK_LEARNER.id, MOCK_LEARNER.display_name, "learner", "That was it — worked. Thank you!", false, 4, 6),
        m(MOCK_ADMIN.id, MOCK_ADMIN.display_name, "agent", "Glad it worked — marking this resolved. Happy hacking!", false, 3, 2),
      ],
      5,
      3,
    ),
  ],
  [
    "tkt-1004",
    ticket(
      "tkt-1004",
      "Closing old account request",
      "account",
      "low",
      "closed",
      "9f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81",
      "Ravi Kapoor",
      DIEGO.id,
      DIEGO.display_name,
      [
        m("9f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81", "Ravi Kapoor", "learner", "I'd like to close this trial account.", false, 8, 1),
        m(DIEGO.id, DIEGO.display_name, "agent", "Hi Ravi — export your certificates first (they disappear on closure). Confirm here and we'll proceed.", false, 7, 2),
        m("9f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81", "Ravi Kapoor", "learner", "Confirmed — nothing to export. Please close it.", false, 6, 1),
        m(DIEGO.id, DIEGO.display_name, "agent", "Done. Account closed; this ticket is now closed. Take care!", false, 5, 4),
      ],
      8,
      5,
    ),
  ],
  [
    "tkt-1005",
    ticket(
      "tkt-1005",
      "Verdict said accepted but scoreboard shows 0",
      "judge",
      "high",
      "open",
      MOCK_LEARNER.id,
      MOCK_LEARNER.display_name,
      DIEGO.id,
      DIEGO.display_name,
      [
        m(MOCK_LEARNER.id, MOCK_LEARNER.display_name, "learner", "My submission for 'Two Sum Fast' showed ACCEPTED in the editor, but the problem page still shows 0 attempts. Is this a sync issue?", false, 1, 1),
        m(DIEGO.id, DIEGO.display_name, "agent", "Internal note: verifying against judge events — check submission_id j-9f3a1b2c against the graded-event stream before replying publicly.", true, 1, 3),
        m(DIEGO.id, DIEGO.display_name, "agent", "Thanks for the report — the grade landed but the problem-page aggregation lagged. It's now showing correctly. Please refresh.", false, 1, 4),
      ],
      1,
      1,
    ),
  ],
  [
    "tkt-1006",
    ticket(
      "tkt-1006",
      "Refund request for Go DSA course",
      "billing",
      "medium",
      "closed",
      MOCK_LEARNER.id,
      MOCK_LEARNER.display_name,
      MOCK_ADMIN.id,
      MOCK_ADMIN.display_name,
      [
        m(MOCK_LEARNER.id, MOCK_LEARNER.display_name, "learner", "Purchased Data Structures & Algorithms in Go but realized it's too advanced for me. Requesting the 30-day refund.", false, 9, 1),
        m(MOCK_ADMIN.id, MOCK_ADMIN.display_name, "agent", "Internal note: refund policy check — within 30 days, no completion certificate issued. Proceed.", true, 8, 2),
        m(MOCK_ADMIN.id, MOCK_ADMIN.display_name, "agent", "Approved — $899 refund processed to your original payment method. Access will be revoked in 48h.", false, 8, 5),
        m(MOCK_LEARNER.id, MOCK_LEARNER.display_name, "learner", "Received — thank you!", false, 7, 1),
        m(MOCK_ADMIN.id, MOCK_ADMIN.display_name, "agent", "Closing this out. Ping us anytime!", false, 6, 2),
      ],
      9,
      6,
    ),
  ],
]);

/**
 * Mutation helpers — the only writes against the store. All bump updated_at
 * so the list sort stays honest.
 */

export function addMessageToTicket(
  ticketId: string,
  message: Omit<TicketMessage, "id" | "created_at">,
): SupportTicket {
  const ticket = mockTickets.get(ticketId);
  if (!ticket) throw new Error(`Mock invariant: unknown ticket ${ticketId}`);
  ticket.messages.push({
    ...message,
    id: `tmsg-${messageCounter++}`,
    created_at: new Date().toISOString(),
  });
  ticket.updated_at = new Date().toISOString();
  return ticket;
}

export function setTicketStatus(
  ticketId: string,
  status: SupportTicket["status"],
): SupportTicket {
  const ticket = mockTickets.get(ticketId);
  if (!ticket) throw new Error(`Mock invariant: unknown ticket ${ticketId}`);
  ticket.status = status;
  ticket.updated_at = new Date().toISOString();
  return ticket;
}

export function setTicketAssignee(
  ticketId: string,
  assigneeId: string | null,
  assigneeName: string | null,
): SupportTicket {
  const ticket = mockTickets.get(ticketId);
  if (!ticket) throw new Error(`Mock invariant: unknown ticket ${ticketId}`);
  ticket.assignee_id = assigneeId;
  ticket.assignee_name = assigneeName;
  ticket.updated_at = new Date().toISOString();
  return ticket;
}
