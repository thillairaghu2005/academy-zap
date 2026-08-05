import { describe, expect, it } from "vitest";

import { searchAll } from "@/lib/api/search";

describe("searchAll", () => {
  it("searches courses, problems, and labs through one result shape", async () => {
    const response = await searchAll("security", 1, 50);
    const kinds = new Set(response.hits.map((hit) => hit.kind));

    expect(response.query).toBe("security");
    expect(response.estimatedTotalHits).toBeGreaterThan(0);
    expect(kinds).toEqual(new Set(["course", "lab"]));
    expect(response.hits.every((hit) => hit.href.startsWith("/"))).toBe(true);
  });

  it("preserves the simulated unified-search outage", async () => {
    await expect(searchAll("boom")).rejects.toMatchObject({
      code: "unified_search_down",
      status: 503,
    });
  });
});
