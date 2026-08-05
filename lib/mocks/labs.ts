import type {
  Lab,
  LabObjective,
  LabSession,
  ObjectiveResult,
} from "@/lib/contracts/lab";

/**
 * Lab Engine fixtures + in-memory session store.
 *
 * Mirrors the real Lab Engine's `labs` / `lab_sessions` / `lab_objectives`
 * tables. Objective completion is derived SERVER-SIDE, exactly like the real
 * engine: the terminal transcript engine (lab-terminal.ts) writes "flags
 * found" into the session store when a user runs the right command against
 * the mock sandbox, and `check_objective` reads that store — it never trusts
 * a value the browser claims (§6).
 *
 * Demo hooks (same spirit as the judge/content mocks):
 *  - lab id "missing-lab"   → 404 (detail error state)
 *  - lab id "boom"          → 503 on provision (start-lab error state)
 *  - "race-the-clock" has a 1-minute hard timeout — the demo path for the
 *    session-timeout UI state (real labs default to 60–120 min, §6).
 */

function objective(
  id: string,
  title: string,
  description: string,
  hints: string[],
  requiresTerminal = true,
): LabObjective {
  return { id, title, description, hints, requires_terminal: requiresTerminal };
}

export const MOCK_LABS: Lab[] = [
  {
    id: "lab-linux-fundamentals",
    slug: "linux-fundamentals",
    title: "Linux Fundamentals",
    category: "Operating Systems",
    difficulty: "beginner",
    description:
      "Get comfortable in a real shell. Navigate the filesystem, read system files, and find your first flag the way an analyst would.",
    estimated_minutes: 25,
    requires_gui: false,
    hard_timeout_minutes: 60,
    objectives: [
      objective(
        "linux-shell",
        "Get a shell",
        "Connect to the session and run your first command.",
        ["Type `help` to see available commands.", "Try `whoami`."],
      ),
      objective(
        "linux-flag",
        "Capture the flag",
        "Find and read the flag at /root/flag.txt.",
        ["List /root with `ls /root`.", "Read it with `cat /root/flag.txt`."],
      ),
      objective(
        "linux-sudo",
        "Escalate privileges",
        "List what sudo privileges the user has.",
        ["Run `sudo -l` to list permitted commands."],
      ),
    ],
  },
  {
    id: "lab-web-app-testing",
    slug: "offensive-web-app-testing",
    title: "Offensive Web App Testing",
    category: "Web Application Security",
    difficulty: "intermediate",
    description:
      "Recon an in-scope web app, find a SQL injection, and pivot to an authenticated session. The target box is on the session-private network.",
    estimated_minutes: 50,
    requires_gui: false,
    hard_timeout_minutes: 90,
    objectives: [
      objective(
        "web-recon",
        "Recon the target",
        "Scan the target box on 10.0.0.2 and enumerate open ports.",
        ["Try `nmap -sV 10.0.0.2`.", "`curl -s http://10.0.0.2` to see the app."],
      ),
      objective(
        "web-sqli",
        "Exploit SQL injection",
        "Bypass the login form with a SQL injection payload.",
        ["Try a classic `' OR 1=1 --` payload."],
      ),
      objective(
        "web-session",
        "Escalate to authenticated session",
        "Grab the session cookie from the injected response.",
        ["The response includes a Set-Cookie header."],
      ),
    ],
  },
  {
    id: "lab-network-recon",
    slug: "network-reconnaissance",
    title: "Network Reconnaissance",
    category: "Networking",
    difficulty: "intermediate",
    description:
      "Map a session-private network, fingerprint live hosts, and capture the traffic that crosses the wire.",
    estimated_minutes: 40,
    requires_gui: false,
    hard_timeout_minutes: 90,
    objectives: [
      objective(
        "net-ping-sweep",
        "Discover live hosts",
        "Find live hosts on the 10.0.0.0/24 segment.",
        ["Try `nmap -sn 10.0.0.0/24`."],
      ),
      objective(
        "net-service",
        "Fingerprint a service",
        "Identify the service version on the live web host.",
        ["`nmap -sV 10.0.0.3` shows a version banner."],
      ),
      objective(
        "net-flag",
        "Capture a flag over the wire",
        "Find the flag in the captured HTTP traffic.",
        ["Replay the request with `curl` and read the body."],
      ),
    ],
  },
  {
    id: "lab-blue-team-console",
    slug: "blue-team-console",
    title: "Blue Team Console",
    category: "Defensive Security",
    difficulty: "advanced",
    description:
      "A GUI lab: work a SIEM-style console, triage alerts, and contain an incident. Demonstrates the Guacamole GUI viewer surface.",
    estimated_minutes: 70,
    requires_gui: true,
    hard_timeout_minutes: 120,
    objectives: [
      objective(
        "gui-login",
        "Sign in to the console",
        "Authenticate to the Blue Team console in the GUI.",
        ["Credentials are on the session info card."],
        false,
      ),
      objective(
        "gui-triage",
        "Triage the alert queue",
        "Identify the highest-severity open alert.",
        ["Sort the queue by severity."],
        false,
      ),
    ],
  },
  {
    id: "lab-race-the-clock",
    slug: "race-the-clock",
    title: "Race the Clock",
    category: "Challenge",
    difficulty: "beginner",
    description:
      "A deliberately short lab to demonstrate the hard timeout: catch the flag before the session is force-terminated.",
    estimated_minutes: 1,
    requires_gui: false,
    hard_timeout_minutes: 1,
    objectives: [
      objective(
        "clock-flag",
        "Beat the timeout",
        "Read /root/flag.txt before the hard timeout fires.",
        ["You know the drill: `cat /root/flag.txt`."],
      ),
    ],
  },
];

