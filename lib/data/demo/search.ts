import type { UnifiedSearchHit, UnifiedSearchResponse } from "@/lib/contracts/search";
import { MockDataError } from "./errors";
import { delay, jitter } from "./helpers";
import { MOCK_COURSES } from "@/lib/mocks/courses";
import { MOCK_PROBLEMS } from "@/lib/mocks/judge";
import { MOCK_LABS } from "@/lib/mocks/labs";
import { MOCK_SEARCH_SURFACE_HITS } from "@/lib/mocks/search";

export async function searchAll(
  query = "",
  page = 1,
  pageSize = 8,
): Promise<UnifiedSearchResponse> {
  const started = Date.now();
  await delay(jitter(160));
  const normalized = query.trim().toLowerCase();
  if (normalized === "boom") {
    throw new MockDataError(
      "unified_search_down",
      "Unified search is unavailable (simulated).",
      503,
    );
  }

  const hits: UnifiedSearchHit[] = [
    ...MOCK_COURSES.filter((course) => course.status === "published").map((course) => ({
      id: course.id,
      kind: "course" as const,
      title: course.title,
      description: course.subtitle,
      href: `/courses/${course.id}`,
      meta: `${course.category} · ${course.level}`,
    })),
    ...MOCK_PROBLEMS.map((problem) => ({
      id: problem.id,
      kind: "problem" as const,
      title: problem.title,
      description: problem.statement,
      href: `/judge/${problem.id}`,
      meta: `Problem · ${problem.difficulty}`,
    })),
    ...MOCK_LABS.map((lab) => ({
      id: lab.id,
      kind: "lab" as const,
      title: lab.title,
      description: lab.description,
      href: `/labs/${lab.id}`,
      meta: `Lab · ${lab.category} · ${lab.difficulty}`,
    })),
    ...MOCK_SEARCH_SURFACE_HITS,
  ].filter((hit) =>
    normalized
      ? `${hit.title} ${hit.description} ${hit.meta}`.toLowerCase().includes(normalized)
      : true,
  );

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const offset = (safePage - 1) * safePageSize;
  return {
    hits: hits.slice(offset, offset + safePageSize),
    query,
    processingTimeMs: Math.max(1, Date.now() - started + 6),
    limit: safePageSize,
    offset,
    estimatedTotalHits: hits.length,
  };
}
