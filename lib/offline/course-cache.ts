import type { Course } from "@/lib/contracts/content";

const COURSE_CACHE = "zapsters-course-content-v1";

function courseRequest(courseId: string): Request {
  return new Request(`/__zapsters/offline/courses/${encodeURIComponent(courseId)}`);
}

/** Cache the current course contract for offline syllabus/article metadata. */
export async function cacheCourseForOffline(course: Course): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Offline storage is not available in this browser.");
  }

  const cache = await window.caches.open(COURSE_CACHE);
  await cache.put(
    courseRequest(course.id),
    new Response(JSON.stringify({ course, cached_at: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export async function isCourseCached(courseId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  const cache = await window.caches.open(COURSE_CACHE);
  return Boolean(await cache.match(courseRequest(courseId)));
}
