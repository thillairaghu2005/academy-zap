"use client";

import * as React from "react";
import { ProblemDetailClient } from "@/components/judge/problem-detail-client";

const CHALLENGE_ID_MAP: Record<string, string> = {
  "chal-1": "p-reverse-linked-list",
  "chal-2": "p-two-sum",
  "chal-3": "p-max-subarray",
};

/**
 * Challenge IDE wrapper.
 * Delegates execution, Monaco editor mounting, and grading to the authentic
 * judge client to ensure deterministic testing without simulated mock delays.
 */
export function ChallengeIDE({ id }: { id: string }) {
  const resolvedId = CHALLENGE_ID_MAP[id] ?? id;
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <ProblemDetailClient problemId={resolvedId} />
    </div>
  );
}
