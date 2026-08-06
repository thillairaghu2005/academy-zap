import type {
  Course,
  CourseSummary,
} from "@/lib/contracts/content";
import { hueForId } from "@/lib/visual";

/**
 * Content Engine fixtures.
 *
 * Exercises every UI state the F1 surfaces need:
 *  - an enrolled course with partial progress (resume position)
 *  - free + paid courses (entitlement CTA difference)
 *  - a course with zero reviews (reviews placeholder state)
 *  - a `draft` course, excluded from the public catalog but reachable by
 *    id — demonstrates the §4.4 draft/published distinction
 *  - search "zzzz"  → empty catalog state
 *  - search "boom"  → catalog error state
 *  - course id "missing-course" → detail 404/error state
 *  - the LAST lesson of course 1 has an expired signed manifest → player
 *    error state
 */

// Reviewer who authored the seeded in-review course (Meera Patel).
export const MOCK_REVIEWER_MEERA_ID = "2a4c6e8f-0b1d-4c3e-8f5a-9b7c1d3e5f7a";
// Threat Hunting with Sigma — seeded IN REVIEW (Task 2: all three statuses).
export const MOCK_IN_REVIEW_COURSE_ID = "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f";

const l = (
  id: string,
  title: string,
  duration_seconds: number,
  kind: "video" | "article" = "video",
) => ({ id, title, kind, duration_seconds, position: 0 });

const s = (id: string, title: string, lessons: ReturnType<typeof l>[]) => ({
  id,
  title,
  position: 0,
  lessons: lessons.map((lesson, i) => ({
    ...lesson,
    position: i + 1,
    isPreview: i === 0,
    preview_body: i === 0
      ? `Start here with ${lesson.title.toLowerCase()}. This free preview introduces the core idea and shows how the lesson connects to the hands-on work in the rest of the course.`
      : null,
  })),
});

/**
 * Last published snapshot per course id (F7 Task 2 diff view).
 *
 * When a course is published, its editable fields are snapshotted here so a
 * later revision (in_review) can be diffed against what learners actually
 * have. Mock-only — the real CMS keeps versioned rows in the `courses`
 * table; this map is the stand-in for "last published version".
 */
export interface CoursePublishedSnapshot {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: Course["level"];
  language: string;
  price_cents: number;
  estimated_hours: number;
}

const publishedSnapshots = new Map<string, CoursePublishedSnapshot>();

/** The editable fields of a course, as a snapshot row. */
export function snapshotOf(course: Course): CoursePublishedSnapshot {
  return {
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    category: course.category,
    level: course.level,
    language: course.language,
    price_cents: course.price_cents,
    estimated_hours: course.estimated_hours,
  };
}

export function setPublishedSnapshot(
  courseId: string,
  snapshot: CoursePublishedSnapshot,
): void {
  publishedSnapshots.set(courseId, snapshot);
}

export function getPublishedSnapshot(
  courseId: string,
): CoursePublishedSnapshot | undefined {
  return publishedSnapshots.get(courseId);
}


