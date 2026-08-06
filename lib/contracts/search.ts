/**
 * Unified search contract for the shell command palette.
 *
 * The response keeps the pagination and timing fields used by the catalog's
 * Meilisearch-shaped response while allowing other learning surfaces to
 * participate without inventing a second result format.
 */

export type UnifiedSearchKind =
  | "course"
  | "problem"
  | "lab"
  | "assessment"
  | "mentor";

export interface UnifiedSearchHit {
  id: string;
  kind: UnifiedSearchKind;
  title: string;
  description: string;
  href: string;
  meta: string;
}

export interface UnifiedSearchResponse {
  hits: UnifiedSearchHit[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
}