export const MOCK_LABS_BY_ID = new Map(MOCK_LABS.map((lab) => [lab.id, lab]));

export const MOCK_MISSING_LAB_ID = "missing-lab";
export const MOCK_BOOM_LAB_ID = "boom";

/** Internal session row — the public view plus the server-side flag store. */
export interface StoredLabSession extends LabSession {
  /** Objective ids whose flags have been "found" inside the mock sandbox. */
  discovered: Set<string>;
}

export const mockLabSessions = new Map<string, StoredLabSession>();

/** Server-side objective check (the "scoped read against session state"). */
export function checkObjectiveServerSide(
  session: StoredLabSession,
  objectiveId: string,
): ObjectiveResult {
  const lab = MOCK_LABS_BY_ID.get(session.lab_id);
  const objectiveDef = lab?.objectives.find((o) => o.id === objectiveId);

  // Non-terminal objectives (e.g. GUI-lab steps) have no shell to write a
  // flag into the store, so the first check IS the scoped read: the mock
  // "orchestrator" verifies the session state directly and marks it done.
  // This mirrors §6.5 for GUI sessions — the browser still can't self-report
  // completion; the server decides.
  if (objectiveDef && !objectiveDef.requires_terminal) {
    session.discovered.add(objectiveId);
    session.objectives_completed = [...session.discovered];
  }

  const found = session.discovered.has(objectiveId);
  const now = new Date().toISOString();
  const result: ObjectiveResult = {
    objective_id: objectiveId,
    completed: found,
    verified_at: found ? now : null,
    detail: found
      ? objectiveDef?.requires_terminal
        ? `Flag verified against the session filesystem.`
        : `Session state verified server-side (GUI objective).`
      : objectiveDef
        ? `Objective not yet met — the expected artifact was not found in the session.`
        : `Unknown objective ${objectiveId}.`,
  };
  // Record the check, newest first.
  session.checks = [result, ...session.checks.filter((c) => c.objective_id !== objectiveId)];
  return result;
}

/**
 * Server-side hint ladder. Both the terminal bridge (`hint` command) and the
 * objectives panel's "Request hint" button call this — one derivation, so
 * hints_used is always consistent (§4.3 LabSessionCompletedEvent.hints_used).
 */
export function nextHintServerSide(session: StoredLabSession): string {
  const lab = MOCK_LABS_BY_ID.get(session.lab_id);
  if (!lab) return "(no hints available)";
  const next = lab.objectives.find((o) => !session.discovered.has(o.id));
  if (!next) return "All objectives complete — no hints needed. Nice.";
  session.hints_used += 1;
  const idx = Math.min(session.hints_used - 1, next.hints.length - 1);
  return `${next.title}: ${next.hints[Math.max(0, idx)]}`;
}

/**
 * Server-side expiry enforcement: when now > expires_at, the session is
 * force-terminated by the "orchestrator" (§6.6). get_session calls this on
 * every read, so a late poll flips the status exactly like the real Arq
 * hard-timeout job would.
 */
export function enforceHardTimeout(session: StoredLabSession): void {
  if (
    (session.status === "running" || session.status === "provisioning") &&
    Date.now() > new Date(session.expires_at).getTime()
  ) {
    session.status = "timed_out";
    session.ended_at = new Date().toISOString();
  }
}
