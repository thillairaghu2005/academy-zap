import type { CodeSubmission } from "@/lib/contracts/judge";
import { MockApiError } from "@/lib/api/errors";
import { getAuthenticatedUser, requireUser } from "@/lib/server/authorization";
import {
  getProblem,
  getResult,
  listProblems,
  listSolvedProblemIds,
  listSubmissions,
  submit,
} from "@/lib/server/domains/judge";
import { idSchema, parseBody, route } from "@/lib/server/http";
import { z } from "zod";

const submissionSchema = z.object({
  problem_id: idSchema,
  source_code: z.string().trim().min(1).max(200_000),
  language: z.literal("python"),
});

function id(path: string[], index: number): string {
  return idSchema.parse(path[index]);
}

function expectPath(path: string[], expected: string[]): void {
  if (path.length !== expected.length) {
    throw new MockApiError("not_found", "Judge route was not found.", 404);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== ":id" && path[index] !== expected[index]) {
      throw new MockApiError("not_found", "Judge route was not found.", 404);
    }
  }
}

export async function handleJudge(
  request: Request,
  path: string[],
): Promise<Response> {
  return route(async () => {
    if (request.method === "GET" && path[0] === "problems" && path.length === 1) {
      expectPath(path, ["problems"]);
      return Response.json(await listProblems());
    }

    if (request.method === "GET" && path[0] === "solved") {
      expectPath(path, ["solved"]);
      // Solved projection is user-scoped but browsing the catalog must not
      // hard-fail for anonymous visitors — anonymous simply gets no solved ids.
      const actor = await getAuthenticatedUser(request);
      return Response.json(await listSolvedProblemIds(actor?.id ?? ""));
    }

    if (request.method === "GET" && path[0] === "problems" && path.length === 2) {
      expectPath(path, ["problems", ":id"]);
      return Response.json(await getProblem(id(path, 1)));
    }

    if (request.method === "POST" && path[0] === "submissions" && path.length === 1) {
      expectPath(path, ["submissions"]);
      const actor = await requireUser(request);
      const input = await parseBody(request, submissionSchema);
      // Server-side identity is authoritative — never trust a client-supplied
      // user_id on the wire (mirrors the assessment route).
      const submission: CodeSubmission = {
        problem_id: input.problem_id,
        user_id: actor.id,
        language: input.language,
        source_code: input.source_code,
      };
      return Response.json(await submit(submission), { status: 202 });
    }

    if (request.method === "GET" && path[0] === "submissions" && path.length === 2) {
      expectPath(path, ["submissions", ":id"]);
      const actor = await requireUser(request);
      return Response.json(await getResult(id(path, 1), actor.id));
    }

    if (
      request.method === "GET" &&
      path[0] === "problems" &&
      path.length === 3 &&
      path[2] === "submissions"
    ) {
      expectPath(path, ["problems", ":id", "submissions"]);
      const actor = await requireUser(request);
      return Response.json(await listSubmissions(id(path, 1), actor.id));
    }

    throw new MockApiError("not_found", "Judge route was not found.", 404);
  });
}
