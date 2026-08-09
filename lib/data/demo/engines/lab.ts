import type {
  Lab,
  LabSession,
  LabSessionCompletedEvent,
  LabPreviewSession,
  ObjectiveResult,
} from "@/lib/contracts/lab";
import {
  checkObjectiveServerSide,
  enforceHardTimeout,
  MOCK_BOOM_LAB_ID,
  MOCK_LABS,
  MOCK_LABS_BY_ID,
  mockLabSessions,
  nextHintServerSide,
  persistLabSessions,
  type StoredLabSession,
} from "@/lib/mocks/labs";
import { MockDataError } from "@/lib/data/demo/errors";
import { delay, jitter } from "@/lib/data/demo/helpers";
import { recordDemoActivity } from "@/lib/demo/activity";
import { trackDemoEvent } from "@/lib/demo/analytics";

/**
 * Local demo lab service.
 *
 * Signatures mirror the LabEngine Protocol (platform §4.1) exactly:
 *   provision_session(lab_id, user_id) -> LabSession
 *   terminate_session(session_id) -> None
 *   check_objective(session_id, objective_id) -> ObjectiveResult
 *
 * Objective completion is derived SERVER-SIDE from the session store (the
 * terminal bridge writes discovered flags into it; check_objective reads the
 * store back out) — the component never decides an objective is complete.
 * This mirrors §6's "never trust a value the browser sends".
 *
 * Mock rules (deterministic, demoable):
 *  - lab id "missing-lab" → 404 (detail error state)
 *  - lab id "boom"        → 503 on provision (start-lab error state)
 */

export async function listLabs(): Promise<Lab[]> {
  await delay(jitter(280));
  return MOCK_LABS;
}

/**
 * Catalog search — Meilisearch-shaped (the docs pin self-hosted Meilisearch
 * for catalog search, §2.1). Empty query returns the whole catalog.
 * Deterministic demo hook: query "boom" → 503 (search error state).
 */
