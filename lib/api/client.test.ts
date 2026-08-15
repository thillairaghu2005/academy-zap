import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearAccessToken,
  enrollCourse,
  getCurrentUser,
  getCourseProgressFromApi,
  login,
} from "@/lib/api/client";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.com",
  display_name: "Ada Learner",
  role: "user",
  org_id: null,
  is_active: true,
  created_at: "2026-08-14T00:00:00Z",
};

describe("backend API client", () => {
  afterEach(() => {
    clearAccessToken();
    vi.restoreAllMocks();
  });

  it("keeps the access token in memory and sends it to current-user", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ user, tokens: { access_token: "access-1", token_type: "bearer" } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(user), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await login({ email: user.email, password: "correct-horse-1" });
    await getCurrentUser();

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://127.0.0.1:8000/api/v1/auth/me",
    );
    const firstRequest = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(firstRequest?.credentials).toBe("include");
    expect(new Headers(firstRequest?.headers).get("authorization")).toBe("Bearer access-1");
  });

  it("refreshes once after an expired access token and retries the request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ user, tokens: { access_token: "access-1", token_type: "bearer" } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Token expired" }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "access-2", token_type: "bearer" }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(user), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await login({ email: user.email, password: "correct-horse-1" });
    await getCurrentUser();

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const retryRequest = fetchMock.mock.calls[3]?.[1] as RequestInit | undefined;
    expect(new Headers(retryRequest?.headers).get("authorization")).toBe("Bearer access-2");
  });

  it("uses server course progress and never sends a client user id", async () => {
    const courseId = "22222222-2222-4222-8222-222222222222";
    const enrollment = {
      course_id: courseId,
      user_id: user.id,
      status: "active",
      progress_pct: 0,
      last_lesson_id: null,
      last_position_seconds: 0,
      enrolled_at: "2026-08-14T00:00:00Z",
      updated_at: "2026-08-14T00:00:00Z",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ user, tokens: { access_token: "access-1", token_type: "bearer" } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(enrollment), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ enrollment, completed_lesson_ids: [] }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await login({ email: user.email, password: "correct-horse-1" });
    await enrollCourse(courseId);
    await getCourseProgressFromApi(courseId);

    const enrollmentRequest = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `http://127.0.0.1:8000/api/v1/courses/${courseId}/enroll`,
    );
    expect(enrollmentRequest?.body).toBeUndefined();
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `http://127.0.0.1:8000/api/v1/courses/${courseId}/progress`,
    );
  });
});
