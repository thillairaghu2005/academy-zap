import { z } from "zod";

import { apiRequest } from "@/lib/api/client";
import type { UnifiedSearchResponse } from "@/lib/contracts/search";
import { DEMO_MODE } from "@/lib/config";
import { searchAll as searchDemo } from "@/lib/data/demo/search";

const unifiedSearchResponseSchema: z.ZodType<UnifiedSearchResponse> = z.object({
  hits: z.array(z.object({
    id: z.string(),
    kind: z.enum(["course", "problem", "lab", "assessment", "mentor"]),
    title: z.string(),
    description: z.string(),
    href: z.string(),
    meta: z.string(),
  })),
  query: z.string(),
  processingTimeMs: z.number(),
  limit: z.number(),
  offset: z.number(),
  estimatedTotalHits: z.number(),
});

/** Search uses fixture data only when demo mode is explicitly enabled. */
export function searchAll(query = ""): Promise<UnifiedSearchResponse> {
  if (DEMO_MODE) return searchDemo(query);
  return apiRequest(
    `/search?q=${encodeURIComponent(query)}`,
    unifiedSearchResponseSchema,
  );
}
