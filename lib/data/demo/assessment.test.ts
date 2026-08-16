import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("assessment data boundary", () => {
  it("lists demo assessments and grades MCQ answers deterministically in demo mode", async () => {
    const assessment = await import("@/lib/data/demo/assessment");
    const all = await assessment.listAssessments();
    const target = all.find((item) => item.slug === "cybersecurity-foundations");
    expect(target).toBeDefined();
    if (!target) return;

    const started = await assessment.startAttempt(target.id, "demo-learner", 1);
    expect(started.status).toBe("in_progress");
    expect(started.attempt_number).toBe(1);

    const mcq = target.questions.find((q) => q.type === "mcq");
    if (!mcq || !mcq.options) return;
    // "Which protocol does `ping` use?" — ICMP is option index 2.
    const correct = await assessment.submitAnswer({
      attempt_id: started.attempt_id,
      question_id: mcq.id,
      user_id: "demo-learner",
      type: "mcq",
      answer: { option_index: 2 },
      time_spent_ms: 900,
    });
    const wrong = await assessment.submitAnswer({
      attempt_id: started.attempt_id,
      question_id: mcq.id,
      user_id: "demo-learner",
      type: "mcq",
      answer: { option_index: 0 },
      time_spent_ms: 900,
    });

    expect(correct.correct).toBe(true);
    expect(correct.score).toBe(10);
    expect(wrong).toBeDefined();
  });

  it("finalizes an attempt into an assessment.submitted event with server-derived result", async () => {
    const assessment = await import("@/lib/data/demo/assessment");
    const all = await assessment.listAssessments();
    const target = all.find((item) => item.slug === "linux-operations-quiz");
    expect(target).toBeDefined();
    if (!target) return;

    const started = await assessment.startAttempt(target.id, "finalize-learner", 1);
    // Answer every question (mixed formats — demo grading handles all).
    for (const q of target.questions) {
      const answer =
        q.type === "mcq" && q.options
          ? { option_index: 0 }
          : q.type === "short_answer"
            ? { text: "9" }
            : { source_code: "def dedupe(items):\n    return list(dict.fromkeys(items))\n" };
      await assessment.submitAnswer({
        attempt_id: started.attempt_id,
        question_id: q.id,
        user_id: "finalize-learner",
        type: q.type,
        answer,
        time_spent_ms: 500,
      });
    }

    const event = await assessment.submitAssessment(started.attempt_id);
    expect(event.event_type).toBe("assessment.submitted");
    expect(event.attempt_id).toBe(started.attempt_id);
    expect(event.question_count).toBe(target.questions.length);
    expect(event.total_score).toBeGreaterThan(0);

    const attempt = await assessment.getAttempt(started.attempt_id);
    expect(attempt.status).toBe("submitted");
    expect(attempt.answers.length).toBe(target.questions.length);
  });

  it("rejects finalization before every question is answered", async () => {
    const assessment = await import("@/lib/data/demo/assessment");
    const all = await assessment.listAssessments();
    const target = all[0];
    if (!target) return;
    const started = await assessment.startAttempt(target.id, "partial-learner", 1);

    await expect(assessment.submitAssessment(started.attempt_id)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("persists demo attempts across a simulated page refresh", async () => {
    const values = new Map<string, string>();
    const storageStub = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } as Storage;
    const windowStub = {
      localStorage: storageStub,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    } as unknown as Window & typeof globalThis;
    vi.stubGlobal("window", windowStub);

    const assessment = await import("@/lib/data/demo/assessment");
    const all = await assessment.listAssessments();
    const target = all[0];
    if (!target) return;
    const started = await assessment.startAttempt(target.id, "refresh-learner", 1);
    const attemptId = started.attempt_id;

    // Fresh page load: re-importing the module re-runs store hydration from localStorage.
    vi.resetModules();
    const fresh = await import("@/lib/data/demo/assessment");
    const restored = await fresh.getAttempt(attemptId);

    expect(restored.attempt_id).toBe(attemptId);
    expect(restored.user_id).toBe("refresh-learner");
  });

  it("uses the same API boundary in backend mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })),
    );

    const assessment = await import("@/lib/data/demo/assessment");
    const list = await assessment.listAssessments();

    expect(list).toEqual([]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/assessments",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });
});
