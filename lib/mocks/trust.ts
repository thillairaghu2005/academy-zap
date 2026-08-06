import type { TrustSnapshot } from "@/lib/contracts/trust";

export const MOCK_TRUST_SNAPSHOT: TrustSnapshot = {
  signals: [
    { id: "curriculum", kind: "verified", label: "Industry-designed curriculum", detail: "Reviewed against working security and engineering practices." },
    { id: "freshness", kind: "freshness", label: "Updated recently", detail: "Course content reviewed in July 2026." },
    { id: "community", kind: "community", label: "Community rated", detail: "Learners rate this path 4.8 out of 5." },
  ],
  metrics: [
    { label: "Learners", value: "42,680" },
    { label: "Course completions", value: "18,940" },
    { label: "Average completion", value: "8.5 hours" },
    { label: "Placement signal", value: "78% report a role or project win" },
  ],
  partner_labels: ["Northstar Security", "Orbit Systems", "Cobalt Ridge Labs"],
};
