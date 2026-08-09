import type { Course } from "@/lib/contracts/content";
import { idbCacheCourse, idbListCachedCourses, idbReadCourse, idbRemoveCourse } from "@/lib/demo/idb";

const COURSE_CACHE = "zapsters-course-content-v1";

function courseRequest(courseId: string): Request {
  return new Request(`/__zapsters/offline/courses/${encodeURIComponent(courseId)}`);
}

/**
 * Cache the current course contract for offline syllabus/article metadata.
 *
 * Writes to BOTH storage layers so the offline read is resilient:
 *  - Cache Storage (sw.js network fallback) for the service-worker path.
 *  - IndexedDB mirror (lib/demo/idb.ts) for the client-side read path, which
 *    survives even when the cache API is unavailable (private browsing).
 */
export async function cacheCourseForOffline(course: Course): Promise<void> {
  const cachedAt = new Date().toISOString();

  await idbCacheCourse(course.id, course);

  if (typeof window !== "undefined" && "caches" in window) {
    const cache = await window.caches.open(COURSE_CACHE);
    await cache.put(
      courseRequest(course.id),
      new Response(JSON.stringify({ course, cached_at: cachedAt }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
}

export async function isCourseCached(courseId: string): Promise<boolean> {
  const idbRecord = await idbReadCourse(courseId);
  if (idbRecord) return true;

  if (typeof window === "undefined" || !("caches" in window)) return false;
  const cache = await window.caches.open(COURSE_CACHE);
  return Boolean(await cache.match(courseRequest(courseId)));
}

/**
 * Client-side offline read: returns the cached course payload with its cache
 * timestamp, or null when the course was never saved. Used by the offline
 * course page and the player's "saved offline" state.
 */
export async function getCachedCourseOffline(
  courseId: string,
): Promise<{ course: Course; cached_at: string } | null> {
  const idbRecord = await idbReadCourse(courseId);
  if (idbRecord?.payload && typeof idbRecord.payload === "object") {
    return {
      course: idbRecord.payload as Course,
      cached_at: idbRecord.cached_at,
    };
  }

  if (typeof window === "undefined" || !("caches" in window)) return null;
  const cache = await window.caches.open(COURSE_CACHE);
  const response = await cache.match(courseRequest(courseId));
  if (!response) return null;
  const body = (await response.json()) as {
    course: Course;
    cached_at: string;
  };
  return body;
}

/** Metadata list of every course saved offline (for the offline index). */
export async function listCachedCoursesOffline(): Promise<
  { course_id: string; cached_at: string }[]
> {
  return idbListCachedCourses();
}

/** Remove one course from the offline caches. */
export async function removeCachedCourseOffline(courseId: string): Promise<void> {
  await idbRemoveCourse(courseId);
  if (typeof window === "undefined" || !("caches" in window)) return;
  const cache = await window.caches.open(COURSE_CACHE);
  await cache.delete(courseRequest(courseId));
}