export const MOCK_COURSES: Course[] = [
  {
    id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    title: "Python for Security Analysts",
    subtitle: "Automate log triage, parse pcap dumps and script your first scans.",
    description:
      "A hands-on introduction to Python written for security analysts, not software engineers. You'll parse auth logs, decode packets, batch-process IoCs and build a small port scanner — every lesson ships with a realistic dataset to work against.",
    category: "Cybersecurity",
    level: "beginner",
    language: "English",
    status: "published",
    instructor: {
      id: "9f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81",
      display_name: "Priya Nair",
      title: "Senior Detection Engineer",
    },
    rating: 4.8,
    review_count: 214,
    price_cents: 0,
    enrolled_count: 18340,
    estimated_hours: 9,
    created_at: "2026-01-12T09:00:00Z",
    updated_at: "2026-06-01T09:00:00Z",
    syllabus: [
      s("sec-1", "Getting Started", [
        l("a1b2c3d4-0001", "Why Python for security work", 342),
        l("a1b2c3d4-0002", "Environment setup (venv, linters)", 517),
        l("a1b2c3d4-0003", "Your first log parser", 448),
      ]),
      s("sec-2", "Log & Telemetry Analysis", [
        l("a1b2c3d4-0004", "Auth-log forensics with regex", 611),
        l("a1b2c3d4-0005", "Parsing CSV threat intel feeds", 498),
        l("a1b2c3d4-0006", "Anomaly thresholds without ML", 556),
        l("a1b2c3d4-0007", "Building a triage dashboard output", 640),
      ]),
      s("sec-3", "Automating Scans", [
        l("a1b2c3d4-0008", "A minimal TCP port scanner", 702),
        l("a1b2c3d4-0009", "Parsing Nmap XML at scale", 533),
        l("a1b2c3d4-0010", "Course capstone: IoC enrichment bot", 815),
      ]),
    ],
  },
  {
    id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    title: "Offensive Web App Testing",
    subtitle: "Exploit real vulnerabilities in a lab app — OWASP top ten, hands-on.",
    description:
      "Work through the OWASP Top Ten against a deliberately vulnerable web app. Intercept traffic, chain SQLi to RCE, and write your own exploit scripts as you go.",
    category: "Cybersecurity",
    level: "intermediate",
    language: "English",
    status: "published",
    instructor: {
      id: "7f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81",
      display_name: "Ravi Kapoor",
      title: "Red Team Lead",
    },
    rating: 4.7,
    review_count: 168,
    price_cents: 149900,
    enrolled_count: 9210,
    estimated_hours: 14,
    created_at: "2026-02-20T09:00:00Z",
    updated_at: "2026-07-02T09:00:00Z",
    syllabus: [
      s("sec-1", "Setup & Recon", [
        l("b2c3d4e5-0001", "Lab topology & legal scope", 388),
        l("b2c3d4e5-0002", "Passive recon with OSINT", 472),
        l("b2c3d4e5-0003", "Active recon tooling", 534),
      ]),
      s("sec-2", "OWASP Top Ten", [
        l("b2c3d4e5-0004", "SQL injection fundamentals", 662),
        l("b2c3d4e5-0005", "XSS to session theft", 588),
        l("b2c3d4e5-0006", "IDOR & broken access control", 521),
      ]),
      s("sec-3", "Exploitation & Reporting", [
        l("b2c3d4e5-0007", "Chaining bugs for RCE", 743),
        l("b2c3d4e5-0008", "Writing the pentest report", 410, "article"),
      ]),
    ],
  },
  {
    id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
    title: "React & TypeScript Deep Dive",
    subtitle: "From hooks to advanced generics — the patterns production apps use.",
    description:
      "A rigorous tour of React 19 and TypeScript: state modelling with discriminated unions, render optimisation, data-layer abstraction, and the testing patterns that keep large frontends safe.",
    category: "Web Development",
    level: "advanced",
    language: "English",
    status: "published",
    instructor: {
      id: "5f1a9e3b-2c4d-4f6b-8c0d-7e2a9f3b1c81",
      display_name: "Sana Iyer",
      title: "Staff Frontend Engineer",
    },
    rating: 4.9,
    review_count: 97,
    price_cents: 99900,
    enrolled_count: 7420,
    estimated_hours: 11,
    created_at: "2026-03-05T09:00:00Z",
    updated_at: "2026-06-20T09:00:00Z",
    syllabus: [
      s("sec-1", "Modelling State", [
        l("c3d4e5f6-0001", "Types first: the shape of data", 512),
        l("c3d4e5f6-0002", "Discriminated unions in practice", 601),
      ]),
      s("sec-2", "Data Layers", [
        l("c3d4e5f6-0003", "Contracts, mocks and the real API", 578),
        l("c3d4e5f6-0004", "Server state with TanStack Query", 644),
      ]),
      s("sec-3", "Rendering & Testing", [
        l("c3d4e5f6-0005", "Render optimisation without memo-spam", 590),
        l("c3d4e5f6-0006", "Testing the data layer, not the DOM", 466),
      ]),
    ],
  },
  {
    id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
    title: "Linux Fundamentals for Hackers",
    subtitle: "Master the shell before you touch a target — files, pipes, and processes.",
    description:
      "The Linux skills every offensive and defensive security role assumes. Navigation, text processing pipelines, permissions, processes and the command patterns you'll use daily.",
    category: "Cybersecurity",
    level: "beginner",
    language: "English",
    status: "published",
    instructor: {
      id: "7f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81",
      display_name: "Ravi Kapoor",
      title: "Red Team Lead",
    },
    rating: 4.6,
    review_count: 431,
    price_cents: 0,
    enrolled_count: 30120,
    estimated_hours: 8,
    created_at: "2026-01-05T09:00:00Z",
    updated_at: "2026-05-15T09:00:00Z",
    syllabus: [
      s("sec-1", "The Shell", [
        l("d4e5f6a7-0001", "Navigation & file system layout", 420),
        l("d4e5f6a7-0002", "Permissions and ownership", 505),
      ]),
      s("sec-2", "Text Power", [
        l("d4e5f6a7-0003", "grep, sed, awk pipelines", 634),
        l("d4e5f6a7-0004", "Working with log streams", 512),
      ]),
      s("sec-3", "Processes & Services", [
        l("d4e5f6a7-0005", "Processes, signals and jobs", 547),
        l("d4e5f6a7-0006", "Systemd services in practice", 431),
      ]),
    ],
  },
  {
    id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
    title: "Cloud Security Essentials",
    subtitle: "IAM, network controls and logging for AWS and GCP.",
    description:
      "Design least-privilege IAM, build VPC/network segmentation, and wire centralized logging — the fundamentals that make cloud environments defensible.",
    category: "Cloud & DevOps",
    level: "intermediate",
    language: "English",
    status: "published",
    instructor: {
      id: "5f1a9e3b-2c4d-4f6b-8c0d-7e2a9f3b1c81",
      display_name: "Sana Iyer",
      title: "Staff Frontend Engineer",
    },
    rating: 4.5,
    review_count: 76,
    price_cents: 129900,
    enrolled_count: 4830,
    estimated_hours: 10,
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-07-10T09:00:00Z",
    syllabus: [
      s("sec-1", "Identity", [
        l("e5f6a7b8-0001", "IAM policies and roles", 603),
        l("e5f6a7b8-0002", "The identity boundary", 541),
      ]),
      s("sec-2", "Network", [
        l("e5f6a7b8-0003", "VPC segmentation patterns", 588),
        l("e5f6a7b8-0004", "Ingress/egress control", 502),
      ]),
      s("sec-3", "Detection", [
        l("e5f6a7b8-0005", "Centralized logging architecture", 476),
        l("e5f6a7b8-0006", "Detecting drift and exfiltration", 559),
      ]),
    ],
  },
  {
    id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c",
    title: "Data Structures & Algorithms in Go",
    subtitle: "Interview-ready fundamentals with the Go standard library.",
    description:
      "Implement queues, heaps, tries and graph traversals in Go, with complexity analysis on every exercise and a competitive-leaderboard problem set.",
    category: "Programming",
    level: "advanced",
    language: "English",
    status: "published",
    instructor: {
      id: "9f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81",
      display_name: "Priya Nair",
      title: "Senior Detection Engineer",
    },
    rating: 4.7,
    review_count: 143,
    price_cents: 89900,
    enrolled_count: 6110,
    estimated_hours: 12,
    created_at: "2026-02-14T09:00:00Z",
    updated_at: "2026-06-28T09:00:00Z",
    syllabus: [
      s("sec-1", "Foundations", [
        l("f6a7b8c9-0001", "Arrays, slices and complexity", 490),
        l("f6a7b8c9-0002", "Linked structures in Go", 566),
      ]),
      s("sec-2", "Trees & Heaps", [
        l("f6a7b8c9-0003", "Binary trees and traversal", 623),
        l("f6a7b8c9-0004", "Heap mechanics", 541),
      ]),
      s("sec-3", "Graphs", [
        l("f6a7b8c9-0005", "BFS/DFS and shortest paths", 689),
        l("f6a7b8c9-0006", "Topological sort in practice", 470),
      ]),
    ],
  },
  {
    id: "0a1b2c3d-4e5f-4a6b-7c8d-9e0f1a2b3c4d",
    title: "Networking Basics",
    subtitle: "IP, TCP and DNS — the layer cake every analyst must feel at home in.",
    description:
      "A beginner-friendly tour of the network stack with packet-level examples. Understand addressing, handshakes and DNS resolution well enough to read a packet capture.",
    category: "Cybersecurity",
    level: "beginner",
    language: "English",
    status: "published",
    instructor: {
      id: "7f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81",
      display_name: "Ravi Kapoor",
      title: "Red Team Lead",
    },
    rating: 0,
    review_count: 0,
    price_cents: 0,
    enrolled_count: 1260,
    estimated_hours: 6,
    created_at: "2026-07-01T09:00:00Z",
    updated_at: "2026-07-01T09:00:00Z",
    syllabus: [
      s("sec-1", "The Layer Cake", [
        l("0a1b2c3d-0001", "Why the OSI model still matters", 398),
        l("0a1b2c3d-0002", "IPv4 addressing and subnets", 542),
      ]),
      s("sec-2", "Transport & DNS", [
        l("0a1b2c3d-0003", "TCP handshake, three ways", 461),
        l("0a1b2c3d-0004", "DNS resolution end to end", 528),
      ]),
    ],
  },
  {
    id: "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
    title: "Zero Trust Architecture",
    subtitle: "Draft — designing a zero-trust network, lesson by lesson.",
    description:
      "A draft course on designing zero-trust architectures: identity-first access, micro-segmentation, and continuous verification. Not published yet — visible only via author preview.",
    category: "Cloud & DevOps",
    level: "advanced",
    language: "English",
    status: "draft",
    instructor: {
      id: "5f1a9e3b-2c4d-4f6b-8c0d-7e2a9f3b1c81",
      display_name: "Sana Iyer",
      title: "Staff Frontend Engineer",
    },
    rating: 0,
    review_count: 0,
    price_cents: 199900,
    enrolled_count: 0,
    estimated_hours: 7,
    created_at: "2026-07-20T09:00:00Z",
    updated_at: "2026-07-28T09:00:00Z",
    syllabus: [
      s("sec-1", "Principles", [
        l("1b2c3d4e-0001", "Why trust is the attack surface", 442),
        l("1b2c3d4e-0002", "Identity-first access", 389),
      ]),
      s("sec-2", "Architecture", [
        l("1b2c3d4e-0003", "Micro-segmentation patterns", 510),
        l("1b2c3d4e-0004", "Continuous verification loops", 466),
      ]),
    ],
  },
  {
    id: MOCK_IN_REVIEW_COURSE_ID,
    title: "Threat Hunting with Sigma",
    subtitle: "Write detection rules that survive real-world noise.",
    description:
      "A practical course on building Sigma rules from telemetry: log sources, correlation across hosts, tuning false positives, and validating detections against live captures before they ever reach production.",
    category: "Cybersecurity",
    level: "intermediate",
    language: "English",
    status: "in_review",
    instructor: {
      id: MOCK_REVIEWER_MEERA_ID,
      display_name: "Meera Patel",
      title: "Detection Engineer",
    },
    rating: 0,
    review_count: 0,
    price_cents: 149900,
    enrolled_count: 0,
    estimated_hours: 9,
    created_at: "2026-07-18T09:00:00Z",
    updated_at: "2026-07-29T09:00:00Z",
    submitted_by: MOCK_REVIEWER_MEERA_ID,
    reviewed_by: null,
    syllabus: [
      s("sec-1", "Sigma Foundations", [
        l("2c3d4e5f-0001", "Detection-as-code with Sigma", 431),
        l("2c3d4e5f-0002", "Writing your first rule", 498),
      ]),
      s("sec-2", "Validation & Tuning", [
        l("2c3d4e5f-0003", "Testing against capture files", 552),
        l("2c3d4e5f-0004", "False-positive triage", 489),
      ]),
    ],
  },
];

