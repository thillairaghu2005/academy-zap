import { MockApiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/server/authorization";
import {
  checkObjective,
  completeSession,
  getLab,
  getSession,
  listLabs,
  provisionPreviewSession,
  provisionSession,
  requestHint,
  searchLabs,
  terminateSession,
} from "@/lib/server/domains/lab";
import {
  getCatalogProduct,
  hasEntitlement,
} from "@/lib/server/domains/commerce";
import { idSchema, parseQuery, route } from "@/lib/server/http";
import { z } from "zod";

const searchSchema = z.object({ query: z.string().optional().default("") });

function id(path: string[], index: number): string {
  return idSchema.parse(path[index]);
}

function expectPath(path: string[], expected: string[]): void {
  if (path.length !== expected.length) {
    throw new MockApiError("not_found", "Lab route was not found.", 404);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== ":id" && path[index] !== expected[index]) {
      throw new MockApiError("not_found", "Lab route was not found.", 404);
    }
  }
}

async function assertLabEntitlement(labId: string, userId: string): Promise<void> {
  const product = await getCatalogProduct(labId);
  if (product && product.price_cents > 0 && !(await hasEntitlement(userId, labId))) {
    throw new MockApiError(
      "entitlement_required",
      "Purchase this lab pass before starting the lab.",
      403,
    );
  }
}

export async function handleLab(request: Request, path: string[]): Promise<Response> {
  return route(async () => {
    if (request.method === "GET" && path[0] === "catalog") {
      expectPath(path, ["catalog"]);
      const { query } = parseQuery(request, searchSchema);
      return Response.json(query ? await searchLabs(query) : await listLabs());
    }

    if (request.method === "GET" && path.length === 1) {
      return Response.json(await getLab(id(path, 0)));
    }

    if (request.method === "POST" && path[1] === "preview-session") {
      expectPath(path, [":id", "preview-session"]);
      return Response.json(await provisionPreviewSession(id(path, 0)));
    }

    if (request.method === "POST" && path[1] === "sessions" && path.length === 2) {
      expectPath(path, [":id", "sessions"]);
      const actor = await requireUser(request);
      await assertLabEntitlement(id(path, 0), actor.id);
      return Response.json(await provisionSession(id(path, 0), actor.id), { status: 201 });
    }

    if (path[0] === "sessions" && path.length === 2) {
      expectPath(path, ["sessions", ":id"]);
      const actor = await requireUser(request);
      const sessionId = id(path, 1);
      if (request.method === "GET") {
        return Response.json(await getSession(sessionId, actor.id));
      }
      if (request.method === "DELETE") {
        await terminateSession(sessionId, actor.id);
        return Response.json({ ok: true });
      }
    }

    if (path[0] === "sessions" && path[2] === "hint") {
      expectPath(path, ["sessions", ":id", "hint"]);
      const actor = await requireUser(request);
      return Response.json(await requestHint(id(path, 1), actor.id));
    }

    if (path[0] === "sessions" && path[2] === "complete") {
      expectPath(path, ["sessions", ":id", "complete"]);
      const actor = await requireUser(request);
      return Response.json(await completeSession(id(path, 1), actor.id));
    }

    if (path[0] === "sessions" && path[2] === "objectives" && path[4] === "check") {
      expectPath(path, ["sessions", ":id", "objectives", ":id", "check"]);
      const actor = await requireUser(request);
      const session = await getSession(id(path, 1), actor.id);
      const lab = await getLab(session.lab_id);
      if (!lab.objectives.some((objective) => objective.id === id(path, 3))) {
        throw new MockApiError("objective_not_found", "Objective was not found.", 404);
      }
      return Response.json(await checkObjective(id(path, 1), id(path, 3), actor.id));
    }

    throw new MockApiError("not_found", "Lab route was not found.", 404);
  });
}
