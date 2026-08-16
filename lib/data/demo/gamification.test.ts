import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const PROGRESS_RESPONSE = {
  context_version: 1,
  user_id: "00000000-0000-4000-8000-000000000001",
  computed_at: "2026-01-01T00:00:00+00:00",
  rank: {
    user_id: "00000000-0000-4000-8000-000000000001",
    level: 1,
    rank_name: "Initiate",
    prestige_tier: 0,
    completion_xp: 400,
    mastery_xp: 0,
    rank_progress_pct: 50,
    percentile_global: 0,
    percentile_cohort: null,
    specialization_tag: null,
  },
  streak: {
    user_id: "00000000-0000-4000-8000-000000000001",
    current_streak_days: 1,
    longest_streak_days: 1,
    freeze_tokens_available: 0,
    momentum_multiplier: 1.05,
    last_active_date: "2026-01-01",
    status: "active",
  },
  league: null,
  guild: null,
  unresolved_flags: [],
  freeze_status: "live",
};

describe("progress-context data boundary", () => {
  it("serves the isolated demo ProgressContext in demo mode", async () => {
    const gamification = await import("@/lib/data/demo/gamification");
    const context = await gamification.getProgressContext("demo-user-001");

    expect(context.rank.rank_name).toBeDefined();
    expect(context.streak).toBeDefined();
    expect(typeof context.rank.completion_xp).toBe("number");
  });

  it("reads the authoritative backend ProgressContext in backend mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(PROGRESS_RESPONSE), { status: 200 }),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const context = await gamification.getProgressContext("ignored-in-backend-mode");

    expect(context.rank.completion_xp).toBe(400);
    expect(context.rank.rank_name).toBe("Initiate");
    expect(context.freeze_status).toBe("live");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/me/progress",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("surfaces a frozen context from the backend verbatim", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...PROGRESS_RESPONSE,
            freeze_status: "frozen_pending_review",
            unresolved_flags: ["integrity_review_pending"],
          }),
          { status: 200 },
        ),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const context = await gamification.getProgressContext("any-user");

    expect(context.freeze_status).toBe("frozen_pending_review");
    expect(context.unresolved_flags).toContain("integrity_review_pending");
  });
});
