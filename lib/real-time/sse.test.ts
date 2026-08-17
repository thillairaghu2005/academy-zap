import { describe, expect, it } from "vitest";

import { invalidationsFor, parseEventData } from "@/lib/real-time/sse";

describe("sse parseEventData", () => {
  it("parses a progress.updated payload", () => {
    const update = parseEventData('{"type":"progress.updated"}');
    expect(update?.type).toBe("progress.updated");
  });

  it("parses a leaderboard.updated payload with scope", () => {
    const update = parseEventData('{"type":"leaderboard.updated","scope":"global"}');
    expect(update?.type).toBe("leaderboard.updated");
    expect(update?.scope).toBe("global");
  });

  it("rejects malformed JSON", () => {
    expect(parseEventData("not-json{{")).toBeNull();
  });

  it("rejects non-object payloads", () => {
    expect(parseEventData('"just a string"')).toBeNull();
    expect(parseEventData("42")).toBeNull();
  });
});

describe("sse invalidationsFor", () => {
  it("progress.updated invalidates only the progression query", () => {
    expect(invalidationsFor("progress.updated")).toEqual([["progress-context"]]);
  });

  it("leaderboard.updated invalidates the board queries but not progression", () => {
    expect(invalidationsFor("leaderboard.updated")).toEqual([
      ["leaderboard"],
      ["my-standing"],
      ["public-leaderboard-preview"],
    ]);
  });

  it("badges.updated invalidates the badge wall query only", () => {
    expect(invalidationsFor("badges.updated")).toEqual([["badges"]]);
  });

  it("connected and unknown events refresh all authoritative surfaces (idempotent)", () => {
    for (const type of ["connected", "update"] as const) {
      const keys = invalidationsFor(type);
      expect(keys).toContainEqual(["progress-context"]);
      expect(keys).toContainEqual(["leaderboard"]);
      expect(keys).toContainEqual(["my-standing"]);
      expect(keys).toContainEqual(["public-leaderboard-preview"]);
      expect(keys).toContainEqual(["badges"]);
    }
  });
});
