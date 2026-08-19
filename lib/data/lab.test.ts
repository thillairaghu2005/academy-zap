import { afterEach, describe, expect, it, vi } from "vitest";

import { clearAccessToken } from "@/lib/api/client";
import {
  completeLab,
  createCheckpoint,
  executeCell,
  getLab,
  getProgress,
  listLabs,
  saveProgress,
  searchLabs,
} from "@/lib/data/lab";

const LAB_UUID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000001";
const OBJECTIVE_UUID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000010";
const SECTION_UUID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000020";
const MARKDOWN_UUID = "3b3b3b3b-3b3b-4b3b-8b3f-000000000000";
const CODE_UUID = "3b3b3b3b-3b3b-4b3b-8b3f-000000000001";
const PROGRESS_UUID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000002";
const USER_UUID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000003";
const EXECUTION_UUID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000004";
const CHECKPOINT_UUID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000005";

const labDetail = {
  id: LAB_UUID,
  slug: "intro-to-python",
  title: "Intro to Python",
  category: "Programming",
  difficulty: "beginner",
  description: "Write and run your first Python programs.",
  estimated_minutes: 45,
  success_rate_pct: 0,
  requires_gui: false,
  hard_timeout_minutes: 90,
  objectives: [
    {
      id: OBJECTIVE_UUID,
      title: "Run a Python script",
      description: "Execute a Python cell that prints to stdout.",
      hints: [],
      requires_terminal: false,
    },
  ],
  notebook: {
    version: 1,
    sections: [
      {
        id: SECTION_UUID,
        title: "Getting started",
        position: 0,
        cells: [
          {
            id: MARKDOWN_UUID,
            cell_type: "markdown",
            content: "# Welcome",
            position: 0,
          },
          {
            id: CODE_UUID,
            cell_type: "code",
            content: 'print("hello")',
            position: 1,
          },
        ],
      },
    ],
  },
};

const progress = {
  progress_id: PROGRESS_UUID,
  lab_id: LAB_UUID,
  version: 1,
  user_id: USER_UUID,
  status: "in_progress",
  code: { [CODE_UUID]: 'print("hello")' },
  outputs: {
    [CODE_UUID]: {
      execution_id: null,
      status: "not_run",
      stdout: null,
      stderr: null,
      exit_code: null,
      runtime_ms: null,
      memory_kb: null,
      error: null,
      executed_at: null,
      updated_at: null,
    },
  },
  hints_used: 0,
  started_at: "2026-08-18T10:00:00Z",
  updated_at: "2026-08-18T10:00:00Z",
  completed_at: null,
};

describe("real lab API client (B6)", () => {
  afterEach(() => {
    clearAccessToken();
    vi.restoreAllMocks();
  });

  it("resolves a lab by slug and parses the published notebook manifest", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(labDetail), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const lab = await getLab("intro-to-python");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:8000/api/v1/labs/intro-to-python",
    );
    expect(lab.slug).toBe("intro-to-python");
    expect(lab.notebook?.version).toBe(1);
    expect(lab.notebook?.sections[0]?.cells).toHaveLength(2);
  });

  it("accepts a notebook-less lab (notebook: null)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...labDetail, notebook: null }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const lab = await getLab(LAB_UUID);
    expect(lab.notebook).toBeNull();
  });

  it("lists labs and filters the catalog by search term client-side", async () => {
    const other = {
      ...labDetail,
      id: "3b3b3b3b-3b3b-4b3b-8b3b-000000000099",
      slug: "python-pandas",
      title: "Pandas basics",
      category: "Data",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([labDetail, other]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([labDetail, other]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([labDetail, other]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const all = await listLabs();
    expect(all).toHaveLength(2);

    const matches = await searchLabs("pandas");
    expect(matches.map((l) => l.slug)).toEqual(["python-pandas"]);

    const none = await searchLabs("zzzz");
    expect(none).toHaveLength(0);
  });

  it("reads progress and PUTs a debounced autosave merge", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(progress), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ progress_id: PROGRESS_UUID, updated_at: "2026-08-18T10:05:00Z" }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const loaded = await getProgress("intro-to-python");
    expect(loaded.code[CODE_UUID]).toBe('print("hello")');
    expect(loaded.outputs[CODE_UUID]?.status).toBe("not_run");

    const saved = await saveProgress("intro-to-python", { [CODE_UUID]: 'print("hi")' });
    expect(saved.progress_id).toBe(PROGRESS_UUID);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://127.0.0.1:8000/api/v1/labs/intro-to-python/progress",
    );
    const put = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(put?.method).toBe("PUT");
    expect(JSON.parse(String(put?.body))).toEqual({
      code: { [CODE_UUID]: 'print("hi")' },
    });
  });

  it("enqueues a cell run and parses the 202 handle", async () => {
    const accepted = {
      execution_id: EXECUTION_UUID,
      cell_id: CODE_UUID,
      status: "queued",
      received_at: "2026-08-18T10:10:00Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(accepted), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeCell("intro-to-python", CODE_UUID, 'print("hello")');
    expect(result.status).toBe("queued");
    expect(result.execution_id).toBe(EXECUTION_UUID);
    const post = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(post?.body))).toEqual({
      cell_id: CODE_UUID,
      code: 'print("hello")',
    });
  });

  it("creates a checkpoint and completes the lab once cells pass", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ checkpoint_id: CHECKPOINT_UUID, created_at: "2026-08-18T10:15:00Z" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            lab_id: LAB_UUID,
            session_id: PROGRESS_UUID,
            objectives_completed: [OBJECTIVE_UUID],
            time_taken_seconds: 540,
            hints_used: 0,
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const checkpoint = await createCheckpoint("intro-to-python", "before part 2");
    expect(checkpoint.checkpoint_id).toBe(CHECKPOINT_UUID);

    const completed = await completeLab("intro-to-python");
    expect(completed.objectives_completed).toEqual([OBJECTIVE_UUID]);
    expect(completed.session_id).toBe(PROGRESS_UUID);
  });

  it("rejects with a 409 detail when completion is gated on unfinished cells", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({ detail: "Every code cell must run successfully before the lab can be completed." }),
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(completeLab("intro-to-python")).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("Every code cell"),
    });
  });
});