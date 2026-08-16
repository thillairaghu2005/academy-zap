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

  it("fetches enrollment-gated lesson content from the backend in backend mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    const lessonId = "a1b2c3d4-0001-4000-8000-000000000001";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: lessonId,
            title: "Lesson 1",
            kind: "article",
            duration_seconds: 600,
            position: 0,
            is_preview: false,
            body: "server-authoritative article body",
          }),
          { status: 200 },
        ),
      ),
    );

    const content = await import("@/lib/data/demo/content");
    const result = await content.getLessonContent(lessonId, "ignored-user");

    expect(result).toEqual({ body: "server-authoritative article body" });
    expect(fetch).toHaveBeenCalledWith(
      `https://api.example.test/api/v1/lessons/${lessonId}`,
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });
});

describe("lesson progress and course completion (demo mode)", () => {
  it("derives lesson and course completion from completed lessons", async () => {
    const content = await import("@/lib/data/demo/content");
    const catalog = await content.searchCatalog({ page: 1, pageSize: 50 });
    const summary = catalog.hits[0];
    expect(summary).toBeDefined();
    if (!summary) return;
    const course = await content.getCourse(summary.id);
    await content.enroll(course.id, "completion-user");
    const lessons = course.syllabus.flatMap((section) => section.lessons);
    if (lessons.length === 0) return;

    for (const lesson of lessons) {
      await content.recordProgress({
        courseId: course.id,
        lessonId: lesson.id,
        userId: "completion-user",
        position_seconds: lesson.duration_seconds || 1,
        completed: true,
      });
    }

    const progress = await content.getCourseProgress(course.id, "completion-user");
    expect(progress.enrollment?.status).toBe("completed");
    expect(progress.enrollment?.progress_pct).toBe(100);
    expect(progress.completed_lesson_ids).toHaveLength(lessons.length);
  });

  it("persists demo progress across a simulated page refresh", async () => {
    const values = new Map<string, string>();
    const storageStub = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } as Storage;
    const windowStub = {
      localStorage: storageStub,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    } as unknown as Window & typeof globalThis;
    vi.stubGlobal("window", windowStub);

    const content = await import("@/lib/data/demo/content");
    const catalog = await content.searchCatalog({ page: 1, pageSize: 50 });
    const summary = catalog.hits[0];
    expect(summary).toBeDefined();
    if (!summary) return;
    const course = await content.getCourse(summary.id);
    await content.enroll(course.id, "persist-user");
    const lessons = course.syllabus.flatMap((section) => section.lessons);
    if (lessons.length === 0) return;
    const firstLesson = lessons[0]!;
    await content.recordProgress({
      courseId: course.id,
      lessonId: firstLesson.id,
      userId: "persist-user",
      position_seconds: firstLesson.duration_seconds || 1,
      completed: true,
    });

    // Fresh page load: re-importing the module re-runs store hydration from
    // the persisted localStorage snapshot.
    vi.resetModules();
    const fresh = await import("@/lib/data/demo/content");
    const restored = await fresh.getCourseProgress(course.id, "persist-user");
    expect(restored.enrollment?.status).toBe("active");
    expect(restored.completed_lesson_ids).toEqual([firstLesson.id]);
  });
});
