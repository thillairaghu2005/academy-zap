import type {
  CreateTicketInput,
  SupportTicket,
  TicketStatus,
} from "@/lib/contracts/support";
import type { SessionUser } from "@/lib/contracts/session";
import { jsonBody, requestJson, segment } from "@/lib/api/client";

export async function listMyTickets(userId: string): Promise<SupportTicket[]> {
  void userId;
  return requestJson<SupportTicket[]>("/api/support/tickets");
}

export async function listAdminTickets(
  actor: SessionUser,
): Promise<SupportTicket[]> {
  void actor;
  return requestJson<SupportTicket[]>("/api/support/admin/tickets");
}

export async function listSupportAgents(
  actor: SessionUser,
): Promise<{ id: string; display_name: string }[]> {
  void actor;
  return requestJson<{ id: string; display_name: string }[]>(
    "/api/support/admin/agents",
  );
}

export async function getTicket(
  ticketId: string,
  viewer: SessionUser,
): Promise<SupportTicket> {
  void viewer;
  return requestJson<SupportTicket>(
    `/api/support/tickets/${segment(ticketId)}`,
  );
}

export async function createTicket(
  input: CreateTicketInput,
  user: SessionUser,
): Promise<SupportTicket> {
  void user;
  return requestJson<SupportTicket>(
    "/api/support/tickets",
    jsonBody(input),
  );
}

export interface ReplyInput {
  body: string;
  internal_note?: boolean;
}

export async function replyToTicket(
  ticketId: string,
  input: ReplyInput,
  actor: SessionUser,
): Promise<SupportTicket> {
  void actor;
  return requestJson<SupportTicket>(
    `/api/support/tickets/${segment(ticketId)}/messages`,
    jsonBody(input),
  );
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  actor: SessionUser,
): Promise<SupportTicket> {
  void actor;
  return requestJson<SupportTicket>(
    `/api/support/admin/tickets/${segment(ticketId)}/status`,
    jsonBody({ status }),
  );
}

export async function assignTicket(
  ticketId: string,
  agentId: string | null,
  actor: SessionUser,
): Promise<SupportTicket> {
  void actor;
  return requestJson<SupportTicket>(
    `/api/support/admin/tickets/${segment(ticketId)}/assignee`,
    jsonBody({ agent_id: agentId }),
  );
}