export async function searchLabs(query: string): Promise<Lab[]> {
  await delay(jitter(240));
  const q = query.trim().toLowerCase();
  if (q === "boom") {
    throw new MockDataError(
      "search_unavailable",
      "Lab search is unavailable (simulated).",
      503,
    );
  }
  if (!q) return MOCK_LABS;
  return MOCK_LABS.filter((lab) =>
    [lab.title, lab.category, lab.description]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export async function getLab(labId: string): Promise<Lab> {
  await delay(jitter(240));
  const lab = MOCK_LABS_BY_ID.get(labId);
  if (!lab) {
    throw new MockDataError(
      "lab_not_found",
      `Lab ${labId} was not found.`,
      404,
    );
  }
  return lab;
}

/** Provisions a session — the mock's version of the K8s microVM spin-up. */
export async function provisionSession(
  labId: string,
  userId: string,
): Promise<LabSession> {
  await delay(jitter(260));
  // Boom check first: "boom" is a demo id, not a real lab, so the 503 must
  // win over the 404 lookup (same ordering as the judge's submit hook).
  if (labId === MOCK_BOOM_LAB_ID) {
    throw new MockDataError(
      "lab_orchestrator_down",
      "Lab orchestrator unreachable (simulated).",
      503,
    );
  }
  const lab = MOCK_LABS_BY_ID.get(labId);
  if (!lab) {
    throw new MockDataError("lab_not_found", "Lab was not found.", 404);
  }
  if (!userId) {
    throw new MockDataError("demo_session_required", "Sign in to start a lab.", 401);
  }

  const sessionId = `lab-${crypto.randomUUID()}`;
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + lab.hard_timeout_minutes * 60_000,
  );
  const session: LabSession = {
    session_id: sessionId,
    lab_id: lab.id,
    user_id: userId,
    status: "provisioning",
    provisioned_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    objectives_completed: [],
    checks: [],
    hints_used: 0,
    terminal_url: `ws://mock.zapsters.dev/labs/${sessionId}/tty`,
    ended_at: null,
  };

  mockLabSessions.set(sessionId, {
    ...session,
    discovered: new Set(),
  });
  persistLabSessions();
  recordDemoActivity("lab_started", `${lab.title} started`, {
    lab_id: lab.id,
  });
  trackDemoEvent("lab_started", { lab_id: lab.id });

  // Simulated provision → running transition (microVM boot).
  const readyAt = Date.now() + 1200 + Math.floor(Math.random() * 900);
  setTimeout(() => {
    const stored = mockLabSessions.get(sessionId);
    if (stored && stored.status === "provisioning") {
      stored.status = "running";
    }
  }, readyAt - Date.now());

  return session;
}

/** Creates a short-lived guest terminal; it cannot be completed or saved. */
export async function provisionPreviewSession(
  labId: string,
): Promise<LabPreviewSession> {
  const session = await provisionSession(labId, "guest-preview");
  return {
    session_id: session.session_id,
    lab_id: session.lab_id,
    status: "running",
    expires_at: session.expires_at,
    terminal_url: session.terminal_url,
    read_only: true,
  };
}

export async function getSession(
  sessionId: string,
  userId?: string,
): Promise<LabSession> {
  await delay(jitter(180));
  const session = mockLabSessions.get(sessionId);
  if (!session) {
    throw new MockDataError(
      "session_not_found",
      "Lab session was not found or expired.",
      404,
    );
  }
  assertSessionOwner(session, userId);
  // Server-side hard-timeout enforcement (§6.6): a late poll flips the status
  // exactly like the real Arq timeout job would. The client never decides.
  enforceHardTimeout(session);
  return toPublic(session);
}

/** Terminates a session — the mock's version of the namespace teardown. */
export async function terminateSession(
  sessionId: string,
  userId?: string,
): Promise<void> {
  await delay(jitter(200));
  const session = mockLabSessions.get(sessionId);
  if (!session) {
    throw new MockDataError(
      "session_not_found",
      "Lab session was not found or expired.",
      404,
    );
  }
  assertSessionOwner(session, userId);
  session.status = "terminated";
  session.ended_at = new Date().toISOString();
  persistLabSessions();
}

/** Server-side objective check (the "scoped read against session state"). */
export async function checkObjective(
  sessionId: string,
  objectiveId: string,
  userId?: string,
): Promise<ObjectiveResult> {
  await delay(jitter(160));
  const session = mockLabSessions.get(sessionId);
  if (!session) {
    throw new MockDataError(
      "session_not_found",
      "Lab session was not found or expired.",
      404,
    );
  }
  assertSessionOwner(session, userId);
  enforceHardTimeout(session);
  return checkObjectiveServerSide(session, objectiveId);
}

/** Request the next hint — shared derivation with the terminal simulation. */
export async function requestHint(
  sessionId: string,
  userId?: string,
): Promise<string> {
  await delay(jitter(160));
  const session = mockLabSessions.get(sessionId);
  if (!session) {
    throw new MockDataError(
      "session_not_found",
      "Lab session was not found or expired.",
      404,
    );
  }
  assertSessionOwner(session, userId);
  enforceHardTimeout(session);
  return nextHintServerSide(session);
}

/**
 * Completes the session — emits the lab.session_completed event shape
 * (§4.3). Only allowed when every objective is verified.
 */
export async function completeSession(
  sessionId: string,
  userId?: string,
): Promise<LabSessionCompletedEvent> {
  await delay(jitter(200));
  const session = mockLabSessions.get(sessionId);
  if (!session) {
    throw new MockDataError(
      "session_not_found",
      "Lab session was not found or expired.",
      404,
    );
  }
  assertSessionOwner(session, userId);
  const lab = MOCK_LABS_BY_ID.get(session.lab_id);
  const all = lab?.objectives.every((o) =>
    session.discovered.has(o.id),
  );
  if (!all) {
    throw new MockDataError(
      "objectives_incomplete",
      "Complete every objective before ending the session.",
      409,
    );
  }
  session.status = "completed";
  session.ended_at = new Date().toISOString();
  persistLabSessions();
  recordDemoActivity("lab_completed", `${lab?.title ?? "Lab"} completed`, {
    lab_id: session.lab_id,
    objectives: session.objectives_completed.length,
  });
  return {
    event_type: "lab.session_completed",
    lab_id: session.lab_id,
    session_id: session.session_id,
    objectives_completed: [...session.discovered],
    time_taken_seconds: Math.max(
      0,
      Math.round(
        (new Date(session.ended_at).getTime() -
          new Date(session.provisioned_at).getTime()) /
          1000,
      ),
    ),
    hints_used: session.hints_used,
  };
}

/** The public LabSession view — strips the internal simulation flag set. */
function toPublic(session: StoredLabSession): LabSession {
  const publicSession: LabSession = {
    session_id: session.session_id,
    lab_id: session.lab_id,
    user_id: session.user_id,
    status: session.status,
    provisioned_at: session.provisioned_at,
    expires_at: session.expires_at,
    objectives_completed: session.objectives_completed,
    checks: session.checks,
    hints_used: session.hints_used,
    terminal_url: session.terminal_url,
    ended_at: session.ended_at,
  };
  return publicSession;
}

function assertSessionOwner(
  session: StoredLabSession,
  userId: string | undefined,
): void {
  if (userId && session.user_id !== userId) {
    throw new MockDataError(
      "session_not_found",
      "Lab session was not found or expired.",
      404,
    );
  }
}
