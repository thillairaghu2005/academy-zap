import type {
  Assessment,
  AssessmentAttempt,
  AssessmentQuestion,
  AssessmentSubmission,
  ComboState,
  GradeResult,
} from "@/lib/contracts/assessment";
import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  writeDemoStorage,
} from "@/lib/demo/storage";
import { gradeSubmission } from "@/lib/mocks/judge";

/**
 * Assessment Engine fixtures + in-memory attempt store.
 *
 * Grading is DETERMINISTIC in the demo service (§2.6 — never AI):
 *  - MCQ           → exact match against the stored correct option.
 *  - short_answer  → fuzzy match (normalized) against accepted patterns.
 *  - code          → DELEGATES to the Judge Engine mock (gradeSubmission) —
 *                    the "same engine, one grading truth" law.
 *
 * The combo meter is derived by the demo service per correct answer and only
 * PREVIEWED by the client (§7.6 of the gamification doc — the client can
 * never turn its own meter into XP).
 *
 * Demo hooks (same spirit as the other subsystems):
 *  - assessment id "missing-assessment" → 404 (detail error state)
 *  - assessment id "boom"               → 503 on start (start error state)
 */

function question(q: AssessmentQuestion): AssessmentQuestion {
  return q;
}

export const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: "assess-cyber-foundations",
    slug: "cybersecurity-foundations",
    title: "Cybersecurity Foundations Check",
    category: "Core Knowledge",
    description:
      "A mixed-format checkpoint over the fundamentals: multiple choice, short answers, and one live coding question.",
    version: 3,
    estimated_minutes: 15,
    attempts_allowed: 3,
    passing_percent: 70,
    questions: [
      question({
        id: "q-mcq-ping",
        type: "mcq",
        difficulty: "easy",
        prompt:
          "Which protocol does the `ping` utility use to test host reachability?",
        options: [
          "TCP",
          "UDP",
          "ICMP",
          "ARP",
        ],
      }),
      question({
        id: "q-mcq-symmetric",
        type: "mcq",
        difficulty: "medium",
        prompt:
          "In symmetric-key cryptography, the same key is used for encryption and decryption. Which statement is true?",
        options: [
          "Keys are exchanged over a public channel and verified by a CA",
          "Both parties must share the same secret key beforehand",
          "Each user has a public key and a private key",
          "It is mathematically impossible to break",
        ],
      }),
      question({
        id: "q-sa-port",
        type: "short_answer",
        difficulty: "easy",
        prompt:
          "Which well-known TCP port does HTTPS use by default?",
        accepted_answers: ["443"],
      }),
      question({
        id: "q-sa-triad",
        type: "short_answer",
        difficulty: "medium",
        prompt:
          "Name the confidentiality concept that ensures data has not been altered in transit (the 'I' in the CIA triad).",
        accepted_answers: ["integrity"],
      }),
      question({
        id: "q-code-reverse",
        type: "code",
        difficulty: "hard",
        prompt:
          "Write a function `reverse_string(s)` that returns the input string reversed. The judge grades it deterministically.",
        starter_code:
          "def reverse_string(s):\n    \"\"\"Return the input string reversed.\"\"\"\n    # your solution here\n    return s[::-1]\n",
        reference_solution:
          "def reverse_string(s):\n    return s[::-1]\n",
      }),
    ],
  },
  {
    id: "assess-linux-ops",
    slug: "linux-operations-quiz",
    title: "Linux Operations Quiz",
    category: "Operating Systems",
    description:
      "Five short questions on file permissions, processes and shell redirection — a side assessment to sharpen the Linux labs.",
    version: 2,
    estimated_minutes: 8,
    attempts_allowed: 2,
    passing_percent: 60,
    questions: [
      question({
        id: "q-mcq-chmod",
        type: "mcq",
        difficulty: "easy",
        prompt: "What does `chmod 755` grant to the file's group?",
        options: ["Read only", "Read + execute", "Read + write + execute", "No access"],
      }),
      question({
        id: "q-mcq-pipe",
        type: "mcq",
        difficulty: "medium",
        prompt: "Which command prints only the number of lines in a file?",
        options: ["wc -c", "cat -n", "wc -l", "grep -c ''"],
      }),
      question({
        id: "q-sa-kill",
        type: "short_answer",
        difficulty: "easy",
        prompt: "Which signal number is SIGKILL?",
        accepted_answers: ["9"],
      }),
      question({
        id: "q-sa-umask",
        type: "short_answer",
        difficulty: "hard",
        prompt: "A umask of 022 results in what default file permission mode (three digits)?",
        accepted_answers: ["644"],
      }),
      question({
        id: "q-code-dup",
        type: "code",
        difficulty: "medium",
        prompt:
          "Write `dedupe(items)` returning a list with duplicates removed, preserving order.",
        starter_code:
          "def dedupe(items):\n    \"\"\"Return items with duplicates removed, preserving order.\"\"\"\n    # your solution here\n    return list(dict.fromkeys(items))\n",
        reference_solution: "def dedupe(items):\n    return list(dict.fromkeys(items))\n",
      }),
    ],
  },
  {
    id: "assess-web-security",
    slug: "web-security-essentials",
    title: "Web Security Essentials",
    category: "Web Application Security",
    description:
      "Assess your grasp of OWASP-style web vulnerabilities with a mixed question set and a coding challenge.",
    version: 4,
    estimated_minutes: 20,
    attempts_allowed: 3,
    passing_percent: 70,
    questions: [
      question({
        id: "q-mcq-xss",
        type: "mcq",
        difficulty: "easy",
        prompt: "Reflected XSS occurs when…",
        options: [
          "User input is stored and later rendered to other users",
          "Untrusted input is reflected in the response without sanitization",
          "The server executes SQL supplied by the user",
          "Cookies are sent over HTTP only",
        ],
      }),
      question({
        id: "q-mcq-csrf",
        type: "mcq",
        difficulty: "medium",
        prompt: "Which defense best mitigates CSRF attacks?",
        options: [
          "Disabling cookies entirely",
          "SameSite cookies and CSRF tokens",
          "Using GET for state-changing requests",
          "Adding CAPTCHA to every form",
        ],
      }),
      question({
        id: "q-sa-owasp",
        type: "short_answer",
        difficulty: "medium",
        prompt:
          "Injection, Broken Access Control, XSS… Which OWASP category is ranked #1 in the 2021 Top 10?",
        accepted_answers: ["broken access control"],
      }),
      question({
        id: "q-code-sanitize",
        type: "code",
        difficulty: "hard",
        prompt:
          "Write `escape_html(s)` that escapes `<`, `>`, `&`, and `\"` to their HTML entities, preventing stored XSS in rendered output.",
        starter_code:
          "def escape_html(s):\n    \"\"\"Escape HTML-special characters to prevent XSS.\"\"\"\n    # your solution here\n    return s\n",
        reference_solution:
          "def escape_html(s):\n    return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('\"','&quot;')\n",
      }),
    ],
  },
];

