import type { Course, CourseLesson } from "@/lib/contracts/content";
import { getLessonContent, type LessonContentPayload } from "./lesson-content";

export { getLessonContent, type LessonContentPayload };

export interface SkillBadgeInfo {
  id: string;
  badgeCode: string;
  name: string;
  tagline: string;
  issuer: string;
  partner: string;
  level: "Foundational" | "Associate" | "Professional" | "Specialty";
  ceuCredits: number;
  passingScorePct: number;
  skillsValidated: string[];
  criteria: string[];
  verificationUrl: string;
  issueDate: string;
  expiryDate: string;
}

export interface LabScenarioData {
  scenarioTitle: string;
  region: string;
  architectureSummary: string;
  topologyNodes: { id: string; label: string; type: "client" | "gateway" | "compute" | "storage" | "security" }[];
  tasks: { id: string; title: string; description: string; cliHint?: string }[];
  cliSamples: { command: string; output: string }[];
}

export interface KnowledgeCheckQuestion {
  id: string;
  question: string;
  scenario?: string;
  domain: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  documentationRef: string;
}

/**
 * Derives official Zapsters Enterprise metadata
 * for any course across the platform.
 * Aligned with AWS Skill Builder and IBM SkillsBuild accreditation standards.
 */
export function getCourseSkillBuildMeta(course: Course) {
  const catCode = course.category.toUpperCase().slice(0, 3);
  const hash = Math.abs(course.id.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
  const codeNum = 100 + (hash % 899);
  const courseCode = `ZAP-${catCode}-${codeNum}`;

  const levelTag: SkillBadgeInfo["level"] =
    course.level === "advanced" ? "Professional" : course.level === "intermediate" ? "Associate" : "Foundational";

  const titleLower = course.title.toLowerCase();
  const categoryLower = course.category.toLowerCase();

  // Course-specific learning objectives, target audience, and prerequisites
  let skillsValidated: string[];
  let learningObjectives: string[];
  let targetAudience: { role: string; desc: string }[];
  let prerequisites: string[];

  if (titleLower.includes("react") || titleLower.includes("typescript") || categoryLower.includes("web")) {
    skillsValidated = [
      "React 19 Architecture",
      "Advanced TypeScript 5 Generics",
      "Discriminated Unions & State Machines",
      "TanStack Query Cache Strategies",
      "Vitest & Contract Mocking",
      "Render Profiling & Optimization",
    ];
    learningObjectives = [
      "Architect type-safe frontend state transitions with discriminated unions, making illegal states unrepresentable at compile time.",
      "Implement resilient data-layer abstractions with TanStack Query, query key factories, and optimistic cache mutations.",
      "Model runtime boundary contracts with Zod schemas and Mock Service Worker (MSW) mocks that guarantee contract alignment.",
      "Diagnose and optimize rendering performance using component composition patterns and React 19 compiler primitives without memo-spam.",
      "Author fast, decoupled contract test suites for React hooks and data flows with Vitest, avoiding fragile DOM assertions.",
    ];
    targetAudience = [
      { role: "Senior Frontend Engineers", desc: "Engineers building complex, high-traffic React and TypeScript single-page applications." },
      { role: "Full-Stack Developers", desc: "Developers bridging backend API schemas to type-safe client data layers." },
      { role: "Technical Leads & UI Architects", desc: "Architects setting component composition, state management, and testability standards." },
    ];
    prerequisites = [
      "Proficiency with modern JavaScript (ES2022+), Promises, and core React concepts (components, hooks, effects).",
      "Working knowledge of TypeScript fundamentals (interfaces, basic types, unions).",
      "Local workstation with Node.js 20+ and package manager (pnpm or npm). All hands-on labs run directly in the browser.",
    ];
  } else if (titleLower.includes("linux") || titleLower.includes("operating")) {
    skillsValidated = [
      "Linux Kernel & Shell Internals",
      "POSIX Text Processing (grep, sed, awk)",
      "File Permissions & ACLs",
      "Process Management & Signals",
      "System Hardening & SSH Security",
    ];
    learningObjectives = [
      "Navigate and inspect any Linux filesystem structure with confidence and speed.",
      "Construct efficient, multi-stage text processing pipelines with grep, sed, and awk.",
      "Audit and enforce least-privilege file permissions, ownership, and special bits (SUID/SGID).",
      "Manage processes, signals, and background jobs in high-concurrency production environments.",
      "Harden Linux bastions, configure secure SSH key policies, and inspect audit logs.",
    ];
    targetAudience = [
      { role: "Systems & Security Engineers", desc: "Practitioners managing Linux infrastructure, containers, and edge servers." },
      { role: "DevOps & Cloud Engineers", desc: "Engineers scripting automation and container deployment pipelines." },
      { role: "Security Analysts", desc: "Defenders analyzing forensic artifacts and suspicious Linux processes." },
    ];
    prerequisites = [
      "Basic familiarity with command-line interfaces.",
      "Understanding of basic computing concepts (files, folders, networks).",
      "No local Linux setup required — fully integrated terminal provided in sandbox.",
    ];
  } else if (titleLower.includes("cloud") || categoryLower.includes("cloud")) {
    skillsValidated = [
      "Zero-Trust Cloud Architecture",
      "IAM Least Privilege & Role Federation",
      "VPC Network Isolation & Ingress Controls",
      "Continuous Compliance Drift Detection",
      "KMS Customer Managed Key Encryption",
    ];
    learningObjectives = [
      "Architect and configure resilient, secure cloud workloads following enterprise design patterns.",
      "Design least-privilege IAM policies, instance profiles, and temporary credential rotation.",
      "Segment private subnets and configure managed NAT gateways to prevent unsolicited ingress.",
      "Deploy continuous compliance rules with automated remediation for non-compliant resources.",
      "Enforce KMS envelope encryption and automated annual key rotation across object stores.",
    ];
    targetAudience = [
      { role: "Cloud & Solutions Architects", desc: "Professionals designing secure, multi-AZ enterprise cloud platforms." },
      { role: "DevSecOps & Platform Engineers", desc: "Engineers automating infrastructure-as-code and compliance checks." },
      { role: "Security Operations Engineers", desc: "Defenders monitoring cloud audit logs and incident telemetry streams." },
    ];
    prerequisites = [
      "Foundational understanding of core computing and networking concepts (TCP/IP, HTTP, DNS).",
      "Familiarity with cloud management consoles or CLI tooling.",
      "No paid cloud subscription required — all labs run in the integrated Zapsters sandbox.",
    ];
  } else {
    skillsValidated = [
      `${course.category} Fundamentals`,
      "Zero-Trust Architecture",
      "Applied Security Automation",
      "Production Workload Hardening",
      "Compliance & Threat Mitigation",
    ];
    learningObjectives = [
      `Architect and configure resilient, secure ${course.category} workloads following enterprise design patterns.`,
      `Identify, evaluate, and mitigate common operational risks, misconfigurations, and attack surfaces.`,
      `Execute hands-on implementation tasks using simulated CLI and Cloud Shell tooling.`,
      `Apply principles of least privilege, continuous verification, and automated monitoring.`,
      `Prepare for accredited industry certifications with scenario-based technical knowledge checks.`,
    ];
    targetAudience = [
      { role: "Cloud & Security Engineers", desc: "Professionals implementing scalable cloud workloads and access control." },
      { role: "Solutions Architects", desc: "Engineers designing resilient architectures aligned to Zapsters Enterprise best practices." },
      { role: "DevSecOps & Operations", desc: "Practitioners managing deployment pipelines, telemetry, and automated mitigation." },
    ];
    prerequisites = [
      "Foundational understanding of core computing and networking concepts (TCP/IP, HTTP, DNS).",
      "Familiarity with command-line interfaces and basic scripting.",
      "No paid cloud subscription required — all labs run in the integrated Zapsters sandbox.",
    ];
  }

  const badgeInfo: SkillBadgeInfo = {
    id: `cred-${course.id.slice(0, 8)}`,
    badgeCode: `BADGE-${catCode}-${codeNum}`,
    name: `${course.title} — Verified Skill Credential`,
    tagline: `Demonstrated competency in ${course.category} architectures, applied best practices, and verified lab implementation.`,
    issuer: "Zapsters Enterprise Academy",
    partner: "Zapsters Engineering Council & Enterprise Standards",
    level: levelTag,
    ceuCredits: Math.max(0.5, Number((course.estimated_hours * 0.1).toFixed(1))),
    passingScorePct: 80,
    skillsValidated,
    criteria: [
      "Complete 100% of interactive course modules and labs",
      "Demonstrate hands-on competency in the interactive Cloud Sandbox",
      "Achieve 80% or higher score on the scenario-based Knowledge Check Assessment",
    ],
    verificationUrl: `https://zapsters.dev/verify/cred-${course.id.slice(0, 8)}`,
    issueDate: "October 2026",
    expiryDate: "Valid indefinitely (No expiration)",
  };

  return {
    courseCode,
    badgeInfo,
    learningObjectives,
    targetAudience,
    prerequisites,
  };
}

/**
 * Returns hands-on lab sandbox information for a given lesson or course.
 * Automatically tailors to frontend / web development vs cloud / security workloads.
 */
export function getLabScenario(course: Course, lesson: CourseLesson): LabScenarioData {
  const isWebDev =
    course.title.toLowerCase().includes("react") ||
    course.title.toLowerCase().includes("typescript") ||
    course.category.toLowerCase().includes("web");

  if (isWebDev) {
    return {
      scenarioTitle: `Hands-on Code Sandbox: ${lesson.title}`,
      region: "Node.js 20.x · React 19.x · TypeScript 5.4 · Vitest 2.x",
      architectureSummary: `In this developer sandbox, you refactor components to discriminated unions, verify type contracts with the TypeScript compiler, and execute Vitest suites.`,
      topologyNodes: [
        { id: "types", label: "Domain Types (Zod / Schemas)", type: "security" },
        { id: "store", label: "TanStack Query Cache", type: "storage" },
        { id: "engine", label: "React 19 Component Engine", type: "compute" },
        { id: "boundary", label: "MSW Mock Boundary", type: "gateway" },
        { id: "client", label: "DOM & Test Runner (Vitest)", type: "client" },
      ],
      tasks: [
        {
          id: "task-1",
          title: "Task 1: Inspect Loose State Model and Identify Impossible States",
          description: "Review current component state flags and find overlapping boolean combinations that permit invalid renders.",
          cliHint: "pnpm typecheck --filter @zapsters/course-runtime",
        },
        {
          id: "task-2",
          title: "Task 2: Refactor State Machine to Discriminated Union",
          description: "Replace loose { isLoading, isError, data } with exhaustive RemoteData<T> tagged union with status discriminant.",
          cliHint: "git diff src/state/remote-data.ts",
        },
        {
          id: "task-3",
          title: "Task 3: Run Strict TypeScript Verification",
          description: "Execute TypeScript compiler with --noEmit and strictNullChecks to confirm 0 compile errors.",
          cliHint: "pnpm tsc --noEmit",
        },
        {
          id: "task-4",
          title: "Task 4: Execute Vitest Contract Verification Suite",
          description: "Run automated test suite to ensure optimistic mutations, state transitions, and error rollbacks pass.",
          cliHint: "pnpm vitest run src/tests/state-transitions.test.ts",
        },
      ],
      cliSamples: [
        {
          command: "pnpm tsc --noEmit",
          output: `✨ [TypeScript 5.4 Compiler] Compiling project under strict flags...\nChecking 24 files with strictNullChecks, noImplicitAny, noUncheckedIndexedAccess.\n✓ 0 errors found in 184ms. Type safety verified.`,
        },
        {
          command: "git diff src/state/remote-data.ts",
          output: `--- a/src/state/remote-data.ts\n+++ b/src/state/remote-data.ts\n@@ -1,6 +1,8 @@\n-export interface State { isLoading: boolean; error: Error | null; data: User | null; }\n+export type RemoteData<T> =\n+  | { status: "idle" }\n+  | { status: "loading" }\n+  | { status: "success"; data: T }\n+  | { status: "error"; error: Error };`,
        },
        {
          command: "pnpm vitest run src/tests/state-transitions.test.ts",
          output: `✓ src/tests/state-transitions.test.ts (4 tests) 18ms\n  ✓ transitions from idle -> loading -> success (4ms)\n  ✓ prevents accessing payload during loading state (2ms)\n  ✓ optimistic update rolls back on API 500 error (6ms)\n  ✓ assertNever triggers compile error on unhandled status (3ms)\n\nTest Files  1 passed (1)\n     Tests  4 passed (4)\n  Duration  412ms (transform 110ms, setup 42ms, collect 22ms, tests 18ms)`,
        },
      ],
    };
  }

  const hash = Math.abs((course.id + lesson.id).split("").reduce((acc, c) => (acc * 23 + c.charCodeAt(0)) | 0, 0));
  const region = hash % 2 === 0 ? "us-east-1 (N. Virginia)" : "eu-west-1 (Ireland)";

  return {
    scenarioTitle: `Hands-on Lab: ${lesson.title}`,
    region,
    architectureSummary: `In this lab, you configure, audit, and validate cloud infrastructure resources according to the principle of least privilege and strict telemetry standards.`,
    topologyNodes: [
      { id: "client", label: "Workstation / CloudShell", type: "client" },
      { id: "gateway", label: "API Gateway / Ingress", type: "gateway" },
      { id: "compute", label: "App Execution Cluster", type: "compute" },
      { id: "security", label: "IAM & KMS Key Vault", type: "security" },
      { id: "storage", label: "Encrypted Data Store", type: "storage" },
    ],
    tasks: [
      {
        id: "task-1",
        title: "Task 1: Inspect Baseline IAM Policy and Role Bindings",
        description: "Review current access policies and identify permissive wildcard actions that violate least privilege.",
        cliHint: "zapster iam get-role-policy --role-name app-execution-role",
      },
      {
        id: "task-2",
        title: "Task 2: Apply Scoped Least-Privilege Policy",
        description: "Deploy the hardened JSON access policy restricting storage and KMS key operations to explicit resource URIs.",
        cliHint: "zapster iam put-role-policy --role-name app-execution-role --policy-name scoped-access",
      },
      {
        id: "task-3",
        title: "Task 3: Verify Audit Logging & Ingress Controls",
        description: "Query event streams to confirm unauthorized attempts are rejected with 403 Forbidden.",
        cliHint: "zapster telemetry lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=AccessDenied",
      },
      {
        id: "task-4",
        title: "Task 4: Run Automated Compliance Validation",
        description: "Execute the compliance probe to confirm all security benchmark controls pass without deviation.",
        cliHint: "zapsters-audit --evaluate --standard CIS-v1.4",
      },
    ],
    cliSamples: [
      {
        command: "zapster iam get-role-policy --role-name app-execution-role",
        output: `{\n  "RoleName": "app-execution-role",\n  "PolicyName": "legacy-policy",\n  "PolicyDocument": {\n    "Version": "2026-10-01",\n    "Statement": [{\n      "Effect": "Allow",\n      "Action": ["storage:GetObject", "storage:PutObject"],\n      "Resource": "urn:zapster:storage:::corporate-data/*"\n    }]\n  }\n}`,
      },
      {
        command: "zapster storage ls storage://corporate-data/audit-logs/",
        output: `2026-10-12 14:02:11   49152   access_log_2026-10-12.json.gz\n2026-10-13 08:30:45   65536   access_log_2026-10-13.json.gz\n2026-10-13 18:22:19   32768   current_active_session.log`,
      },
      {
        command: "zapsters-audit --evaluate --standard CIS-v1.4",
        output: `[AUDIT ENGINE] Running benchmark CIS-v1.4 on ${region}...\n[PASS] IAM.01: Multi-Factor Authentication configured\n[PASS] IAM.02: Credentials rotated within 90 days\n[PASS] S3.01: Bucket default encryption enabled (SSE-KMS)\n[PASS] LOG.01: CloudTrail multi-region stream enabled\n----------------------------------------------------\nResult: 4 / 4 Controls Passed (100% Compliance Score)`,
      },
    ],
  };
}

/**
 * 10 Realistic React & TypeScript Certification Prep Questions.
 * Tests discriminated unions, generics, TanStack Query, rendering, and testing.
 */
const reactTsQuestions: KnowledgeCheckQuestion[] = [
  {
    id: "rts-1",
    domain: "Discriminated Unions & Exhaustiveness",
    scenario: "A developer is writing a reducer function in TypeScript to handle asynchronous fetch states. A new variant `{ status: 'stale'; data: T; error?: never }` is added to the union type.",
    question: "Which implementation pattern ensures that all switch cases across the codebase must handle this new variant at compile time?",
    options: [
      "Add a default case returning null without type assertion",
      "Assign the unhandled state to a variable typed as `never` inside the default case (`const _check: never = state`)",
      "Cast the state as `any` and perform an `instanceof` check",
      "Suppress TypeScript compiler errors using `// @ts-ignore`",
    ],
    correctIndex: 1,
    explanation: "Because `never` represents the empty set of values, assigning a valid union member to `never` produces compile-time error TS2322, guaranteeing exhaustive branch coverage.",
    documentationRef: "TypeScript Handbook: Exhaustiveness Checking with Never",
  },
  {
    id: "rts-2",
    domain: "Domain Modeling & Impossible States",
    scenario: "An enterprise React component displays user data. When modeling async state with `{ isLoading: boolean; isError: boolean; data: User | null; error: Error | null }`, runtime bugs occur.",
    question: "What is the primary architectural flaw with this state representation?",
    options: [
      "The interface uses too few boolean variables to represent all states",
      "It allows impossible combinations (e.g. `isLoading: true` and `isError: true` simultaneously) that the compiler cannot reject",
      "TypeScript interfaces cannot be passed to React components",
      "Objects with more than three fields cause memory leaks in React",
    ],
    correctIndex: 1,
    explanation: "Independent boolean flags create $2^N$ state permutations, many of which are contradictory impossible states. Discriminated unions make invalid combinations unrepresentable.",
    documentationRef: "Zapsters Frontend Architecture: Making Illegal States Unrepresentable",
  },
  {
    id: "rts-3",
    domain: "Nominal Typing & Branded Types",
    scenario: "A payment gateway hook accepts `customerId: string` and `invoiceId: string`. During an outage, a developer accidentally passed `invoiceId` as the first argument, charging the wrong account.",
    question: "How can TypeScript's type system permanently eliminate this argument swapping bug at compile time without runtime overhead?",
    options: [
      "Replace string parameters with integer numbers",
      "Use TypeScript branded types (`type CustomerId = string & { readonly __brand: unique symbol }`)",
      "Write a regex at runtime to check string prefixes",
      "Wrap strings in a JavaScript class with private fields",
    ],
    correctIndex: 1,
    explanation: "Branded types enforce nominal typing on top of TypeScript's structural type system. `CustomerId` and `InvoiceId` become mutually incompatible at compile time with zero runtime cost.",
    documentationRef: "TypeScript Deep Dive: Branded / Nominal Types Pattern",
  },
  {
    id: "rts-4",
    domain: "Server State & TanStack Query",
    scenario: "A dashboard component queries a user's transaction history. The user navigates away and returns after 30 seconds. The component should display cached data instantly while refreshing in the background.",
    question: "Which TanStack Query configuration achieves instant render with background cache revalidation?",
    options: [
      "`staleTime: 0` and `gcTime: 5 * 60 * 1000` (default behavior)",
      "`staleTime: Infinity` and `gcTime: 0`",
      "`enabled: false` with manual `refetch()`",
      "`networkMode: 'offlineFirst'` with no cache storage",
    ],
    correctIndex: 0,
    explanation: "When data is older than `staleTime`, TanStack Query immediately returns cached data from memory (`gcTime`) while triggering an asynchronous background fetch to keep data fresh.",
    documentationRef: "TanStack Query v5 Docs: StaleTime vs GcTime Lifecycle",
  },
  {
    id: "rts-5",
    domain: "Render Optimization & Composition",
    scenario: "A parent component manages a slider value (`number`) and renders a very expensive child tree. The child tree does not use the slider value, but re-renders on every tick.",
    question: "Which refactoring eliminates the re-renders of the child tree without adding `useMemo` or `React.memo`?",
    options: [
      "Wrap the parent component in `React.forwardRef`",
      "Pass the expensive child tree via `children` prop created in the outer scope, keeping its JSX element identity constant",
      "Convert the slider from a controlled input to an uncontrolled input",
      "Store the slider value in `localStorage` instead of state",
    ],
    correctIndex: 1,
    explanation: "Passing child components as `children` preserves their JSX element reference across parent re-renders. React skips reconciliation for identical element references without requiring manual memoization.",
    documentationRef: "React Docs: Passing Content as Children for Performance",
  },
  {
    id: "rts-6",
    domain: "Runtime Validation & API Contracts",
    scenario: "A frontend client fetches JSON from an external third-party API. The backend team occasionally changes field names without updating documentation.",
    question: "Which architecture pattern guarantees type safety between the external API and the React component tree?",
    options: [
      "Typecast the `response.json()` with `as ThirdPartyResponse`",
      "Validate the incoming JSON payload at runtime using a Zod schema (`Schema.parse()`) and infer static types with `z.infer`",
      "Disable strict mode in tsconfig.json",
      "Inspect the data using `console.log()` in production",
    ],
    correctIndex: 1,
    explanation: "TypeScript types do not exist at runtime. Parsing incoming data through Zod validates the schema before data enters state, throwing early explicit errors if contract drift occurs.",
    documentationRef: "Zod Documentation: Type Inference & Runtime Parsing",
  },
  {
    id: "rts-7",
    domain: "TypeScript Generic Constraints",
    scenario: "You are authoring a utility function `pluckProperty<T, K>(obj: T, key: K)` that retrieves a nested property from any object with strict return type inference.",
    question: "How should the generic type parameter `K` be constrained in TypeScript?",
    options: [
      "`K extends string`",
      "`K extends keyof T`",
      "`K extends any[]`",
      "`K extends keyof Object`",
    ],
    correctIndex: 1,
    explanation: "Constraining `K extends keyof T` ensures `key` must be a valid property name of `obj`, allowing the return type to be precisely inferred as `T[K]`.",
    documentationRef: "TypeScript Handbook: Using Type Parameters in Generic Constraints",
  },
  {
    id: "rts-8",
    domain: "Testing React Hooks with Vitest",
    scenario: "A developer is writing a unit test for a custom hook `useDebouncedSearch(query: string)` using Vitest and `@testing-library/react`.",
    question: "Which API from `@testing-library/react` executes the custom hook in an isolated test environment without mounting a dummy visual component?",
    options: [
      "`render()`",
      "`renderHook()`",
      "`act()` alone without harness",
      "`createRenderer()`",
    ],
    correctIndex: 1,
    explanation: "`renderHook` creates an isolated test harness to test custom hooks directly, exposing `result.current`, rerender capabilities, and unmount triggers.",
    documentationRef: "Testing Library Docs: renderHook API Reference",
  },
  {
    id: "rts-9",
    domain: "Immutable State Updates & Structural Sharing",
    scenario: "A React reducer updates one item in an array of 500 items: `state.items[index].title = newTitle; return state;`",
    question: "Why does this mutation fail to trigger a re-render in React components consuming `state.items`?",
    options: [
      "Arrays cannot hold more than 100 items in React",
      "Direct mutation preserves the array's memory reference, causing React's shallow equality check (`Object.is`) to conclude state has not changed",
      "The title property must always be an integer",
      "Reducers must return a Promise",
    ],
    correctIndex: 1,
    explanation: "React relies on referential identity to detect changes. Mutating objects in place keeps the existing reference, failing `Object.is(prev, next)` and skipping component re-renders.",
    documentationRef: "React Docs: Updating Arrays in State with Immutability",
  },
  {
    id: "rts-10",
    domain: "Query Key Architecture & Invalidation",
    scenario: "An enterprise app has 40 distinct query endpoints. Developers frequently type mismatching keys like `['course', id]` vs `['courses', id]`, causing stale cache bugs.",
    question: "What is the recommended design pattern to centralize and standardize query keys in TanStack Query?",
    options: [
      "Hardcode string URLs as query keys throughout components",
      "Use a Query Key Factory pattern with hierarchical tuples (`const courseKeys = { all: ['courses'], detail: (id) => [...] }`)",
      "Disable cache invalidation across the app",
      "Pass random numbers as query keys on every mount",
    ],
    correctIndex: 1,
    explanation: "A Query Key Factory organizes keys into structured, reusable factory functions, eliminating typos and enabling precise hierarchical cache invalidation (e.g. invalidating all `courses` lists while retaining specific details).",
    documentationRef: "TkDodo's Blog: Effective React Query Keys & Factories",
  },
];

/**
 * Generates 10 realistic scenario-based knowledge check questions modeled after
 * Zapsters Enterprise certification prep exams.
 * Every module quiz and final assessment provides exactly 10 questions.
 */
export function getKnowledgeCheckQuestions(course: Course, lesson: CourseLesson): KnowledgeCheckQuestion[] {
  const isFinalAssessment =
    lesson.title.toLowerCase().includes("final") ||
    lesson.title.toLowerCase().includes("assessment") ||
    lesson.title.toLowerCase().includes("capstone");

  const seed = Math.abs(
    (course.id + lesson.id).split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
  );

  const courseTitleLower = course.title.toLowerCase();
  const categoryLower = course.category.toLowerCase();

  // Base pool selection: Choose domain-focused questions based on course category
  let sourcePool: KnowledgeCheckQuestion[];

  if (
    courseTitleLower.includes("react") ||
    courseTitleLower.includes("typescript") ||
    courseTitleLower.includes("frontend") ||
    categoryLower.includes("web")
  ) {
    sourcePool = reactTsQuestions;
  } else if (
    courseTitleLower.includes("cloud") ||
    courseTitleLower.includes("infra") ||
    courseTitleLower.includes("network") ||
    categoryLower.includes("cloud")
  ) {
    sourcePool = cloudQuestions;
  } else {
    sourcePool = cyberQuestions;
  }

  // Generate 10 deterministic questions tailored to this lesson
  const questions: KnowledgeCheckQuestion[] = [];
  const totalAvailable = sourcePool.length;

  for (let i = 0; i < 10; i++) {
    const questionIndex = (seed + i * 3) % totalAvailable;
    const baseQuestion = sourcePool[questionIndex]!;

    questions.push({
      ...baseQuestion,
      id: `q-${lesson.id.slice(0, 8)}-${i + 1}`,
      question: isFinalAssessment
        ? `[Final Certification Capstone] ${baseQuestion.question}`
        : baseQuestion.question,
    });
  }

  return questions;
}

const cyberQuestions: KnowledgeCheckQuestion[] = [
  {
    id: "cyb-1",
    domain: "Authentication & Log Forensics",
    scenario: "During an off-hours security alert, auth logs from an edge Linux bastion show repeated 'Failed password for invalid user' records followed by an immediate 'Accepted publickey' from the same external IP address.",
    question: "Which Python automation pattern best extracts, parses, and flags this suspicious brute-force-to-success sequence?",
    options: [
      "Loop with simple str.split() without timestamp parsing or IP correlation",
      "Regex with named groups parsing timestamps, IP, and status into a sliding state window per source IP",
      "Call grep through subprocess.run() without sanitizing user input strings",
      "Write logs directly to an unindexed text file and trigger manual operator review",
    ],
    correctIndex: 1,
    explanation: "Using regular expressions with named capture groups coupled with an IP-keyed state window allows detection of rapid failed authentication attempts immediately followed by successful access within a tight threshold.",
    documentationRef: "NIST SP 800-92: Guide to Computer Security Log Management §4.3",
  },
  {
    id: "cyb-2",
    domain: "Identity & Access Boundaries",
    scenario: "An enterprise Python daemon deployed on a cloud virtual machine must query private object storage threat intel buckets. Corporate policy strictly forbids static API keys.",
    question: "How should authentication and authorization be architected in compliance with least privilege?",
    options: [
      "Hardcode cloud credentials in an encrypted .env file checked into version control",
      "Attach an IAM Role with read-only bucket policy via an Instance Profile using token-based metadata (IMDSv2)",
      "Generate 365-day presigned URLs using root credentials",
      "Configure bucket access to allow anonymous public GET requests restricted by CIDR block",
    ],
    correctIndex: 1,
    explanation: "IAM Roles paired with Instance Profiles eliminate hardcoded credentials by delivering temporary, automatically rotated credentials via the instance metadata service.",
    documentationRef: "Zapsters Well-Architected Security Pillar §4: Permissions Management",
  },
  {
    id: "cyb-3",
    domain: "Network Scans & Socket Programming",
    scenario: "A security analyst is writing a lightweight TCP port discovery script in Python to audit internal development microservices across 1,000 IP endpoints.",
    question: "Which socket programming practice prevents the script from hanging on unresponsive or filtered ports?",
    options: [
      "Use socket.socket(socket.AF_INET, socket.SOCK_STREAM) with socket.settimeout(0.5) and connect_ex()",
      "Invoke connect() with default blocking sockets and sleep(2) between iterations",
      "Rely on operating system TCP keep-alive packets configured to 7200 seconds",
      "Open raw ICMP sockets without administrative privileges",
    ],
    correctIndex: 0,
    explanation: "Configuring a granular socket timeout and utilizing connect_ex() returns an explicit error code (e.g. 0 for success, 111 for connection refused) rather than throwing blocking exceptions, enabling rapid parallel sweeps.",
    documentationRef: "Python Standard Library Docs: socket.settimeout & socket.connect_ex",
  },
  {
    id: "cyb-4",
    domain: "Threat Intelligence Feeds & IoC Matching",
    scenario: "A threat detection pipeline receives continuous CSV feeds containing 250,000 malicious IP indicators. Ingesting incoming firewall netflow records takes excessive CPU time.",
    question: "Which data structure provides the optimal average time complexity for checking whether an observed flow IP is in the threat feed?",
    options: [
      "Store the indicators in a Python list and perform item in list sweeps: O(N)",
      "Store IPv4 addresses converted to 32-bit integers in a Python set() or radix tree: O(1)",
      "Write indicators to a CSV and grep the file on disk for every netflow packet: O(N)",
      "Append indicators to a circular FIFO queue and rotate sequentially: O(N)",
    ],
    correctIndex: 1,
    explanation: "Hash-based sets and radix tries provide average O(1) membership lookups. Converting dotted-quad strings to 32-bit integer representations also dramatically reduces memory overhead for millions of indicators.",
    documentationRef: "Zapsters Algorithms & Systems Standard: Big-O Data Structures in High-Volume Security Ingestion",
  },
  {
    id: "cyb-5",
    domain: "Vulnerability Parsing & Automation",
    scenario: "An automated scanner generates large Nmap XML output files (500MB+) that must be parsed without exhausting workstation memory.",
    question: "Which XML parsing approach in Python ensures memory-efficient event-driven stream parsing?",
    options: [
      "xml.dom.minidom.parse() loading the entire DOM tree into memory",
      "xml.etree.ElementTree.iterparse() clearing processed elements with elem.clear() after reading",
      "Regular expression string searches across the raw XML file",
      "Convert the XML to JSON in memory using an external parser",
    ],
    correctIndex: 1,
    explanation: "Using ElementTree.iterparse() reads XML tags sequentially as streaming events. Calling elem.clear() disposes of processed elements, keeping memory consumption near constant O(1) regardless of file size.",
    documentationRef: "Python Standard Library: XML Processing Modules Security & Performance",
  },
  {
    id: "cyb-6",
    domain: "Traffic Analytics & Anomaly Detection",
    scenario: "A network telemetry pipeline monitors HTTP request volumes to identify stealthy data exfiltration. Occasional traffic spikes cause excessive false positives when using a static threshold.",
    question: "Which algorithmic baseline technique best accommodates expected traffic fluctuations while isolating genuine anomalies?",
    options: [
      "Fixed hardcoded threshold: flag any window exceeding 1,000 requests",
      "Moving average with dynamic standard deviation bands (Bollinger / Z-Score) or Interquartile Range (IQR)",
      "Random sampling of 5% of network packets",
      "Check request volume only during business hours and disable alerts at night",
    ],
    correctIndex: 1,
    explanation: "Median with Interquartile Range (IQR) or rolling Z-scores establishes an adaptive, statistically sound baseline robust against noise and skew, alerting only on genuine anomalous deviations.",
    documentationRef: "MITRE ATT&CK Mitigation M1031: Network Traffic Anomaly Baselines",
  },
  {
    id: "cyb-7",
    domain: "Cryptographic Storage & Secrets Protection",
    scenario: "A Python backend microservice requires database credentials and an AES encryption key to decrypt employee records.",
    question: "Which implementation aligns with enterprise compliance standards such as PCI-DSS and SOC 2?",
    options: [
      "Base64-encode credentials and commit them to the internal Git repository",
      "Fetch secrets at runtime from HashiCorp Vault or Cloud Secrets Manager with KMS envelope encryption",
      "Store the plaintext AES key in a local SQLite file in /tmp",
      "Pass passwords via plaintext HTTP GET query parameters",
    ],
    correctIndex: 1,
    explanation: "Centralized secret management services with envelope encryption and automatic key rotation ensure secrets are never exposed in source control, log output, or unencrypted persistent storage.",
    documentationRef: "PCI-DSS v4.0 Requirement 3.5: Document and Implement Key Management Procedures",
  },
  {
    id: "cyb-8",
    domain: "Input Sanitization & Secure Scripting",
    scenario: "A security script takes hostnames from a web form and executes 'ping -c 3 <hostname>' via the operating system shell.",
    question: "What critical vulnerability is introduced, and what is the remediation?",
    options: [
      "Denial of service; remediate by setting timeout to 0",
      "Command Injection (CWE-78); avoid shell=True, pass arguments as a list to subprocess.run(['ping', '-c', '3', host]) and validate input with strict regex",
      "Cross-Site Scripting; remediate by encoding HTML output",
      "Buffer overflow; remediate by using 64-bit integer counters",
    ],
    correctIndex: 1,
    explanation: "Executing user-supplied input through shell=True permits command chaining (e.g. '; rm -rf /'). Disabling shell interpretation and passing arguments as discrete array tokens prevents shell interpretation.",
    documentationRef: "OWASP Top 10 A03:2021 — Injection & CWE-78 OS Command Injection",
  },
  {
    id: "cyb-9",
    domain: "Incident Response & Telemetry Ingestion",
    scenario: "During an active malware investigation, an endpoint agent isolates a compromised host and streams forensic memory artifacts to an object storage bucket.",
    question: "Which object storage configuration ensures uploaded forensic evidence cannot be deleted or altered by unauthorized users or malware?",
    options: [
      "Bucket Versioning with Object Lock enabled in Compliance Mode",
      "Standard storage bucket with private ACLs and no MFA delete",
      "Enable website hosting on the bucket with directory index disabled",
      "Store artifacts in Reduced Redundancy storage class",
    ],
    correctIndex: 0,
    explanation: "Object Lock in Compliance Mode enforces WORM (Write Once, Read Many) storage, preventing object deletion or modification even by administrative accounts for the retention period.",
    documentationRef: "Zapsters Cloud Storage Guide: Locking Objects with Compliance Retention Mode",
  },
  {
    id: "cyb-10",
    domain: "Detection Engineering & Rule Tuning",
    scenario: "A newly deployed Sigma detection rule for scheduled task persistence generates 300 alerts per hour due to legitimate software updater jobs.",
    question: "What is the correct detection engineering workflow to tune the rule without missing actual attacker activity?",
    options: [
      "Permanently disable the rule in the SIEM to eliminate alert fatigue",
      "Add strict filtering exceptions scoped to verified signer certificates, parent process hashes, and exact path parameters",
      "Raise the alert threshold to require 500 tasks per second before notifying analysts",
      "Reroute the alert channel to a spam folder",
    ],
    correctIndex: 1,
    explanation: "Tuning rules requires isolating legitimate baseline anomalies through specific attribute exceptions (such as digital signature validation and strict parent process relationships) to preserve sensitivity against malicious actors.",
    documentationRef: "Sigma Rule Specification: Applying Filter and False-Positive Modifiers",
  },
];

const cloudQuestions: KnowledgeCheckQuestion[] = [
  {
    id: "cld-1",
    domain: "Cloud Architecture & Multi-AZ Resilience",
    scenario: "A Tier-1 financial ledger application deployed in a multi-region cloud experiences an Availability Zone outage. Client database writes fail because the primary database instance is in the impaired zone.",
    question: "Which database configuration provides automatic, sub-minute failover without manual administrator intervention?",
    options: [
      "Managed Multi-AZ deployment with synchronous standby replication and automatic DNS failover",
      "Single-AZ instance with nightly automated snapshots restored to a new region",
      "Read-replica deployed in another region requiring manual promotion and application reconfiguration",
      "Export database tables to object storage every 30 minutes using cron jobs",
    ],
    correctIndex: 0,
    explanation: "Managed Multi-AZ synchronously replicates data to a hot standby in an independent Availability Zone, automatically flipping DNS endpoints in 60-120 seconds during infrastructure impairment.",
    documentationRef: "Zapsters Resilient Systems Framework §3: Disaster Recovery Objectives",
  },
  {
    id: "cld-2",
    domain: "Network Isolation & VPC Security",
    scenario: "Backend database servers in a Virtual Private Cloud (VPC) must never be reachable directly from the public internet, but must pull OS security patches from external vendor repositories.",
    question: "Which VPC architecture satisfies both security requirements?",
    options: [
      "Assign public IPv4 addresses to the database instances and allow 0.0.0.0/0 on port 80",
      "Place databases in private subnets with default route to a NAT Gateway located in a public subnet",
      "Attach an Internet Gateway directly to the private subnet route table",
      "Disable all firewall rules on the virtual instances",
    ],
    correctIndex: 1,
    explanation: "Placing resources in private subnets prevents inbound internet routing. Routing outbound traffic through a managed NAT Gateway in a public subnet allows outbound patch updates while denying unsolicited inbound connections.",
    documentationRef: "Zapsters VPC Architecture Guide: Recommended Subnet Isolation Patterns",
  },
  {
    id: "cld-3",
    domain: "Continuous Compliance & Drift Detection",
    scenario: "An enterprise auditor discovers that an engineer manually created a firewall rule permitting unrestricted SSH (0.0.0.0/0 port 22) through the web management console.",
    question: "Which automated compliance rule combination detects this drift and immediately remediates the rule?",
    options: [
      "Continuous compliance rule 'restricted-ssh' triggering an automated remediation runbook",
      "Weekly billing alarm checking for cost anomalies",
      "DNS health check pinging port 22",
      "Storage lifecycle policy expiring objects older than 30 days",
    ],
    correctIndex: 0,
    explanation: "Continuous compliance tooling monitors resource configurations against baseline rules. Upon detecting a non-compliant security group, it invokes automated remediation runbooks to revoke the open ingress rule.",
    documentationRef: "Zapsters Security Benchmark §4.1: Ensure no security group allows public ingress to port 22",
  },
  {
    id: "cld-4",
    domain: "Microservices & Boundary Isolation",
    scenario: "A containerized Kubernetes application in a managed cloud cluster processes sensitive medical records. The cluster administrator must ensure compromised containers cannot access host instance credentials.",
    question: "Which identity architecture should be deployed for the container pods?",
    options: [
      "Assign full administrator access to the container worker node role",
      "Implement Workload Identity / IRSA with OIDC token federation and IMDS hop limits set to 1",
      "Mount root cloud credentials inside an unencrypted ConfigMap",
      "Store the cloud secret access key in a public Docker Hub image layer",
    ],
    correctIndex: 1,
    explanation: "Workload Identity leverages Kubernetes Service Accounts mapped to scoped cloud roles via OIDC token federation. Restricting metadata service (IMDSv2) hop limits prevents container pods from accessing host-level node credentials.",
    documentationRef: "Zapsters Kubernetes Security Guide: Security & Pod Identity Federation",
  },
  {
    id: "cld-5",
    domain: "Telemetry & Event Streaming",
    scenario: "Security operations requires an alert within 60 seconds whenever root user credentials are used to sign into the cloud environment.",
    question: "Which architecture achieves this near-real-time SLA?",
    options: [
      "Audit event trail streaming management events to an Event Bus with an instant notification topic subscriber",
      "Download audit logs monthly and run manual Excel spreadsheet filters",
      "Query logs using a scheduled cron job every 24 hours",
      "Rely on email notifications sent from the billing department",
    ],
    correctIndex: 0,
    explanation: "Audit events streamed directly to a real-time event router trigger pattern-matching rules in sub-second latency, notifying incident response channels without delay.",
    documentationRef: "Zapsters Cloud Architecture: Real-time Incident Notification Pipelines",
  },
  {
    id: "cld-6",
    domain: "Data Protection & KMS Envelope Encryption",
    scenario: "A compliance framework mandates that data stored in cloud object storage must be encrypted using customer-managed keys rotated annually, with audited cryptographic access.",
    question: "Which Key Management Service (KMS) key configuration fulfills this mandate?",
    options: [
      "Default cloud-provider managed keys with provider-controlled rotation",
      "Customer Managed Key (CMK) with Automatic Key Rotation enabled and strict key policy access audits",
      "Client-side encryption using a static password embedded in source code",
      "Unencrypted storage backed by client-side browser cookies",
    ],
    correctIndex: 1,
    explanation: "Customer Managed Keys (CMKs) in KMS allow explicit access policies, annual automatic rotation, and full audit trails for every encrypt and decrypt operation.",
    documentationRef: "Zapsters Key Management Standard: Key Management Best Practices & Automated Key Rotation",
  },
  {
    id: "cld-7",
    domain: "API Ingress & Edge DDoS Mitigation",
    scenario: "A critical customer portal experiences distributed HTTP flood attacks overwhelming backend application servers.",
    question: "Which edge protection architecture mitigates application-layer (Layer 7) DDoS attacks before traffic reaches compute nodes?",
    options: [
      "Deploy a Web Application Firewall (WAF) with rate-based rules attached to Global CDN and Application Load Balancer",
      "Increase the CPU core count on backend servers to absorb traffic",
      "Disable DNS servers during the peak attack window",
      "Allow all traffic through a single proxy server",
    ],
    correctIndex: 0,
    explanation: "A Web Application Firewall integrated with edge CDN and Application Load Balancers enforces rate-based limiting and managed OWASP threat rules globally, absorbing and dropping malicious Layer 7 floods before backend saturation.",
    documentationRef: "Zapsters Best Practices for DDoS Resiliency §3.2: Edge Protection with WAF",
  },
  {
    id: "cld-8",
    domain: "Zero Trust Architecture",
    scenario: "In a zero trust cloud migration, all inter-service communications between microservices across subnets must verify identity and encrypt payloads.",
    question: "Which pattern enforces mutual identity verification and encryption at transit between services?",
    options: [
      "Unencrypted plain HTTP over internal private IP addresses",
      "Mutual TLS (mTLS) with short-lived X.509 certificates managed by a service mesh (e.g. Istio / Linkerd)",
      "Single-factor password authentication cached in memory",
      "IP address whitelisting with unencrypted TCP sockets",
    ],
    correctIndex: 1,
    explanation: "Mutual TLS ensures cryptographic proof of identity for both client and server microservices while encrypting transit data, fulfilling zero trust verification principles.",
    documentationRef: "NIST SP 800-207: Zero Trust Architecture §3.1",
  },
  {
    id: "cld-9",
    domain: "Serverless Security & Execution Boundaries",
    scenario: "A serverless function processes untrusted user image uploads from object storage. The security team wants to minimize blast radius in case of an image parsing exploit.",
    question: "Which configuration principle restricts the serverless function's blast radius?",
    options: [
      "Grant the function execution role AdministratorAccess so it never fails with permissions errors",
      "Scoped execution role with storage:GetObject on the specific input prefix only, read-only root filesystem, and strict memory/timeout limits",
      "Run the serverless function with root privileges inside a public subnet with no security groups",
      "Hardcode database root passwords in the environment variables in plaintext",
    ],
    correctIndex: 1,
    explanation: "Enforcing least-privilege IAM policies, read-only root filesystem flags, and tight memory/timeout limits prevents arbitrary file persistence and lateral movement in the event of code execution vulnerabilities.",
    documentationRef: "Zapsters Serverless Security Guide: Least Privilege Function Execution Roles",
  },
  {
    id: "cld-10",
    domain: "Immutable Infrastructure & CI/CD Security",
    scenario: "A security audit discovers that production servers have differing package versions due to manual SSH hotfixes performed by developers.",
    question: "How should infrastructure deployments be modernized to prevent configuration drift?",
    options: [
      "Grant all developers root SSH access to production instances",
      "Adopt Immutable Infrastructure using HashiCorp Terraform and automated container builds via hardened CI/CD pipelines with zero manual SSH",
      "Install automated team chat alerts asking engineers not to modify servers",
      "Disable security patching to maintain identical system states",
    ],
    correctIndex: 1,
    explanation: "Immutable infrastructure treats servers as disposable artifacts. Changes are applied via declarative IaC through automated CI/CD pipelines, completely deprecating manual in-place SSH updates.",
    documentationRef: "Zapsters Well-Architected Operational Excellence Pillar §2: Automating Deployment",
  },
];
