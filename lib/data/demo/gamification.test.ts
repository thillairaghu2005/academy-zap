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

const BADGES_RESPONSE = [
  {
    badge_id: "course_complete",
    name: "Course Conqueror",
    description: "Completed a full course.",
    credential_id: "b-verified-7f3a",
    verify_url: "/rank/verify/b-verified-7f3a",
    earned_at: "2026-01-02T00:00:00+00:00",
    status: "verified",
    category: "foundations",
  },
];

const VERIFY_RESPONSE = {
  credential_id: "b-verified-7f3a",
  badge_name: "Course Conqueror",
  issuer: "Zapsters",
  subject: {
    user_id: "00000000-0000-4000-8000-000000000001",
    display_name: "Demo Zapster",
  },
  claim: {
    category: "foundations",
    earned_at: "2026-01-02T00:00:00+00:00",
    level: 1,
    rank_name: "Initiate",
  },
  signature: "ab12cd34ef56",
  status: "verified",
  note: "Signature valid — backed by an intact Zapsters ledger.",
};

describe("badge + credential data boundary", () => {
  it("serves the isolated demo badge wall in demo mode", async () => {
    const gamification = await import("@/lib/data/demo/gamification");
    const badges = await gamification.getBadges("demo-user-001");

    expect(Array.isArray(badges)).toBe(true);
    expect(badges[0]?.verify_url).toContain("/rank/verify/");
  });

  it("reads the authoritative badge wall in backend mode — no local eligibility", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(BADGES_RESPONSE), { status: 200 }),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const badges = await gamification.getBadges("ignored-in-backend-mode");

    expect(badges).toEqual(BADGES_RESPONSE);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/me/badges",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("re-verifies through the public read-only endpoint in backend mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(VERIFY_RESPONSE), { status: 200 }),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const result = await gamification.verifyBadge("b-verified-7f3a");

    expect(result.status).toBe("verified");
    expect(result.issuer).toBe("Zapsters");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/verify/b-verified-7f3a",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });
});

const SEASON_RESPONSE = {
  status: "active",
  season: {
    id: "a3f1c2e8-9b0d-4f6a-8e2c-1d5b7a9f3c21",
    name: "Season 3 — Null Pointer",
    status: "active",
    start_at: "2026-07-27T00:00:00+00:00",
    end_at: "2026-08-24T00:00:00+00:00",
  },
};

const LEAGUE_STANDING_RESPONSE = {
  user_id: "00000000-0000-4000-8000-000000000001",
  season_id: "a3f1c2e8-9b0d-4f6a-8e2c-1d5b7a9f3c21",
  league_tier: "gold",
  rank_in_league: 42,
  xp_this_season: 4710,
  promotion_zone: true,
  relegation_zone: false,
};

const LEAGUE_BOARD_RESPONSE = {
  season_id: "a3f1c2e8-9b0d-4f6a-8e2c-1d5b7a9f3c21",
  tier: "gold",
  offset: 0,
  total: 48,
  entries: [
    {
      rank: 1,
      user_id: "00000000-0000-4000-8000-000000000002",
      display_name: "Zara Khan",
      avatar_url: null,
      xp_this_season: 5120,
      is_me: false,
    },
  ],
  has_more: true,
};

describe("league + season data boundary (slice 09)", () => {
  it("serves the isolated demo season fixture in demo mode", async () => {
    const gamification = await import("@/lib/data/demo/gamification");
    const season = await gamification.getCurrentSeason();

    expect(season?.status).toBe("active");
    expect(season?.name).toBeTruthy();
  });

  it("reads the authoritative active season in backend mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(SEASON_RESPONSE), { status: 200 }),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const season = await gamification.getCurrentSeason();

    expect(season?.id).toBe(SEASON_RESPONSE.season.id);
    expect(season?.name).toBe("Season 3 — Null Pointer");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/seasons/current",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("returns null season when the backend has no season", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "none", season: null }), { status: 200 }),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    expect(await gamification.getCurrentSeason()).toBeNull();
  });

  it("reads the authoritative league standing in backend mode — no local rank math", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(LEAGUE_STANDING_RESPONSE), { status: 200 }),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const standing = await gamification.getLeagueStanding("ignored-in-backend-mode");

    expect(standing?.league_tier).toBe("gold");
    expect(standing?.xp_this_season).toBe(4710);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/me/league",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("returns null standing when the backend has none", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(null), { status: 200 })),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    expect(await gamification.getLeagueStanding("ignored")).toBeNull();
  });

  it("reads the server-derived tier board in backend mode — no local ordering", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(LEAGUE_BOARD_RESPONSE), { status: 200 }),
      ),
    );

    const gamification = await import("@/lib/data/demo/gamification");
    const board = await gamification.getMyLeagueBoard(0, 10, "ignored", "Ignored");

    expect(board.entries).toEqual(LEAGUE_BOARD_RESPONSE.entries);
    expect(board.tier).toBe("gold");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/me/league/leaderboard?offset=0&limit=10",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });
});