// Seed the in-review course's LAST PUBLISHED version so the review diff has
// something to compare against (Task 2). The current draft has since moved:
// subtitle, description, level, price and hours all differ below.
setPublishedSnapshot(MOCK_IN_REVIEW_COURSE_ID, {
  title: "Threat Hunting with Sigma",
  subtitle: "Detection engineering for blue teams.",
  description:
    "An introduction to Sigma rules for blue teams: what detections are, how to write them, and how to keep them from firing on benign traffic.",
  category: "Cybersecurity",
  level: "advanced",
  language: "English",
  price_cents: 199900,
  estimated_hours: 10,
});

/** Draft courses exist but are excluded from the public catalog. */
export const MOCK_COURSES_BY_ID = new Map(
  MOCK_COURSES.map((course) => [course.id, course]),
);

/**
 * F7 admin helpers — mutate the fixture store the way the real CMS writes
 * the `courses` table. `upsertCourse` adds or patches in place so every
 * consumer (catalog, detail, player) sees the change immediately.
 */
export function upsertCourse(course: Course): Course {
  const existing = MOCK_COURSES_BY_ID.get(course.id);
  if (existing) {
    Object.assign(existing, course);
  } else {
    MOCK_COURSES.push(course);
    MOCK_COURSES_BY_ID.set(course.id, course);
  }
  return course;
}

export function deleteCourseById(courseId: string): boolean {
  const index = MOCK_COURSES.findIndex((c) => c.id === courseId);
  if (index === -1) return false;
  MOCK_COURSES.splice(index, 1);
  MOCK_COURSES_BY_ID.delete(courseId);
  return true;
}

export const MOCK_DRAFT_COURSE_ID = "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e";
export const MOCK_ENROLLED_COURSE_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
// Go DSA course — seeded as fully completed for the demo learner.
export const MOCK_COMPLETED_COURSE_ID = "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c";
// Linux Fundamentals course — seeded as a fresh 0% enrollment.
export const MOCK_FRESH_COURSE_ID = "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a";
export const MOCK_EXPIRED_MANIFEST_LESSON_ID = "a1b2c3d4-0010";

export function courseToSummary(course: Course): CourseSummary {
  return {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle,
    category: course.category,
    level: course.level,
    rating: course.rating,
    review_count: course.review_count,
    price_cents: course.price_cents,
    enrolled_count: course.enrolled_count,
    estimated_hours: course.estimated_hours,
    instructor_name: course.instructor.display_name,
    language: course.language,
    cover_hue: hueForId(course.id),
  };
}
