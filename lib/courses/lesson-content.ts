/**
 * Domain-specific lesson content bank for Zapsters Academy courses.
 * Modeled after AWS Skill Builder and IBM SkillsBuild enterprise curriculum standards.
 */

export interface LessonContentPayload {
  body: string;
  bestPractice: {
    title: string;
    description: string;
  };
  keyTakeaways: string[];
}

export function getLessonContent(
  courseTitle: string,
  category: string,
  lessonTitle: string,
  lessonId: string,
): LessonContentPayload {
  const titleLower = courseTitle.toLowerCase();
  const lessonLower = lessonTitle.toLowerCase();

  // 1. React & TypeScript Deep Dive Course
  if (
    titleLower.includes("react") ||
    titleLower.includes("typescript") ||
    category.toLowerCase().includes("web") ||
    lessonLower.includes("shape of data") ||
    lessonLower.includes("types first") ||
    lessonLower.includes("discriminated union") ||
    lessonLower.includes("tanstack") ||
    lessonLower.includes("data layer") ||
    lessonLower.includes("render optimisation") ||
    lessonId.startsWith("c3d4e5f6")
  ) {
    if (lessonLower.includes("shape of data") || lessonLower.includes("types first")) {
      return {
        body: `## Types First: The Shape of Data in Modern Applications

Welcome to this technical module. In modern enterprise React and TypeScript engineering, architecture begins with the **domain model**, not the component hierarchy. When data shapes are poorly defined or rely on loosely coupled boolean flags, runtime failures become inevitable.

In this deep dive, we replace error-prone implicit state with mathematically sound, compile-time verified domain models.

---

### 1. The Fallacy of Loose Boolean State Bags

In traditional frontend development, asynchronous state is frequently modeled using discrete, uncoordinated properties:

\`\`\`typescript
// ❌ ANTI-PATTERN: Allows 8 combinations, 4 of which are illegal impossible states!
interface UserViewState {
  isLoading: boolean;
  isError: boolean;
  data: User | null;
  errorMessage: string | null;
}
\`\`\`

Consider what happens if \`isLoading\` is \`true\` while \`data\` is non-null and \`isError\` is \`true\`. Does the UI render a loading spinner, error alert, or stale data? The TypeScript compiler cannot protect you because all 8 combinations are valid according to the interface.

---

### 2. Modeling State with Discriminated Unions

A **discriminated union** (or tagged union) pairs a literal discriminant property (like \`status\`) with only the fields valid in that state:

\`\`\`typescript
// ✅ ENTERPRISE STANDARD: Exactly one state is valid at any instant
export type RemoteData<TData, TError = Error> =
  | { status: "idle"; data?: never; error?: never }
  | { status: "loading"; data?: never; error?: never }
  | { status: "success"; data: TData; error?: never }
  | { status: "error"; data?: never; error: TError };

export function matchRemoteData<TData, TResult>(
  state: RemoteData<TData>,
  matchers: {
    idle: () => TResult;
    loading: () => TResult;
    success: (data: TData) => TResult;
    error: (err: Error) => TResult;
  }
): TResult {
  switch (state.status) {
    case "idle":
      return matchers.idle();
    case "loading":
      return matchers.loading();
    case "success":
      return matchers.success(state.data);
    case "error":
      return matchers.error(state.error);
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
\`\`\`

With this structure, attempting to access \`state.data\` when \`state.status === "loading"\` triggers a compile error (**TS2339**). TypeScript guarantees data presence only after narrowing.

---

### 3. Preventing Entity Confusion with Branded Types

Primitive obsession occurs when database IDs, tokens, and keys are all represented as plain \`string\`. This allows subtle bugs where a \`courseId\` is passed to an API expecting a \`learnerId\`.

Using TypeScript's **nominal branding technique**, you can enforce zero-runtime-cost type safety:

\`\`\`typescript
declare const __brand: unique symbol;
export type Brand<K, T> = K & { readonly [__brand]: T };

export type CourseId = Brand<string, "CourseId">;
export type LearnerId = Brand<string, "LearnerId">;

export function fetchEnrollment(learnerId: LearnerId, courseId: CourseId) {
  // Types safely enforce correct argument order
  return api.get(\`/learners/\${learnerId}/courses/\${courseId}\`);
}
\`\`\`

---

### 4. Compile-Time Exhaustiveness Checking

Whenever you add new business states (for example, \`status: "refreshing"\` or \`status: "stale"\`), you need assurance that every renderer, selector, and reducer handles the new variant.

By feeding unhandled union branches to a function accepting type \`never\`, the TypeScript compiler flags omitted branches:

\`\`\`typescript
export function assertNever(value: never, message = "Unexpected discriminated variant"): never {
  throw new Error(\`\${message}: \${JSON.stringify(value)}\`);
}
\`\`\`

If a switch case is missing, the build breaks immediately, protecting production releases.`,
        bestPractice: {
          title: "Make Illegal States Unrepresentable",
          description:
            "Never use separate boolean flags for loading, error, and success. Model async lifecycle states as discriminated unions so invalid combinations cannot compile.",
        },
        keyTakeaways: [
          "Discriminated unions ensure that data fields are accessible only when their state discriminant is proven at compile time.",
          "Branded types eliminate parameter transposition errors without adding any runtime memory or performance overhead.",
          "Exhaustive switch statements with `never` assertion turn omitted state handling into immediate build-time errors.",
          "Domain models should drive UI component architecture, never the other way around.",
        ],
      };
    }

    if (lessonLower.includes("discriminated union")) {
      return {
        body: `## Discriminated Unions in Practice: Reducers & Workflows

In production single-page applications, complex state workflows—such as checkout funnels, multi-step code submission editors, and permission gates—must remain predictable.

In this lesson, we apply discriminated unions to React 19 state machines and polymorphic component architectures.

---

### 1. Reducer State Machine Architecture

When managing complex local state, \`useReducer\` combined with discriminated actions provides deterministic state transitions:

\`\`\`typescript
type SubmissionState =
  | { stage: "draft"; code: string; lastSavedAt: Date }
  | { stage: "running_tests"; code: string; testSuiteId: string; progressPct: number }
  | { stage: "completed"; code: string; score: number; passedTests: number; totalTests: number }
  | { stage: "failed"; code: string; errorSummary: string; retryCount: number };

type SubmissionAction =
  | { type: "EDIT_CODE"; newCode: string }
  | { type: "RUN_TESTS"; testSuiteId: string }
  | { type: "UPDATE_PROGRESS"; pct: number }
  | { type: "TESTS_FINISHED"; score: number; passed: number; total: number }
  | { type: "TESTS_FAILED"; error: string };

function submissionReducer(state: SubmissionState, action: SubmissionAction): SubmissionState {
  switch (action.type) {
    case "EDIT_CODE":
      if (state.stage === "running_tests") return state; // Guard: immutable while running
      return { ...state, code: action.newCode, lastSavedAt: new Date() };

    case "RUN_TESTS":
      return { stage: "running_tests", code: state.code, testSuiteId: action.testSuiteId, progressPct: 0 };

    case "UPDATE_PROGRESS":
      if (state.stage !== "running_tests") return state;
      return { ...state, progressPct: action.pct };

    case "TESTS_FINISHED":
      return { stage: "completed", code: state.code, score: action.score, passedTests: action.passed, totalTests: action.total };

    case "TESTS_FAILED":
      return { stage: "failed", code: state.code, errorSummary: action.error, retryCount: (state.stage === "failed" ? state.retryCount + 1 : 1) };
  }
}
\`\`\`

---

### 2. Polymorphic Component Props

Discriminated unions also power flexible component libraries where different prop combinations depend on a \`variant\` or \`as\` prop:

\`\`\`typescript
type AnchorProps = React.ComponentPropsWithoutRef<"a"> & { as: "a"; href: string };
type ButtonElementProps = React.ComponentPropsWithoutRef<"button"> & { as?: "button"; href?: never };

type PolymorphicActionProps = AnchorProps | ButtonElementProps;

export function ActionControl(props: PolymorphicActionProps) {
  if (props.as === "a") {
    return <a {...props} className="text-primary hover:underline" />;
  }
  return <button {...props} type={props.type || "button"} className="btn-primary" />;
}
\`\`\``,
        bestPractice: {
          title: "Model State Transitions Explicitly",
          description:
            "Pair `useReducer` with discriminated action types. Ignore irrelevant actions when in incompatible states to prevent state machine poisoning.",
        },
        keyTakeaways: [
          "State machines prevent race conditions and illegal workflow transitions in complex frontend funnels.",
          "Polymorphic components use discriminated props to ensure anchor and button attributes are never illegally mixed.",
          "Discriminated unions ensure payload types match action descriptors precisely.",
        ],
      };
    }

    if (lessonLower.includes("contracts") || lessonLower.includes("mock")) {
      return {
        body: `## Contracts, Mocks and the Real API

Frontend applications sit at the boundary between untrusted external network responses and strongly typed React components. Relying purely on TypeScript interfaces for network calls introduces a false sense of security because TypeScript types are erased at runtime.

---

### 1. Runtime Schema Validation with Zod

By pairing runtime schema validators such as **Zod** with TypeScript, you parse, validate, and infer types from a single source of truth:

\`\`\`typescript
import { z } from "zod";

export const CourseLessonSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  duration_seconds: z.number().int().nonnegative(),
  kind: z.enum(["video", "article", "quiz", "lab"]),
  isPreview: z.boolean().default(false),
});

export const CourseSyllabusSchema = z.object({
  id: z.string(),
  title: z.string(),
  lessons: z.array(CourseLessonSchema),
});

// Infer static TypeScript types directly from schemas
export type CourseLesson = z.infer<typeof CourseLessonSchema>;
export type CourseSyllabus = z.infer<typeof CourseSyllabusSchema>;
\`\`\`

---

### 2. Mock Service Worker (MSW) Contract Alignment

Mocking APIs with ad-hoc JSON objects frequently drifts out of sync with production backend changes. Using Mock Service Worker (MSW) at the network layer intercept level guarantees that both unit tests and development sandboxes validate against the exact same Zod contracts.

\`\`\`typescript
import { http, HttpResponse } from "msw";

export const courseApiHandlers = [
  http.get("/api/v1/courses/:id", ({ params }) => {
    const mockData = getMockCourse(String(params.id));
    // Validate mock against real contract before returning
    const parsed = CourseDetailSchema.safeParse(mockData);
    if (!parsed.success) {
      return HttpResponse.json({ error: "Mock drift detected", issues: parsed.error.issues }, { status: 500 });
    }
    return HttpResponse.json(parsed.data);
  }),
];
\`\`\``,
        bestPractice: {
          title: "Validate at the Network Perimeter",
          description:
            "Never cast raw fetch results with `as ExpectedType`. Use `schema.parse(json)` at the client boundary to catch breaking backend API changes before components render.",
        },
        keyTakeaways: [
          "TypeScript types provide compile-time safety; runtime schema validators like Zod ensure runtime safety.",
          "Single source of truth: generate TypeScript types directly from Zod schemas with `z.infer`.",
          "Contract-driven mocking with MSW prevents frontend drift against backend microservice APIs.",
        ],
      };
    }

    if (lessonLower.includes("tanstack") || lessonLower.includes("server state")) {
      return {
        body: `## Server State Architecture with TanStack Query

A common architectural flaw in React applications is treating server responses as local client state. Server state is remote, asynchronous, shared among multiple clients, and inherently stale the moment it arrives in the browser.

---

### 1. Hierarchical Query Key Factories

To avoid cache collision and enable targeted invalidation, organize query keys into structured tuples using a dedicated Query Key Factory:

\`\`\`typescript
export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  list: (filters: { category?: string; level?: string }) =>
    [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  progress: (courseId: string, userId: string) =>
    [...courseKeys.detail(courseId), "progress", userId] as const,
};
\`\`\`

---

### 2. Optimistic Updates with Rollback

When a learner marks a topic as complete, the UI should update instantaneously without waiting for network round-trips:

\`\`\`typescript
export function useCompleteTopic(courseId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topicId: string) => api.completeTopic({ courseId, topicId, userId }),
    onMutate: async (topicId) => {
      const queryKey = courseKeys.progress(courseId, userId);
      await queryClient.cancelQueries({ queryKey });

      const previousProgress = queryClient.getQueryData<CourseProgress>(queryKey);

      // Optimistically update cache
      if (previousProgress) {
        queryClient.setQueryData<CourseProgress>(queryKey, {
          ...previousProgress,
          completed_lesson_ids: [...previousProgress.completed_lesson_ids, topicId],
          progress_pct: Math.min(100, previousProgress.progress_pct + 10),
        });
      }

      return { previousProgress, queryKey };
    },
    onError: (_err, _topicId, context) => {
      // Rollback on network failure
      if (context?.previousProgress) {
        queryClient.setQueryData(context.queryKey, context.previousProgress);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
}
\`\`\``,
        bestPractice: {
          title: "Distinguish Server Cache from Local State",
          description:
            "Store remote data in TanStack Query with deterministic Query Key Factories. Keep React's `useState` strictly for ephemeral UI state such as open dialogs and cursor focus.",
        },
        keyTakeaways: [
          "Query key factories prevent typos and ensure deterministic, scalable cache invalidation across the app.",
          "Optimistic mutations deliver sub-16ms perceived UI updates with automated rollback safeguards.",
          "Configure `staleTime` based on resource volatility; not all data requires background re-fetching on window focus.",
        ],
      };
    }

    if (lessonLower.includes("render") || lessonLower.includes("memo")) {
      return {
        body: `## Render Optimisation Without Memo-Spam

In modern React applications, premature optimization using \`useMemo\` and \`useCallback\` frequently clutters codebases while actually hurting performance through continuous dependency comparison overhead and closure allocations.

---

### 1. Measuring Before Optimizing

Before wrapping functions in \`useCallback\`, measure the actual cost using the React 19 Profiler or custom performance marks:

\`\`\`typescript
import { Profiler, ProfilerOnRenderCallback } from "react";

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration > 16) {
    console.warn(\`[Slow Render Alert] \${id} (\${phase}): \${actualDuration.toFixed(2)}ms\`);
  }
};
\`\`\`

---

### 2. Component Composition: The Natural Optimizer

Often, 90% of re-renders can be eliminated by restructuring component hierarchies instead of memoizing:

\`\`\`tsx
// ❌ RE-RENDERS ENTIRE HEAVY CHILD TREE ON EVERY SCROLL:
function CourseViewer() {
  const [scrollY, setScrollY] = useState(0);
  return (
    <div onScroll={(e) => setScrollY(e.currentTarget.scrollTop)}>
      <ScrollIndicator position={scrollY} />
      <HeavyCourseSyllabusTree />
    </div>
  );
}

// ✅ LIFT CONTENT UP AS CHILDREN — HeavyCourseSyllabusTree NEVER re-renders!
function ScrollTracker({ children }: { children: React.ReactNode }) {
  const [scrollY, setScrollY] = useState(0);
  return (
    <div onScroll={(e) => setScrollY(e.currentTarget.scrollTop)}>
      <ScrollIndicator position={scrollY} />
      {children}
    </div>
  );
}
\`\`\`

Because \`HeavyCourseSyllabusTree\` is passed as \`children\` created in the outer scope, its JSX element reference remains identical across state changes in \`ScrollTracker\`.`,
        bestPractice: {
          title: "Prefer Composition Over Manual Memoization",
          description:
            "Lift invariant components up through `children` or push fast-changing state down to isolated leaf nodes. Only apply `useMemo` for computationally heavy algorithms (>5ms).",
        },
        keyTakeaways: [
          "Component composition preserves element identity, preventing child re-renders naturally.",
          "Wrapping cheap expressions in `useMemo` wastes memory on dependency arrays and hook metadata.",
          "React 19 compiler primitives automate memoization without manual boilerplate in modern toolchains.",
        ],
      };
    }

    if (lessonLower.includes("testing") || lessonLower.includes("dom")) {
      return {
        body: `## Testing the Data Layer, Not the DOM

A pervasive source of test flakiness in React projects is coupling unit test assertions to ephemeral CSS classes and DOM structures. When a design system updates its Tailwind utility classes, fragile DOM tests break even though application business logic remains 100% correct.

---

### 1. Isolated Hook Testing with Vitest

By testing custom React hooks and state machines directly using \`renderHook\`, you test business rules, mutations, and cache transitions with zero DOM coupling:

\`\`\`typescript
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useCourseProgress } from "@/hooks/use-course-progress";
import { createTestQueryClientWrapper } from "@/test/utils";

describe("useCourseProgress", () => {
  it("transitions topic status from in-progress to completed", async () => {
    const { wrapper } = createTestQueryClientWrapper();
    const { result } = renderHook(() => useCourseProgress("react-ts-deep-dive"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.completeTopic("topic-1");
    });

    await waitFor(() => {
      expect(result.current.completedTopicIds).toContain("topic-1");
      expect(result.current.progressPct).toBe(20);
    });
  });
});
\`\`\`

---

### 2. Contract Testing Over UI Scrapes

Test the contract: verify that actions send the right payload, receive expected status responses, and update state machines correctly. Leave visual layout testing to visual regression tools.`,
        bestPractice: {
          title: "Test State & Contracts, Decouple From DOM",
          description:
            "Author unit tests against custom hooks and data layers using Vitest and Mock Service Worker. Never assert on internal CSS classes or fragile DOM hierarchy.",
        },
        keyTakeaways: [
          "Testing data layers directly with `renderHook` yields lightning-fast tests that survive UI redesigns.",
          "Verify state transitions and side effects rather than specific HTML tag hierarchies.",
          "Combine Vitest with MSW to ensure network boundary contracts hold true in isolation.",
        ],
      };
    }
  }

  // 2. Fallback for other courses (Python, Cloud, Linux, etc.)
  return {
    body: `## ${lessonTitle}
Part of ${courseTitle} · Official Enterprise Curriculum

Welcome to this technical module. In this topic, we examine the production design patterns, operational guardrails, and compliance principles essential for enterprise-grade deployments.

### 1. Core Principles & Domain Architecture

Scalable production architectures require clear separation of concerns, strong contract boundaries, and verifiable telemetry:

- **Decouple state from execution:** Treat computational workers as disposable and stateful storage as managed, durable persistence.
- **Enforce security & boundary controls:** Verify all inputs at the perimeter, audit privilege boundaries, and enforce encryption in transit and at rest.
- **Continuous validation & automated testing:** Leverage automated test harnesses and continuous compliance monitoring to prevent regression drift.

\`\`\`typescript
// Production design pattern demonstration for ${courseTitle}
export interface EnterpriseServiceConfig {
  readonly environment: "production" | "staging" | "sandbox";
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly telemetryEnabled: boolean;
}

export function validateServiceConfig(config: unknown): EnterpriseServiceConfig {
  if (typeof config !== "object" || config === null) {
    throw new Error("Invalid configuration payload");
  }
  return config as EnterpriseServiceConfig;
}
\`\`\`

### 2. Operational Tradeoffs & Reliability Pillars

1. **Principle of Least Privilege:** Minimize blast radius by granting only the exact permissions needed for execution.
2. **Deterministic Reproducibility:** Ensure all workflows can be executed identically across local sandboxes, continuous integration, and production clusters.
3. **Automated Drift Detection:** Continuously audit active runtime state against approved declarative specifications.`,
    bestPractice: {
      title: "Enforce Clear Boundary Abstractions",
      description:
        "Separate business logic from presentation and transport protocols. Ensure contracts are verified at compile time and runtime boundaries.",
    },
    keyTakeaways: [
      "Understand the operational trade-offs of modern production architectures.",
      "Apply least-privilege principles and strong boundary validation across all components.",
      "Verify implementations using interactive sandbox labs and scenario knowledge checks.",
    ],
  };
}
