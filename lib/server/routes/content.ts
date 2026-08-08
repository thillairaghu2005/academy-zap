import type { CatalogQuery } from "@/lib/contracts/content";
import { getAuthenticatedUser, requireUser } from "@/lib/server/authorization";
import {
  enroll,
  getCourse,
  getCourseForAdmin,
  getCourseProgress,
  getEnrollment,
  getLessonPreview,
  getPlaybackManifest,
  listMyLearning,
  recordProgress,
  searchCatalog,
} from "@/lib/server/domains/content";
import { idSchema, parseBody, parseQuery, route } from "@/lib/server/http";
import { z } from "zod";

const catalogQuerySchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  price: z.enum(["free", "paid", "all"]).optional(),
  level: z.enum(["beginner", "intermediate", "advanced", "all"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  duration: z.enum(["under_2", "2_to_5", "5_to_10", "over_10"]).optional(),
  format: z.enum(["video", "interactive", "lab", "project", "judge", "all"]).optional(),
  careerTrack: z
    .enum([
      "cyber_security",
      "web_development",
      "ai_ml",
      "cloud",
      "data_science",
      "game_dev",
      "interview_prep",
      "all",
    ])
    .optional(),
  projectBased: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  certificateIncluded: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(["popular", "rated", "newest", "recommended", "shortest"]).optional(),
});

const progressSchema = z.object({
  lesson_id: idSchema,
  position_seconds: z.number().int().min(0).max(86_400).optional(),
  completed: z.boolean(),
});

function courseId(path: string[]): string {
  return idSchema.parse(path[1]);
}

function lessonId(path: string[]): string {
  return idSchema.parse(path[1]);
}

function assertPath(path: string[], expected: string[]): void {
  if (path.length !== expected.length) {
    throw new Error("not_found");
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== ":id" && path[index] !== expected[index]) {
      throw new Error("not_found");
    }
  }
}

export async function handleContent(
  request: Request,
  path: string[],
): Promise<Response> {
  return route(async () => {
    if (request.method === "GET" && path[0] === "catalog" && path.length === 1) {
      const query = parseQuery(request, catalogQuerySchema) as CatalogQuery;
      return Response.json(await searchCatalog(query));
    }

    if (request.method === "GET" && path[0] === "courses" && path.length === 2) {
      const id = courseId(path);
      const actor = await getAuthenticatedUser(request);
      const course = actor?.role === "admin"
        ? await getCourseForAdmin(id)
        : await getCourse(id);
      return Response.json(course);
    }

    if (request.method === "GET" && path[0] === "lessons" && path[2] === "preview") {
      assertPath(path, ["lessons", ":id", "preview"]);
      return Response.json(await getLessonPreview(lessonId(path)));
    }

    if (request.method === "GET" && path[0] === "lessons" && path[2] === "manifest") {
      assertPath(path, ["lessons", ":id", "manifest"]);
      const actor = await requireUser(request);
      return Response.json(await getPlaybackManifest(lessonId(path), actor.id));
    }

    if (request.method === "GET" && path[0] === "courses" && path[2] === "progress") {
      assertPath(path, ["courses", ":id", "progress"]);
      const actor = await requireUser(request);
      return Response.json(await getCourseProgress(courseId(path), actor.id));
    }

    if (request.method === "GET" && path[0] === "courses" && path[2] === "enrollment") {
      assertPath(path, ["courses", ":id", "enrollment"]);
      const actor = await requireUser(request);
      return Response.json(await getEnrollment(courseId(path), actor.id));
    }

    if (request.method === "GET" && path[0] === "courses" && path[1] === "learning") {
      assertPath(path, ["courses", "learning"]);
      const actor = await requireUser(request);
      return Response.json(await listMyLearning(actor.id));
    }

    if (request.method === "POST" && path[0] === "courses" && path[2] === "enroll") {
      assertPath(path, ["courses", ":id", "enroll"]);
      const actor = await requireUser(request);
      return Response.json(await enroll(courseId(path), actor.id));
    }

    if (request.method === "POST" && path[0] === "courses" && path[2] === "progress") {
      assertPath(path, ["courses", ":id", "progress"]);
      const actor = await requireUser(request);
      const input = await parseBody(request, progressSchema);
      return Response.json(
        await recordProgress({
          courseId: courseId(path),
          lessonId: input.lesson_id,
          userId: actor.id,
          position_seconds: input.position_seconds,
          completed: input.completed,
        }),
      );
    }

    throw new Error("not_found");
  });
}
