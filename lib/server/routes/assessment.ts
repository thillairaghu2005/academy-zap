import type { AssessmentSubmission, QuestionType, TelemetryType } from "@/lib/contracts/assessment";
import { MockApiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/server/authorization";
import {
  getAssessment,
  getAttempt,
  getComboCurve,
  getComboState,
  listAssessments,
  listAttemptsForAssessment,
  reportTelemetry,
  startAttempt,
  submitAnswer,
  submitAssessment,
} from "@/lib/server/domains/assessment";
import { idSchema, parseBody, route } from "@/lib/server/http";
import { z } from "zod";

const startSchema = z.object({
  attempt_number: z.number().int().min(1).max(100).optional(),
});

const answerSchema = z.object({
  question_id: idSchema,
  type: z.enum(["mcq", "short_answer", "code"]),
  answer: z.union([
    z.object({ option_index: z.number().int().min(0).max(100) }),
    z.object({ text: z.string().max(20_000) }),
    z.object({ source_code: z.string().max(100_000) }),
  ]),
  time_spent_ms: z.number().int().min(0).max(86_400_000),
});

const telemetrySchema = z.object({
  type: z.enum(["tab_visibility", "paste", "focus_blur"]),
  detail: z.string().trim().min(1).max(500),
  occurred_at: z.string().datetime(),
});

function id(path: string[], index: number): string {
  return idSchema.parse(path[index]);
}

function expectPath(path: string[], expected: string[]): void {
  if (path.length !== expected.length) {
    throw new MockApiError("not_found", "Assessment route was not found.", 404);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== ":id" && path[index] !== expected[index]) {
      throw new MockApiError("not_found", "Assessment route was not found.", 404);
    }
  }
}

export async function handleAssessment(
  request: Request,
  path: string[],
): Promise<Response> {
  return route(async () => {
    if (path[0] === "combo-curve") {
      expectPath(path, ["combo-curve"]);
      if (request.method !== "GET") throw new MockApiError("method_not_allowed", "Method not allowed.", 405);
      await requireUser(request);
      return Response.json(await getComboCurve());
    }

    if (path[0] === "attempts") {
      const actor = await requireUser(request);
      if (path.length === 2 && request.method === "GET") {
        expectPath(path, ["attempts", ":id"]);
        return Response.json(await getAttempt(id(path, 1), actor.id));
      }
      if (path[2] === "answers" && request.method === "POST") {
        expectPath(path, ["attempts", ":id", "answers"]);
        const input = await parseBody(request, answerSchema);
        const submission: AssessmentSubmission = {
          attempt_id: id(path, 1),
          question_id: input.question_id,
          user_id: actor.id,
          type: input.type as QuestionType,
          answer: input.answer,
          time_spent_ms: input.time_spent_ms,
        };
        return Response.json(await submitAnswer(submission, actor.id));
      }
      if (path[2] === "combo" && request.method === "GET") {
        expectPath(path, ["attempts", ":id", "combo"]);
        return Response.json(await getComboState(id(path, 1), actor.id));
      }
      if (path[2] === "submit" && request.method === "POST") {
        expectPath(path, ["attempts", ":id", "submit"]);
        return Response.json(await submitAssessment(id(path, 1), actor.id));
      }
      if (path[2] === "telemetry" && request.method === "POST") {
        expectPath(path, ["attempts", ":id", "telemetry"]);
        const input = await parseBody(request, telemetrySchema);
        await reportTelemetry(
          {
            attempt_id: id(path, 1),
            type: input.type as TelemetryType,
            detail: input.detail,
            occurred_at: input.occurred_at,
          },
          actor.id,
        );
        return Response.json({ ok: true });
      }
    }

    const assessmentId = id(path, 0);
    if (path.length === 1 && request.method === "GET") {
      await requireUser(request);
      if (assessmentId === "assess-cyber-foundations" || assessmentId === "assess-linux-ops" || assessmentId === "assess-web-security") {
        return Response.json(await getAssessment(assessmentId));
      }
    }

    if (path.length === 1 && request.method === "GET") {
      await requireUser(request);
      return Response.json(await listAssessments());
    }

    if (path[1] === "attempts") {
      expectPath(path, [":id", "attempts"]);
      const actor = await requireUser(request);
      if (request.method === "GET") {
        return Response.json(await listAttemptsForAssessment(assessmentId, actor.id));
      }
      if (request.method === "POST") {
        const body = await parseBody(request, startSchema);
        const attempts = await listAttemptsForAssessment(assessmentId, actor.id);
        const nextAttempt =
          attempts.reduce((maximum, attempt) => Math.max(maximum, attempt.attempt_number), 0) + 1;
        void body;
        return Response.json(await startAttempt(assessmentId, actor.id, nextAttempt), { status: 201 });
      }
    }

    throw new MockApiError("not_found", "Assessment route was not found.", 404);
  });
}
