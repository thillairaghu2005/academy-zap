import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("course data boundary", () => {
  it("uses isolated demo catalog and idempotent enrollment in demo mode", async () => {
    const content = await import("@/lib/data/demo/content");
    const catalog = await content.searchCatalog({ page: 1, pageSize: 1 });
    const course = catalog.hits[0];

    expect(course).toBeDefined();
    if (!course) return;

    const first = await content.enroll(course.id, "demo-course-user");
    const second = await content.enroll(course.id, "demo-course-user");
    const progress = await content.getCourseProgress(course.id, "demo-course-user");

    expect(first).toEqual(second);
    expect(progress.enrollment?.user_id).toBe("demo-course-user");
  });

  it("uses the same API boundary in backend mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      ),
    );

    const content = await import("@/lib/data/demo/content");
    const catalog = await content.searchCatalog({ page: 1, pageSize: 6 });

    expect(catalog).toEqual({
      hits: [],
      query: "",
      processingTimeMs: 0,
      limit: 6,
      offset: 0,
      estimatedTotalHits: 0,
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/courses?limit=6&offset=0",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });
});
