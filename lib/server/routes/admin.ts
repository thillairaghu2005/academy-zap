import { MockApiError } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/server/authorization";
import {
  createCourse,
  deleteCourse,
  getAdminDashboard,
  getCourseReviewDiff,
  listAdminOrders,
  listAdminUsers,
  listAuditEntries,
  listCoursesAdmin,
  publishCourse,
  saveDraft,
  setUserRole,
  submitCourseForReview,
  unpublishCourse,
  updateCourse,
} from "@/lib/server/domains/admin";
import { idSchema, parseBody, route } from "@/lib/server/http";
import { z } from "zod";

const courseInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  subtitle: z.string().trim().min(3).max(300),
  description: z.string().trim().min(10).max(10_000),
  category: z.string().trim().min(2).max(100),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  language: z.string().trim().min(1).max(100),
  price_cents: z.number().int().min(0).max(100_000_000),
  estimated_hours: z.number().min(0).max(10_000),
  status: z.enum(["draft", "in_review", "published"]).optional(),
});

const coursePatchSchema = courseInputSchema.partial();

const roleSchema = z.object({
  role: z.enum(["learner", "admin"]),
});

function id(path: string[], index: number): string {
  return idSchema.parse(path[index]);
}

function expectPath(path: string[], expected: string[]): void {
  if (path.length !== expected.length) {
    throw new MockApiError("not_found", "Admin route was not found.", 404);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== ":id" && path[index] !== expected[index]) {
      throw new MockApiError("not_found", "Admin route was not found.", 404);
    }
  }
}

export async function handleAdmin(
  request: Request,
  path: string[],
): Promise<Response> {
  return route(async () => {
    if (request.method === "GET" && path[0] === "dashboard") {
      expectPath(path, ["dashboard"]);
      const actor = await requireAdmin(request);
      return Response.json(await getAdminDashboard(actor.id));
    }

    if (path[0] === "courses") {
      if (request.method === "GET" && path.length === 1) {
        expectPath(path, ["courses"]);
        await requireAdmin(request);
        return Response.json(await listCoursesAdmin());
      }

      if (request.method === "POST" && path.length === 1) {
        expectPath(path, ["courses"]);
        const actor = await requireAdmin(request);
        const input = await parseBody(request, courseInputSchema);
        return Response.json(await createCourse(input, actor), { status: 201 });
      }

      if (path.length === 2) {
        const actor = await requireAdmin(request);
        const courseId = id(path, 1);
        if (request.method === "PATCH") {
          expectPath(path, ["courses", ":id"]);
          const patch = await parseBody(request, coursePatchSchema);
          return Response.json(await updateCourse(courseId, patch, actor));
        }
        if (request.method === "DELETE") {
          expectPath(path, ["courses", ":id"]);
          await deleteCourse(courseId, actor);
          return Response.json({ ok: true });
        }
      }

      if (request.method === "POST" && path[2] === "draft") {
        expectPath(path, ["courses", ":id", "draft"]);
        const actor = await requireAdmin(request);
        const patch = await parseBody(request, coursePatchSchema);
        return Response.json(await saveDraft(id(path, 1), patch, actor));
      }

      if (request.method === "POST" && path[2] === "submit-review") {
        expectPath(path, ["courses", ":id", "submit-review"]);
        const actor = await requireAdmin(request);
        return Response.json(await submitCourseForReview(id(path, 1), actor));
      }

      if (request.method === "POST" && path[2] === "publish") {
        expectPath(path, ["courses", ":id", "publish"]);
        const actor = await requireAdmin(request);
        return Response.json(await publishCourse(id(path, 1), actor));
      }

      if (request.method === "POST" && path[2] === "unpublish") {
        expectPath(path, ["courses", ":id", "unpublish"]);
        const actor = await requireAdmin(request);
        return Response.json(await unpublishCourse(id(path, 1), actor));
      }

      if (request.method === "GET" && path[2] === "diff") {
        expectPath(path, ["courses", ":id", "diff"]);
        await requireAdmin(request);
        return Response.json(await getCourseReviewDiff(id(path, 1)));
      }
    }

    if (request.method === "GET" && path[0] === "orders") {
      expectPath(path, ["orders"]);
      await requireAdmin(request);
      return Response.json(await listAdminOrders());
    }

    if (request.method === "GET" && path[0] === "users") {
      expectPath(path, ["users"]);
      await requireAdmin(request);
      return Response.json(await listAdminUsers());
    }

    if (request.method === "POST" && path[0] === "users" && path[2] === "role") {
      expectPath(path, ["users", ":id", "role"]);
      const actor = await requireAdmin(request);
      const input = await parseBody(request, roleSchema);
      return Response.json(await setUserRole(id(path, 1), input.role, actor));
    }

    if (request.method === "GET" && path[0] === "audit") {
      expectPath(path, ["audit"]);
      await requireAdmin(request);
      return Response.json(await listAuditEntries());
    }

    throw new MockApiError("not_found", "Admin route was not found.", 404);
  });
}
