import type { UnifiedSearchHit } from "@/lib/contracts/search";
import { MOCK_MENTORS } from "@/lib/mocks/mentors";

/** Supplemental search projections for surfaces without catalog documents. */
export const MOCK_SEARCH_SURFACE_HITS: UnifiedSearchHit[] = [
  {
    id: "assess-cyber-foundations",
    kind: "assessment",
    title: "Cybersecurity Foundations Check",
    description: "A mixed-format checkpoint over cybersecurity fundamentals.",
    href: "/assessments/assess-cyber-foundations",
    meta: "Assessment - Core Knowledge - 15 min",
  },
  {
    id: "assess-linux-ops",
    kind: "assessment",
    title: "Linux Operations Quiz",
    description: "A short assessment on Linux operations and shell fundamentals.",
    href: "/assessments/assess-linux-ops",
    meta: "Assessment - Operating Systems - 8 min",
  },
  {
    id: "assess-web-security",
    kind: "assessment",
    title: "Web Security Essentials",
    description: "A mixed assessment on web application security.",
    href: "/assessments/assess-web-security",
    meta: "Assessment - Web Application Security - 20 min",
  },
  ...MOCK_MENTORS.map((mentor) => ({
    id: mentor.id,
    kind: "mentor" as const,
    title: mentor.name,
    description: mentor.bio,
    href: `/mentors/${mentor.id}`,
    meta: `Mentor - ${mentor.role} - ${mentor.skill_tags.join(", ")}`,
  })),
];
