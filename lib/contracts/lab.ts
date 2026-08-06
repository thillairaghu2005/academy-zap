/**
 * Lab Engine contracts (platform doc §2.5, §4.1, §4.3, §6).
 *
 * Locked by the docs:
 *  - LabEngine Protocol (§4.1): provision_session(lab_id, user_id) ->
 *    LabSession; terminate_session(session_id); check_objective(session_id,
 *    objective_id) -> ObjectiveResult. Objective verification is ALWAYS
 *    server-side — a scoped read against the session's real state, never a
 *    value the browser claims (§6 "why objective-checking never trusts
 *    client input").
 *  - LabSessionCompletedEvent (§4.3): lab_id, session_id,
 *    objectives_completed, time_taken_seconds, hints_used. Verbatim.
 *  - Session lifecycle (§6): provision on start → hard timeout (default
 *    60–120 min) → destroy. ttyd WebSocket bridge for the shell; Guacamole
 *    for GUI-required labs. `labs` / `lab_sessions` / `lab_objectives` tables.
 *
 * NOT locked by the docs (reasonable decisions, logged in index.ts):
 *  - full `Lab` / `LabObjective` / `LabSession` field lists (the tables are
 *    referenced, not schematized). Field choices mirror the TryHackMe-shaped
 *    surface the docs describe (objectives, difficulty, estimated time,
 *    hints, GUI requirement).
 *  - Session status literals beyond the doc's lifecycle narrative
 *    (provisioning / running / completed / timed_out / terminated).
 *  - `terminal_url` on LabSession stands in for the real ttyd endpoint the
 *    frontend connects to; in mock mode it is informational only (the mock
 *    socket never performs a real network handshake).
 */

export type LabDifficulty = "beginner" | "intermediate" | "advanced";

export type LabSessionStatus =
  | "provisioning"
  | "running"
  | "completed"
  | "timed_out"
  | "terminated";

/**
 * One objective from the lab manifest (e.g. "find flag in /root/flag.txt").
 * Completion is derived server-side — see LabEngine.check_objective.
 */
export interface LabObjective {
  id: string;
  title: string;
  description: string;
  /** Hints shown on demand (hint ladder). */
  hints: string[];
  /** Manually checkable in the UI only when no terminal can derive it. */
  requires_terminal: boolean;
}

/** A lab as authored (manifest → catalog entry). */
export interface Lab {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: LabDifficulty;
  description: string;
  estimated_minutes: number;
  /** Historical completion percentage from the Lab projection. */
  success_rate_pct: number;
  /** GUI-required labs get a Guacamole viewer stub (no real RDP/VNC yet). */
  requires_gui: boolean;
  /** Hard timeout in minutes (doc default 60–120). */
  hard_timeout_minutes: number;
  objectives: LabObjective[];
}

/** Result of a server-side objective check (never derived client-side). */
export interface ObjectiveResult {
  objective_id: string;
  completed: boolean;
  verified_at: string | null;
  /** Server-side detail — e.g. the flag matched / expected-but-missing. */
  detail: string;
}

/** An active lab session — mirrors the `lab_sessions` row. */
export interface LabSession {
  session_id: string;
  lab_id: string;
  user_id: string;
  status: LabSessionStatus;
  provisioned_at: string;
  /** Hard-timeout deadline (provisioned_at + hard_timeout_minutes). */
  expires_at: string;
  objectives_completed: string[];
  /** Objective check history, newest first. */
  checks: ObjectiveResult[];
  hints_used: number;
  /** Informational — the real ttyd WS endpoint lands with the backend. */
  terminal_url: string;
  /** Set when the session ends (completion / timeout / terminate). */
  ended_at: string | null;
}

/** Public, non-persistent terminal session for the unauthenticated try-it mode. */
export interface LabPreviewSession {
  session_id: string;
  lab_id: string;
  status: "running";
  expires_at: string;
  terminal_url: string;
  read_only: true;
}

/** Mirrors LabSessionCompletedEvent (§4.3) — emitted via the mock API. */
export interface LabSessionCompletedEvent {
  event_type: "lab.session_completed";
  lab_id: string;
  session_id: string;
  objectives_completed: string[];
  time_taken_seconds: number;
  hints_used: number;
}