export const MOCK_ASSESSMENTS_BY_ID = new Map(
  MOCK_ASSESSMENTS.map((a) => [a.id, a]),
);

export const MOCK_MISSING_ASSESSMENT_ID = "missing-assessment";
export const MOCK_BOOM_ASSESSMENT_ID = "boom";

/** In-memory attempt store — the mock's `assessment_submissions` table. */
export const mockAttempts = new Map<string, AssessmentAttempt>();

/* ------------------------------------------------------------------ */
/*  Attempt persistence (demo state)                                   */
/*                                                                    */
/*  Attempts are the assessment_submissions table stand-in; persisting  */
/*  them lets the attempt history and "attempts used" counter survive  */
/*  page loads. Hydration runs on the client only.                     */
/* ------------------------------------------------------------------ */

function hydrateAttempts(): void {
  if (typeof window === "undefined") return;
  const persisted = readDemoStorage<Record<string, AssessmentAttempt> | null>(
    DEMO_STORAGE_KEYS.attempts,
    null,
  );
  if (!persisted || typeof persisted !== "object") return;
  for (const [id, attempt] of Object.entries(persisted)) {
    if (attempt && typeof attempt === "object") mockAttempts.set(id, attempt);
  }
}

/** Persist the attempt store (called after every attempt write). */
export function persistAttempts(): void {
  if (typeof window === "undefined") return;
  const snapshot: Record<string, AssessmentAttempt> = {};
  for (const [id, attempt] of mockAttempts) snapshot[id] = attempt;
  writeDemoStorage(DEMO_STORAGE_KEYS.attempts, snapshot);
}

hydrateAttempts();

/** Question answer keys used by the local grading reference. */
const ANSWER_KEYS: Record<string, { option?: number; accepted?: string[] }> = {
  "q-mcq-ping": { option: 2 }, // ICMP
  "q-mcq-symmetric": { option: 1 },
  "q-mcq-chmod": { option: 1 },
  "q-mcq-pipe": { option: 2 },
  "q-mcq-xss": { option: 1 },
  "q-mcq-csrf": { option: 1 },
  "q-sa-port": { accepted: ["443"] },
  "q-sa-triad": { accepted: ["integrity"] },
  "q-sa-kill": { accepted: ["9"] },
  "q-sa-umask": { accepted: ["644"] },
  "q-sa-owasp": { accepted: ["broken access control"] },
};

