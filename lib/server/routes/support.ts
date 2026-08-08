import { MockApiError } from "@/lib/api/errors";
import { requireAdmin, requireUser } from "@/lib/server/authorization";
import {
  assignTicket,
  createTicket,
  getTicket,
  listAdminTickets,
  listMyTickets,
  listSupportAgents,
  replyToTicket,
  updateTicketStatus,
} from "@/lib/server/domains/support";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_TRANSITIONS,
  type TicketStatus,
} from "@/lib/contracts/support";
import { idSchema, parseBody, route } from "@/lib/server/http";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  body: z.string().trim().min(10).max(20_000),
});

const replySchema = z.object({
  body: z.string().trim().min(1).max(20_000),
  internal_note: z.boolean().optional(),
});

const statusSchema = z.object({
  status: z.enum(
    Object.keys(TICKET_TRANSITIONS) as [TicketStatus, ...TicketStatus[]],
  ),
});

const assigneeSchema = z.object({
  agent_id: z.string().trim().min(1).max(200).nullable(),
});

function id(path: string[], index: number): string {
  return idSchema.parse(path[index]);
}

function expectPath(path: string[], expected: string[]): void {
  if (path.length !== expected.length) {
    throw new MockApiError("not_found", "Support route was not found.", 404);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== ":id" && path[index] !== expected[index]) {
      throw new MockApiError("not_found", "Support route was not found.", 404);
    }
  }
}

export async function handleSupport(
  request: Request,
  path: string[],
): Promise<Response> {
  return route(async () => {
    if (request.method === "GET" && path[0] === "tickets" && path.length === 1) {
      expectPath(path, ["tickets"]);
      const actor = await requireUser(request);
      return Response.json(await listMyTickets(actor.id));
    }

    if (request.method === "POST" && path[0] === "tickets" && path.length === 1) {
      expectPath(path, ["tickets"]);
      const actor = await requireUser(request);
      const input = await parseBody(request, createSchema);
      return Response.json(await createTicket(input, actor), { status: 201 });
    }

    if (request.method === "GET" && path[0] === "tickets" && path.length === 2) {
      expectPath(path, ["tickets", ":id"]);
      const actor = await requireUser(request);
      return Response.json(await getTicket(id(path, 1), actor));
    }

    if (request.method === "POST" && path[0] === "tickets" && path[2] === "messages") {
      expectPath(path, ["tickets", ":id", "messages"]);
      const actor = await requireUser(request);
      const input = await parseBody(request, replySchema);
      return Response.json(await replyToTicket(id(path, 1), input, actor));
    }

    if (request.method === "GET" && path[0] === "admin" && path[1] === "tickets") {
      expectPath(path, ["admin", "tickets"]);
      const actor = await requireAdmin(request);
      return Response.json(await listAdminTickets(actor));
    }

    if (request.method === "GET" && path[0] === "admin" && path[1] === "agents") {
      expectPath(path, ["admin", "agents"]);
      const actor = await requireAdmin(request);
      return Response.json(await listSupportAgents(actor));
    }

    if (request.method === "POST" && path[0] === "admin" && path[3] === "status") {
      expectPath(path, ["admin", "tickets", ":id", "status"]);
      const actor = await requireAdmin(request);
      const input = await parseBody(request, statusSchema);
      return Response.json(await updateTicketStatus(id(path, 2), input.status, actor));
    }

    if (request.method === "POST" && path[0] === "admin" && path[3] === "assignee") {
      expectPath(path, ["admin", "tickets", ":id", "assignee"]);
      const actor = await requireAdmin(request);
      const input = await parseBody(request, assigneeSchema);
      return Response.json(await assignTicket(id(path, 2), input.agent_id, actor));
    }

    throw new MockApiError("not_found", "Support route was not found.", 404);
  });
}
