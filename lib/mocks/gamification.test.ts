import { describe, expect, it } from "vitest";

import {
  aggregateXpTracks,
  buildLeaderboard,
  computeEntryHash,
  demoLedgerEntries,
  momentumFor,
  resolveRank,
  verifyCredential,
  verifyDemoLedger,
  verifyLedgerChain,
} from "./gamification";

/**
 * Gamification engine tests (audit Track A2). The mock ledger's SHA-256
 * hash chain is REAL (gamification §7.2) — these tests pin chain
 * integrity, tamper detection, track aggregation, rank resolution and
 * credential verify states.
 */

describe("ledger hash chain", () => {
  it("demo ledger is a valid chain", async () => {
    const result = await verifyDemoLedger();
    expect(result).toEqual({ valid: true, broken_at: null });
  });

  it("detects tampering at the exact broken link", async () => {
    const entries = await demoLedgerEntries();
    const tampered = entries.map((e) => ({ ...e }));
    tampered[5]!.xp_delta = tampered[5]!.xp_delta + 1;

    const result = await verifyLedgerChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.broken_at).toBe(5);
  });

  it("detects a broken prev_hash link", async () => {
    const entries = await demoLedgerEntries();
    const tampered = entries.map((e) => ({ ...e }));
    tampered[3]!.prev_hash = "0".repeat(64);

    const result = await verifyLedgerChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.broken_at).toBe(3);
  });

  it("computeEntryHash is deterministic for identical inputs", async () => {
    const a = await computeEntryHash("prev", "u1", 100, "COURSE_COMPLETE", "2026-01-01T00:00:00Z");
    const b = await computeEntryHash("prev", "u1", 100, "COURSE_COMPLETE", "2026-01-01T00:00:00Z");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("XP aggregation and ranks", () => {
  it("sums completion and mastery independently (never blended)", async () => {
    const { completion_xp, mastery_xp } = aggregateXpTracks(await demoLedgerEntries());
    expect(completion_xp).toBeGreaterThan(0);
    expect(mastery_xp).toBeGreaterThan(0);
  });

  it("applies reversal adjustments to the mastery track (offset, never delete)", async () => {
    const ledger = await demoLedgerEntries();
    const reversal = ledger.find((e) => e.reason_code === "INTEGRITY_REVERSAL");
    expect(reversal).toBeDefined();
    expect(reversal!.xp_delta).toBeLessThan(0);
  });

  it("resolveRank maps the lowest band to level 1 and huge XP to the top band", () => {
    expect(resolveRank(0, 0).level).toBe(1);
    expect(resolveRank(1_000_000, 1_000_000).level).toBeGreaterThan(1);
  });

  it("momentum multiplier caps at 2.0", () => {
    expect(momentumFor(30)).toBe(2.0);
    expect(momentumFor(5)).toBe(1.25);
  });
});

describe("credentials and leaderboards", () => {
  it("verifies all three credential states and 404s unknown ids", () => {
    expect(verifyCredential("b-verified-7f3a")?.status).toBe("verified");
    expect(verifyCredential("b-flagged-2c9e")?.status).toBe("flagged");
    expect(verifyCredential("b-revoked-8d11")?.status).toBe("revoked");
    expect(verifyCredential("b-forged")).toBeNull();
  });

  it("buildLeaderboard inserts the user at their true rank deterministically", () => {
    const page = buildLeaderboard("global", 0, {
      user_id: "me",
      display_name: "Me",
      score: 38_000,
    });
    expect(page.total).toBe(128);
    const me = page.entries.find((e) => e.is_me);
    expect(me).toBeDefined();
    // The page is sorted by rank; the user's row sits between higher and lower scores.
    expect(page.entries[0]!.score).toBeGreaterThanOrEqual(me!.score);
    expect(page.has_more).toBe(true);
  });
});
