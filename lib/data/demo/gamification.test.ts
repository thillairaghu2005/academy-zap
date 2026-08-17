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

  it("serves the frozen demo fixture with its freeze flag and dual XP intact", async () => {
    const gamification = await import("@/lib/data/demo/gamification");
    const context = await gamification.getProgressContext("frozen-demo");

    expect(context.freeze_status).toBe("frozen_pending_review");
    expect(context.unresolved_flags).toContain("integrity_review_pending");
    // Freeze never converts or hides private XP — the fixture's tracks stay intact.
    expect(typeof context.rank.completion_xp).toBe("number");
    expect(typeof context.rank.mastery_xp).toBe("number");
  });

  it("rejects the empty-state demo user with a 404 user_not_found", async () => {
    const gamification = await import("@/lib/data/demo/gamification");
    await expect(gamification.getProgressContext("missing-user")).rejects.toMatchObject({
      code: "user_not_found",
      status: 404,
    });
  });

  it("rejects the error-state demo user with a 503 gamification_down", async () => {
    const gamification = await import("@/lib/data/demo/gamification");
    await expect(gamification.getProgressContext("boom")).rejects.toMatchObject({
      code: "gamification_down",
      status: 503,
    });
  });

  it("derives streak status from the demo service (never client math)", async () => {
    const gamification = await import("@/lib/data/demo/gamification");
    const context = await gamification.getProgressContext("demo-user-001");

    expect(context.streak.status).toBe("active");
    expect(context.streak.current_streak_days).toBeGreaterThan(0);
    expect(context.streak.longest_streak_days).toBeGreaterThanOrEqual(
      context.streak.current_streak_days,
    );
    expect(context.streak.momentum_multiplier).toBeGreaterThanOrEqual(1);
  });
});

const LEADERBOARD_RESPONSE = {
  scope: "global",
  offset: 0,
  total: 1,
  entries: [
    {
      rank: 1,
      user_id: "00000000-0000-4000-8000-000000000001",
      display_name: "Demo Zapster",
      avatar_url: null,
      score: 300,
      level: 1,
      rank_name: "Initiate",
      prestige_tier: 0,
      is_me: true,
    },
  ],
  has_more: false,
};

describe("leaderboard data boundary", () => {
  it("serves the isolated demo leaderboard projection in demo mode", async () => {
    const gamification = await import("@/lib/data/demo/gamification");
    const page = await gamification.getLeaderboard("global", 0, "demo-user-001", "Demo Zapster");

    expect(page.scope).toBe("global");
    expect(Array.isArray(page.entries)).toBe(true);
    expect(typeof page.total).toBe("number");
  });

  it("reads the authoritative leaderboard page in backend mode — no local sorting", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(LEADERBOARD_RESPONSE), { status: 200 }),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const page = await gamification.getLeaderboard("global", 0, "ignored", "Ignored");

    expect(page.entries).toEqual(LEADERBOARD_RESPONSE.entries);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/leaderboards/global?offset=0&limit=10",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("reads the server-derived standing in backend mode (null when unranked)", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const standing = await gamification.getMyStanding("global", "ignored", "Ignored");

    expect(standing).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/leaderboards/global/me",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("reads the public preview from the same server read model in backend mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(LEADERBOARD_RESPONSE), { status: 200 }),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const page = await gamification.getPublicLeaderboardPreview();

    expect(page.scope).toBe("global");
    expect(page.entries[0]?.rank_name).toBe("Initiate");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/leaderboards/global?offset=0&limit=5",
      expect.anything(),
    );
  });
});