/** Normalized fuzzy match for short answers (§2.6 exact/fuzzy rules). */
function fuzzyMatch(text: string, accepted: string[]): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const t = norm(text);
  return accepted.some((a) => norm(a) === t);
}

/** Deterministic grading — NEVER AI (§2.6). Code delegates to the judge. */
export function gradeAnswerServerSide(
  submission: AssessmentSubmission,
): GradeResult {
  const attempt = mockAttempts.get(submission.attempt_id);
  const result = gradeSingle(submission);
  if (attempt && result.correct) {
    attempt.score += result.score;
    attempt.answers.push({
      question_id: submission.question_id,
      correct: true,
      score: result.score,
      submitted_at: new Date().toISOString(),
    });
    result.combo = comboFor(attempt); // after increment
    persistAttempts();
  } else if (attempt && !result.correct) {
    attempt.answers.push({
      question_id: submission.question_id,
      correct: false,
      score: 0,
      submitted_at: new Date().toISOString(),
    });
    result.combo = { count: 0, multiplier: 1, best: attempt ? bestCombo(attempt) : 0 };
    persistAttempts();
  }
  return result;
}

function gradeSingle(submission: AssessmentSubmission): GradeResult {
  const attempt = mockAttempts.get(submission.attempt_id);
  const assessment = attempt
    ? MOCK_ASSESSMENTS_BY_ID.get(attempt.assessment_id)
    : undefined;
  const q = assessment?.questions.find(
    (question) => question.id === submission.question_id,
  );
  if (!q) {
    return {
      attempt_id: submission.attempt_id,
      question_id: submission.question_id,
      correct: false,
      score: 0,
      feedback: "Unknown question.",
      combo: { count: 0, multiplier: 1, best: 0 },
    };
  }

  const base = pointsFor(q.difficulty);
  switch (submission.type) {
    case "mcq": {
      const key = ANSWER_KEYS[submission.question_id];
      const option = (submission.answer as { option_index: number }).option_index;
      const correct = key?.option === option;
      return {
        attempt_id: submission.attempt_id,
        question_id: submission.question_id,
        correct,
        score: correct ? base : 0,
        feedback: correct
          ? "Correct — deterministic key match."
          : `Incorrect. The correct answer was "${q.options?.[key?.option ?? 0] ?? "—"}".`,
        combo: { count: 0, multiplier: 1, best: 0 },
      };
    }
    case "short_answer": {
      const key = ANSWER_KEYS[submission.question_id];
      const text = (submission.answer as { text: string }).text;
      const correct = !!key?.accepted && fuzzyMatch(text, key.accepted);
      return {
        attempt_id: submission.attempt_id,
        question_id: submission.question_id,
        correct,
        score: correct ? base : 0,
        feedback: correct
          ? "Correct — fuzzy match passed."
          : `Incorrect. Expected one of: ${key?.accepted?.join(", ")}.`,
        combo: { count: 0, multiplier: 1, best: 0 },
      };
    }
    case "code": {
      const source = (submission.answer as { source_code: string }).source_code;
      // Delegates to the Judge Engine mock — one grading truth (§2.6).
      const verdict = gradeSubmission(source).verdict;
      const correct = verdict === "accepted";
      return {
        attempt_id: submission.attempt_id,
        question_id: submission.question_id,
        correct,
        score: correct ? base : 0,
        feedback: correct
          ? "Correct — the judge returned `accepted`."
          : `The judge returned \`${verdict}\`.`,
        combo: { count: 0, multiplier: 1, best: 0 },
      };
    }
  }
}

/** Single source of truth for the difficulty → points map. */
export function pointsFor(difficulty: AssessmentQuestion["difficulty"]): number {
  switch (difficulty) {
    case "easy":
      return 10;
    case "medium":
      return 15;
    case "hard":
      return 25;
  }
}

/**
 * Server-side combo derivation: the CURRENT run of consecutive correct
 * answers (reset by a wrong answer), multiplier derived from it, plus the
 * best run ever this attempt. Only ever PREVIEWED by the client (§7.6).
 */
export function comboFor(attempt: AssessmentAttempt): ComboState {
  let run = 0;
  for (let i = attempt.answers.length - 1; i >= 0; i -= 1) {
    if (attempt.answers[i]?.correct) run += 1;
    else break;
  }
  return {
    count: run,
    multiplier: Math.min(3, 1 + run * 0.25),
    best: bestCombo(attempt),
  };
}

export function bestCombo(attempt: AssessmentAttempt): number {
  let best = 0;
  let run = 0;
  for (const a of attempt.answers) {
    run = a.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function enforceAttemptTimeout(attempt: AssessmentAttempt): void {
  if (
    attempt.status === "in_progress" &&
    Date.now() > new Date(attempt.expires_at).getTime()
  ) {
    attempt.status = "expired";
    persistAttempts();
  }
}
