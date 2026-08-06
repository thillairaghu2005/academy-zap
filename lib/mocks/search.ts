import type { UnifiedSearchHit } from "@/lib/contracts/search";
import { MOCK_ASSESSMENTS } from "@/lib/mocks/assessment";
import { MOCK_MENTORS } from "@/lib/mocks/mentors";

/** Supplemental search projections for surfaces without catalog documents. */
export const MOCK_SEARCH_SURFACE_HITS: UnifiedSearchHit[] = [
  ...MOCK_ASSESSMENTS.map((assessment) => ({
    id: assessment.id,
    kind: "assessment" as const,
    title: assessment.title,
    description: assessment.description,
    href: `/assessments/${assessment.id}`,
    meta: `Assessment - ${assessment.category} - ${assessment.estimated_minutes} min`,
  })),
  ...MOCK_MENTORS.map((mentor) => ({
    id: mentor.id,
    kind: "mentor" as const,
    title: mentor.name,
    description: mentor.bio,
    href: `/mentors/${mentor.id}`,
    meta: `Mentor - ${mentor.role} - ${mentor.skill_tags.join(", ")}`,
  })),
];
