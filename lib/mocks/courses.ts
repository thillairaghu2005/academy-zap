import type {
  Course,
  CourseInstructor,
  CourseSection,
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

/* ------------------------------------------------------------------ */
/*  Marketplace catalog extension                                      */
/*                                                                     */
/*  The marketplace surface needs a deep catalog (30+ courses across   */
/*  every category). Each entry below is expanded into a full `Course` */
/*  with a generated syllabus so detail pages, search, admin and the   */
/*  player all resolve exactly like the hand-written fixtures above.   */
/* ------------------------------------------------------------------ */

interface MarketplaceCourseSpec {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: Course["level"];
  hours: number;
  price_cents: number;
  rating: number;
  review_count: number;
  enrolled_count: number;
  created_at: string;
  format: NonNullable<Course["format"]>;
  career_track: NonNullable<Course["career_track"]>;
  instructor_id: string;
  sections: [sectionTitle: string, lessonTitles: string[]][];
}

const MARKETPLACE_INSTRUCTORS: Record<string, CourseInstructor> = {
  ravi: { id: "7f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81", display_name: "Ravi Kapoor", title: "Red Team Lead" },
  priya: { id: "9f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81", display_name: "Priya Nair", title: "Senior Detection Engineer" },
  meera: { id: MOCK_REVIEWER_MEERA_ID, display_name: "Meera Patel", title: "Detection Engineer" },
  sana: { id: "5f1a9e3b-2c4d-4f6b-8c0d-7e2a9f3b1c81", display_name: "Sana Iyer", title: "Staff Frontend Engineer" },
  arjun: { id: "3d7e1f5b-9c2a-4d8e-b6f0-a1c3e5d7f9b1", display_name: "Arjun Mehta", title: "Principal Cloud Architect" },
  vikram: { id: "4e8f2a6c-0d3b-4e9f-a7c1-b2d4f6a8c0e2", display_name: "Vikram Shah", title: "ML Engineer" },
  divya: { id: "5c9d3b7e-1e4c-4f0a-b8d2-c3e5a7d9f1f3", display_name: "Divya Rao", title: "Staff Full-Stack Engineer" },
  kabir: { id: "6d0e4c8f-2f5d-4a1b-9e3d-d4f6b8e0a2a4", display_name: "Kabir Anand", title: "Systems Engineer" },
};

/** Deterministic lesson duration from the lesson id (mock stand-in for authored media). */
function lessonSeconds(id: string, index: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return 300 + (hash % 420) + index * 12;
}

function marketplaceCourseFromSpec(spec: MarketplaceCourseSpec): Course {
  const syllabus: CourseSection[] = spec.sections.map(([title, lessons], sectionIndex) => ({
    id: `${spec.id}-sec-${sectionIndex + 1}`,
    title,
    position: sectionIndex + 1,
    lessons: lessons.map((lessonTitle, lessonIndex) => {
      const id = `${spec.id}-l${sectionIndex + 1}${lessonIndex + 1}`;
      return {
        id,
        title: lessonTitle,
        kind: lessonIndex === lessons.length - 1 && sectionIndex === spec.sections.length - 1 ? ("article" as const) : ("video" as const),
        duration_seconds: lessonSeconds(id, lessonIndex),
        position: lessonIndex + 1,
        isPreview: sectionIndex === 0 && lessonIndex === 0,
        preview_body:
          sectionIndex === 0 && lessonIndex === 0
            ? `Start here with ${lessonTitle.toLowerCase()}. This free preview introduces the core idea and shows how the lesson connects to the hands-on work in the rest of the course.`
            : null,
      };
    }),
  }));
  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.subtitle,
    description: spec.description,
    category: spec.category,
    level: spec.level,
    language: "English",
    status: "published",
    instructor: MARKETPLACE_INSTRUCTORS[spec.instructor_id] ?? MARKETPLACE_INSTRUCTORS.ravi!,
    rating: spec.rating,
    review_count: spec.review_count,
    price_cents: spec.price_cents,
    enrolled_count: spec.enrolled_count,
    estimated_hours: spec.hours,
    created_at: spec.created_at,
    updated_at: spec.created_at,
    format: spec.format,
    career_track: spec.career_track,
    is_project_based: spec.format === "project" || spec.format === "lab",
    certificate_included: true,
    syllabus,
  };
}

const MARKETPLACE_COURSE_SPECS: MarketplaceCourseSpec[] = [
  // --- Cybersecurity ---------------------------------------------------
  {
    id: "soc-analyst-fundamentals",
    title: "SOC Analyst Fundamentals",
    subtitle: "Triage alerts, hunt threats and run the SOC workflow like a tier-one analyst.",
    description:
      "Step into the security operations center. You'll learn the alert triage lifecycle, how SIEM rules fire, escalation criteria, and the documentation habits that separate good analysts from great ones — with realistic alert queues to work through.",
    category: "Cybersecurity",
    level: "beginner",
    hours: 10,
    price_cents: 129900,
    rating: 4.7,
    review_count: 189,
    enrolled_count: 11450,
    created_at: "2026-03-18T09:00:00Z",
    format: "video",
    career_track: "cyber_security",
    instructor_id: "meera",
    sections: [
      ["Inside the SOC", ["SOC roles and shift rhythm", "Alert queue anatomy", "True vs false positives"]],
      ["Triage Workflow", ["Investigating a phishing alert", "Endpoint alerts and process trees", "Enrichment with threat intel"]],
      ["Escalate & Document", ["Writing escalation notes", "Handoff to incident response", "Capstone: triage a live queue"]],
    ],
  },
  {
    id: "network-traffic-analysis",
    title: "Network Traffic Analysis",
    subtitle: "Read packet captures like a story — protocols, anomalies and hidden channels.",
    description:
      "A hands-on tour of network traffic analysis with Wireshark and Zeek. Follow real capture files through DNS tunneling, beaconing detection, TLS fingerprinting and protocol anomaly hunting.",
    category: "Cybersecurity",
    level: "intermediate",
    hours: 9,
    price_cents: 99900,
    rating: 4.8,
    review_count: 156,
    enrolled_count: 8730,
    created_at: "2026-04-08T09:00:00Z",
    format: "lab",
    career_track: "cyber_security",
    instructor_id: "priya",
    sections: [
      ["Capture Fundamentals", ["Capture points and filters", "Reading a pcap like prose", "Protocol dissection drills"]],
      ["Hunting Techniques", ["Spotting C2 beaconing", "DNS tunneling in practice", "JA3/TLS fingerprints"]],
      ["Analysis Workflows", ["Zeek logs at scale", "Building timeline narratives", "Capstone: investigate an exfil attempt"]],
    ],
  },
  {
    id: "digital-forensics-fundamentals",
    title: "Digital Forensics Fundamentals",
    subtitle: "Acquire, preserve and analyze evidence without breaking the chain of custody.",
    description:
      "Learn forensic acquisition and analysis on disk images and memory dumps: hashing, timeline creation, artifact carving and reporting — every exercise uses realistic evidence sets.",
    category: "Cybersecurity",
    level: "beginner",
    hours: 8,
    price_cents: 0,
    rating: 4.6,
    review_count: 203,
    enrolled_count: 15980,
    created_at: "2026-02-02T09:00:00Z",
    format: "video",
    career_track: "cyber_security",
    instructor_id: "meera",
    sections: [
      ["Evidence Basics", ["What counts as evidence", "Acquisition and imaging", "Hashing and integrity"]],
      ["Artifact Analysis", ["Filesystem timelines", "Registry and log artifacts", "Carving deleted files"]],
      ["Reporting", ["Writing findings that hold up", "Capstone: analyze a suspect image"]],
    ],
  },
  {
    id: "malware-analysis-basics",
    title: "Malware Analysis Basics",
    subtitle: "Dissect suspicious binaries in a safe lab — static triage to behavioral analysis.",
    description:
      "A practical introduction to malware triage: static analysis with PE inspection, sandboxed detonation, unpacking basics and writing IOCs from your findings.",
    category: "Cybersecurity",
    level: "intermediate",
    hours: 11,
    price_cents: 149900,
    rating: 4.7,
    review_count: 98,
    enrolled_count: 5240,
    created_at: "2026-05-06T09:00:00Z",
    format: "lab",
    career_track: "cyber_security",
    instructor_id: "ravi",
    sections: [
      ["Lab Setup & Safety", ["Isolated analysis environments", "Tooling overview", "Sample handling"]],
      ["Static Triage", ["PE headers and imports", "Strings, entropy and packing", "Hashing and threat intel"]],
      ["Behavioral Analysis", ["Detonation and observation", "Network behavior signatures", "Capstone: full report on a sample"]],
    ],
  },
  {
    id: "practical-osint-recon",
    title: "Practical OSINT & Recon",
    subtitle: "Map an organization's attack surface using only open sources.",
    description:
      "Collect, pivot and operationalize open-source intelligence: domain mapping, breach data hygiene, social footprinting and legal boundaries — culminating in a full recon report.",
    category: "Cybersecurity",
    level: "beginner",
    hours: 6,
    price_cents: 0,
    rating: 4.5,
    review_count: 167,
    enrolled_count: 20140,
    created_at: "2026-06-14T09:00:00Z",
    format: "video",
    career_track: "cyber_security",
    instructor_id: "ravi",
    sections: [
      ["OSINT Foundations", ["The OSINT mindset and ethics", "Domain and cert transparency recon", "People and org footprinting"]],
      ["Pivot & Automate", ["Breach data the responsible way", "Automating collection", "Operational security for investigators"]],
      ["Deliverables", ["Turning findings into risk", "Capstone: recon report"]],
    ],
  },
  // --- Web Development -------------------------------------------------
  {
    id: "modern-javascript",
    title: "Modern JavaScript",
    subtitle: "The language features production code actually relies on — ES2024 and beyond.",
    description:
      "Close the gap between tutorial JavaScript and professional JavaScript: modules, iterators, async patterns, proxies, memory model and the tooling ecosystem, each with exercises drawn from real codebases.",
    category: "Web Development",
    level: "intermediate",
    hours: 9,
    price_cents: 0,
    rating: 4.7,
    review_count: 287,
    enrolled_count: 26310,
    created_at: "2026-01-22T09:00:00Z",
    format: "video",
    career_track: "web_development",
    instructor_id: "divya",
    sections: [
      ["Language Core", ["Modules and bundling reality", "Closures, prototypes and classes", "Iterators and generators"]],
      ["Async Mastery", ["Promises from first principles", "async/await control flow", "Cancellation with AbortController"]],
      ["Advanced Patterns", ["Proxies and reflection", "Memory leaks and GC", "Capstone: build a tiny reactive store"]],
    ],
  },
  {
    id: "full-stack-nextjs",
    title: "Full Stack Next.js Development",
    subtitle: "Ship a production app end to end — routing, data, auth, caching and deploys.",
    description:
      "Build and deploy a complete full-stack application with Next.js: server components, data fetching layers, authentication, caching strategy, testing and production observability.",
    category: "Web Development",
    level: "intermediate",
    hours: 16,
    price_cents: 199900,
    rating: 4.8,
    review_count: 134,
    enrolled_count: 6890,
    created_at: "2026-05-20T09:00:00Z",
    format: "project",
    career_track: "web_development",
    instructor_id: "sana",
    sections: [
      ["App Architecture", ["Server and client components", "Routing and layouts", "Streaming and suspense"]],
      ["Data & Auth", ["Data access layers", "Session-based auth", "Mutations and revalidation"]],
      ["Production Readiness", ["Caching and performance budgets", "Testing strategy", "Capstone: deploy and observe"]],
    ],
  },
  {
    id: "nodejs-backend-engineering",
    title: "Node.js Backend Engineering",
    subtitle: "APIs, queues and storage — design services that survive production traffic.",
    description:
      "Engineer reliable Node.js backends: HTTP framework internals, database access patterns, background jobs, idempotency, observability and graceful degradation under load.",
    category: "Web Development",
    level: "advanced",
    hours: 13,
    price_cents: 149900,
    rating: 4.6,
    review_count: 112,
    enrolled_count: 5120,
    created_at: "2026-03-29T09:00:00Z",
    format: "video",
    career_track: "web_development",
    instructor_id: "divya",
    sections: [
      ["Service Foundations", ["HTTP servers and middleware", "Config and secrets", "Structured logging"]],
      ["Data & Reliability", ["Connection pools and transactions", "Idempotent write paths", "Background jobs and retries"]],
      ["Operating Under Load", ["Backpressure and timeouts", "Health checks and metrics", "Capstone: load-test your API"]],
    ],
  },
  {
    id: "web-performance-engineering",
    title: "Web Performance Engineering",
    subtitle: "Measure, budget and fix — Core Web Vitals as an engineering discipline.",
    description:
      "A systematic approach to web performance: profiling, bundle analysis, rendering pipelines, image strategy and performance budgets enforced in CI.",
    category: "Web Development",
    level: "intermediate",
    hours: 7,
    price_cents: 99900,
    rating: 4.7,
    review_count: 89,
    enrolled_count: 4380,
    created_at: "2026-06-05T09:00:00Z",
    format: "video",
    career_track: "web_development",
    instructor_id: "sana",
    sections: [
      ["Measure First", ["Core Web Vitals deep dive", "Profiling tools that matter", "Reading flamegraphs"]],
      ["Rendering & Assets", ["Bundle diets and code splitting", "Image and font strategy", "Third-party script audits"]],
      ["Budgets & Culture", ["Performance budgets in CI", "Capstone: halve a real page's LCP"]],
    ],
  },
  {
    id: "accessibility-first-frontend",
    title: "Accessibility-First Frontend",
    subtitle: "Build interfaces every user can operate — WCAG in practice, not in theory.",
    description:
      "Practical accessibility engineering: semantic structure, keyboard interaction, ARIA that helps instead of harms, screen-reader testing and accessible design systems.",
    category: "Web Development",
    level: "beginner",
    hours: 6,
    price_cents: 79900,
    rating: 4.8,
    review_count: 76,
    enrolled_count: 3910,
    created_at: "2026-07-08T09:00:00Z",
    format: "video",
    career_track: "web_development",
    instructor_id: "divya",
    sections: [
      ["Foundations", ["How assistive tech reads the DOM", "Semantic HTML superpowers", "Focus management"]],
      ["Components That Include", ["Accessible menus and dialogs", "Live regions and announcements", "Testing with screen readers"]],
      ["Ship It Accessible", ["Audits and CI gates", "Capstone: remediate a real page"]],
    ],
  },
  // --- Programming -----------------------------------------------------
  {
    id: "java-programming-foundations",
    title: "Java Programming Foundations",
    subtitle: "From syntax to objects — the solid base every Java path needs.",
    description:
      "Learn Java properly from the start: types, control flow, OOP modeling, collections and exceptions, with graded exercises after every concept.",
    category: "Programming",
    level: "beginner",
    hours: 12,
    price_cents: 0,
    rating: 4.6,
    review_count: 231,
    enrolled_count: 22470,
    created_at: "2026-01-15T09:00:00Z",
    format: "video",
    career_track: "interview_prep",
    instructor_id: "kabir",
    sections: [
      ["Syntax & Types", ["Values, variables, control flow", "Arrays and strings", "Methods and scope"]],
      ["Object Thinking", ["Classes and encapsulation", "Inheritance vs composition", "Interfaces and polymorphism"]],
      ["Working Data", ["Collections framework", "Generics essentials", "Exceptions and resources"]],
    ],
  },
  {
    id: "advanced-java-oop",
    title: "Advanced Java & OOP",
    subtitle: "Design patterns, streams and concurrency for serious Java codebases.",
    description:
      "Level up beyond the basics: functional streams, concurrency primitives, JVM memory fundamentals and the design patterns that keep large Java systems maintainable.",
    category: "Programming",
    level: "advanced",
    hours: 14,
    price_cents: 99900,
    rating: 4.7,
    review_count: 118,
    enrolled_count: 6740,
    created_at: "2026-02-25T09:00:00Z",
    format: "video",
    career_track: "interview_prep",
    instructor_id: "kabir",
    sections: [
      ["Functional Java", ["Streams and collectors", "Optionals and monadic style", "Lambdas under the hood"]],
      ["Concurrency", ["Threads, executors, futures", "Concurrent collections", "Virtual threads in practice"]],
      ["Design Discipline", ["SOLID in real systems", "Pattern catalog that matters", "Capstone: refactor a legacy service"]],
    ],
  },
  {
    id: "python-programming-masterclass",
    title: "Python Programming Masterclass",
    subtitle: "Idiomatic Python from functions to packaging — write code senior engineers trust.",
    description:
      "A comprehensive Python track: data model, comprehensions, decorators, generators, typing, testing and packaging — taught through progressively harder real-world exercises.",
    category: "Programming",
    level: "intermediate",
    hours: 15,
    price_cents: 129900,
    rating: 4.8,
    review_count: 264,
    enrolled_count: 17890,
    created_at: "2026-02-08T09:00:00Z",
    format: "video",
    career_track: "interview_prep",
    instructor_id: "priya",
    sections: [
      ["Pythonic Foundations", ["The data model", "Comprehensions and iteration", "Functions as objects"]],
      ["Power Features", ["Decorators in practice", "Generators and lazy pipelines", "Context managers"]],
      ["Professional Python", ["Type hints that pay off", "Testing with pytest", "Packaging and distribution"]],
    ],
  },
  {
    id: "clean-code-software-architecture",
    title: "Clean Code & Software Architecture",
    subtitle: "Structure systems that stay changeable — boundaries, patterns and trade-offs.",
    description:
      "An opinionated guide to sustainable software design: coupling and cohesion, layering, domain boundaries, evolutionary architecture and pragmatic documentation.",
    category: "Programming",
    level: "advanced",
    hours: 10,
    price_cents: 179900,
    rating: 4.9,
    review_count: 87,
    enrolled_count: 3420,
    created_at: "2026-04-19T09:00:00Z",
    format: "video",
    career_track: "interview_prep",
    instructor_id: "sana",
    sections: [
      ["Design Instincts", ["Coupling, cohesion and churn", "Naming and abstraction levels", "Refactoring safely"]],
      ["Architectural Boundaries", ["Layers, ports and adapters", "Modular monoliths vs microservices", "Data ownership"]],
      ["Evolving Systems", ["Fitness functions", "Documentation as code", "Capstone: architecture review"]],
    ],
  },
  {
    id: "go-concurrency-in-practice",
    title: "Go Concurrency in Practice",
    subtitle: "Goroutines, channels and context — concurrent Go that doesn't race or leak.",
    description:
      "Master Go's concurrency model: memory semantics, channel patterns, worker pools, cancellation with context, and debugging data races in real programs.",
    category: "Programming",
    level: "advanced",
    hours: 8,
    price_cents: 119900,
    rating: 4.7,
    review_count: 94,
    enrolled_count: 4870,
    created_at: "2026-05-27T09:00:00Z",
    format: "video",
    career_track: "interview_prep",
    instructor_id: "kabir",
    sections: [
      ["Model & Memory", ["Goroutines and the scheduler", "The Go memory model", "Race detector drills"]],
      ["Channel Patterns", ["Pipelines and fan-in/out", "Worker pools", "select, timeouts, tickers"]],
      ["Production Concurrency", ["Context cancellation", "Errgroup and limits", "Capstone: concurrent crawler"]],
    ],
  },
  // --- Cloud & DevOps --------------------------------------------------
  {
    id: "linux-administration",
    title: "Linux Administration",
    subtitle: "Users, services, storage and networking — run Linux servers with confidence.",
    description:
      "The day-two Linux skills: package management, users and sudo policy, systemd units, storage and LVM, networking, backups and recovery — practiced on real VMs.",
    category: "Cloud & DevOps",
    level: "beginner",
    hours: 10,
    price_cents: 0,
    rating: 4.7,
    review_count: 312,
    enrolled_count: 28760,
    created_at: "2026-01-09T09:00:00Z",
    format: "lab",
    career_track: "cloud",
    instructor_id: "arjun",
    sections: [
      ["Server Basics", ["Files, permissions, sudo", "Packages and updates", "Processes and resource limits"]],
      ["Services & Storage", ["systemd units in practice", "Disks, LVM and mounts", "Journald and log rotation"]],
      ["Networking & Recovery", ["Interfaces, routes, firewall", "SSH hardening", "Capstone: recover a broken box"]],
    ],
  },
  {
    id: "docker-and-kubernetes",
    title: "Docker & Kubernetes",
    subtitle: "Containerize anything, then orchestrate it — deployments that survive Fridays.",
    description:
      "From Dockerfiles to production clusters: images, registries, pods, services, ingress, config, autoscaling and debugging workloads that won't start.",
    category: "Cloud & DevOps",
    level: "intermediate",
    hours: 14,
    price_cents: 149900,
    rating: 4.8,
    review_count: 245,
    enrolled_count: 15320,
    created_at: "2026-02-16T09:00:00Z",
    format: "lab",
    career_track: "cloud",
    instructor_id: "arjun",
    sections: [
      ["Containers", ["Images and layers", "Volumes and networks", "Compose for local stacks"]],
      ["Kubernetes Core", ["Pods, ReplicaSets, Deployments", "Services and ingress", "ConfigMaps and Secrets"]],
      ["Running for Real", ["Probes, requests and limits", "HPA and rollouts", "Capstone: debug a broken cluster"]],
    ],
  },
  {
    id: "aws-cloud-foundations",
    title: "AWS Cloud Foundations",
    subtitle: "Compute, storage, networking and IAM — the AWS vocabulary that matters.",
    description:
      "A grounded tour of core AWS services with cost awareness baked in: EC2, S3, VPC, RDS, Lambda and IAM, each practiced through guided console and CLI labs.",
    category: "Cloud & DevOps",
    level: "beginner",
    hours: 11,
    price_cents: 99900,
    rating: 4.6,
    review_count: 176,
    enrolled_count: 12980,
    created_at: "2026-03-07T09:00:00Z",
    format: "video",
    career_track: "cloud",
    instructor_id: "arjun",
    sections: [
      ["Core Services", ["Regions, AZs and accounts", "EC2 and AMIs", "S3 storage classes"]],
      ["Networking & Data", ["VPC, subnets, gateways", "RDS basics", "Lambda and events"]],
      ["Access & Cost", ["IAM users, roles, policies", "Billing alarms and budgets", "Capstone: deploy a small stack"]],
    ],
  },
  {
    id: "cicd-engineering",
    title: "CI/CD Engineering",
    subtitle: "Pipelines that are fast, trusted and boring — build, test, deploy, verify.",
    description:
      "Design delivery pipelines engineers actually trust: caching strategies, parallel test splits, environment promotion, feature flags and automated rollback.",
    category: "Cloud & DevOps",
    level: "intermediate",
    hours: 8,
    price_cents: 129900,
    rating: 4.7,
    review_count: 103,
    enrolled_count: 6210,
    created_at: "2026-04-26T09:00:00Z",
    format: "project",
    career_track: "cloud",
    instructor_id: "arjun",
    sections: [
      ["Pipeline Anatomy", ["Stages, jobs and artifacts", "Caching and speed", "Test parallelization"]],
      ["Deployment Patterns", ["Blue-green and canaries", "Feature flags", "Database migrations safely"]],
      ["Trust & Verification", ["Supply chain signing", "Observability-driven rollback", "Capstone: pipeline from zero"]],
    ],
  },
  {
    id: "terraform-infrastructure-as-code",
    title: "Terraform Infrastructure as Code",
    subtitle: "Declare, plan and review infrastructure like application code.",
    description:
      "Production Terraform: state management, modules, workspaces, drift detection, policy guardrails and multi-environment layouts that scale past hello-world.",
    category: "Cloud & DevOps",
    level: "intermediate",
    hours: 9,
    price_cents: 149900,
    rating: 4.6,
    review_count: 81,
    enrolled_count: 4530,
    created_at: "2026-06-22T09:00:00Z",
    format: "project",
    career_track: "cloud",
    instructor_id: "arjun",
    sections: [
      ["IaC Foundations", ["Providers, resources, state", "Plan/apply discipline", "Variables and outputs"]],
      ["Scaling Terraform", ["Modules that compose", "Multi-env layouts", "Remote state and locking"]],
      ["Guardrails", ["Policy as code", "Drift detection", "Capstone: reviewed infra change"]],
    ],
  },
  // --- AI & ML ---------------------------------------------------------
  {
    id: "machine-learning-foundations",
    title: "Machine Learning Foundations",
    subtitle: "The models behind the magic — regression to ensembles, evaluated honestly.",
    description:
      "Build real intuition for supervised learning: linear models, trees and ensembles, cross-validation, leakage traps and metric selection, implemented from scratch then with scikit-learn.",
    category: "AI & ML",
    level: "beginner",
    hours: 12,
    price_cents: 129900,
    rating: 4.7,
    review_count: 198,
    enrolled_count: 13640,
    created_at: "2026-01-28T09:00:00Z",
    format: "video",
    career_track: "ai_ml",
    instructor_id: "vikram",
    sections: [
      ["Learning How To Learn", ["Loss, gradients, optimization", "Train/test discipline", "Leakage and bias traps"]],
      ["Model Zoo", ["Linear and logistic regression", "Decision trees and forests", "Gradient boosting"]],
      ["Honest Evaluation", ["Cross-validation", "Metrics beyond accuracy", "Capstone: Kaggle-style competition"]],
    ],
  },
  {
    id: "deep-learning-pytorch",
    title: "Deep Learning with PyTorch",
    subtitle: "Tensors to training loops — build neural networks you actually understand.",
    description:
      "Hands-on deep learning with PyTorch: autograd, custom training loops, CNNs, transformers and transfer learning, with debugging techniques for when training goes sideways.",
    category: "AI & ML",
    level: "intermediate",
    hours: 14,
    price_cents: 179900,
    rating: 4.8,
    review_count: 142,
    enrolled_count: 8920,
    created_at: "2026-03-14T09:00:00Z",
    format: "lab",
    career_track: "ai_ml",
    instructor_id: "vikram",
    sections: [
      ["PyTorch Core", ["Tensors and autograd", "nn.Module deep dive", "Custom training loops"]],
      ["Architectures", ["CNNs for vision", "Sequence models and attention", "Transfer learning"]],
      ["Training Craft", ["Debugging failed runs", "Mixed precision and scheduling", "Capstone: train and ship a model"]],
    ],
  },
  {
    id: "computer-vision",
    title: "Computer Vision",
    subtitle: "From pixels to perception — classification, detection and segmentation.",
    description:
      "A practical computer vision course: classical image processing, modern architectures, object detection pipelines and segmentation, evaluated on real datasets.",
    category: "AI & ML",
    level: "intermediate",
    hours: 11,
    price_cents: 149900,
    rating: 4.6,
    review_count: 77,
    enrolled_count: 4110,
    created_at: "2026-05-11T09:00:00Z",
    format: "video",
    career_track: "ai_ml",
    instructor_id: "vikram",
    sections: [
      ["Image Fundamentals", ["Filters, edges, features", "Convolutions revisited", "Dataset preparation"]],
      ["Modern Vision", ["Classification fine-tuning", "Object detection pipelines", "Segmentation basics"]],
      ["Deployment", ["Latency vs accuracy", "Serving vision models", "Capstone: visual quality inspector"]],
    ],
  },
  {
    id: "generative-ai-engineering",
    title: "Generative AI Engineering",
    subtitle: "LLM apps that work in production — prompting, RAG, evals and guardrails.",
    description:
      "Engineer applications on top of large language models: structured prompting, retrieval-augmented generation, evaluation harnesses, cost control and safety guardrails.",
    category: "AI & ML",
    level: "advanced",
    hours: 12,
    price_cents: 199900,
    rating: 4.9,
    review_count: 121,
    enrolled_count: 7560,
    created_at: "2026-06-28T09:00:00Z",
    format: "project",
    career_track: "ai_ml",
    instructor_id: "vikram",
    sections: [
      ["LLM App Anatomy", ["Prompting as engineering", "Structured outputs", "Token economics"]],
      ["Retrieval & Context", ["Embeddings and chunking", "RAG pipelines", "Caching and latency"]],
      ["Reliability", ["Eval harnesses", "Guardrails and red-teaming", "Capstone: production RAG assistant"]],
    ],
  },
  {
    id: "ai-agents-automation",
    title: "AI Agents & Automation",
    subtitle: "Tool-using agents that plan, act and recover — without going off the rails.",
    description:
      "Build autonomous agents that call tools, plan multi-step work and recover from failure: orchestration patterns, memory, human-in-the-loop checkpoints and observability.",
    category: "AI & ML",
    level: "advanced",
    hours: 9,
    price_cents: 149900,
    rating: 4.7,
    review_count: 64,
    enrolled_count: 3280,
    created_at: "2026-07-15T09:00:00Z",
    format: "project",
    career_track: "ai_ml",
    instructor_id: "vikram",
    sections: [
      ["Agent Building Blocks", ["Tools and function calling", "Planning strategies", "State and memory"]],
      ["Orchestration", ["Multi-step task graphs", "Error recovery loops", "Human-in-the-loop gates"]],
      ["Trust & Observability", ["Tracing agent decisions", "Sandboxing actions", "Capstone: ops automation agent"]],
    ],
  },
  // --- Networking ------------------------------------------------------
  {
    id: "tcp-ip-deep-dive",
    title: "TCP/IP Deep Dive",
    subtitle: "Handshakes, congestion and NAT — the protocol mechanics under everything.",
    description:
      "Go below the abstractions: IP addressing and routing, TCP state machines, congestion control, NAT traversal and IPv6 — verified with packet-level experiments.",
    category: "Networking",
    level: "intermediate",
    hours: 10,
    price_cents: 99900,
    rating: 4.7,
    review_count: 109,
    enrolled_count: 7480,
    created_at: "2026-03-02T09:00:00Z",
    format: "video",
    career_track: "cyber_security",
    instructor_id: "kabir",
    sections: [
      ["IP Layer", ["Addressing and subnets", "Routing tables in practice", "ICMP and MTU"]],
      ["TCP Mechanics", ["Connection lifecycle", "Flow and congestion control", "Retransmission behavior"]],
      ["Real Networks", ["NAT and its lies", "IPv6 coexistence", "Capstone: diagnose a flaky connection"]],
    ],
  },
  {
    id: "wireshark-packet-mastery",
    title: "Wireshark Packet Mastery",
    subtitle: "Display filters, expert info and follow-ups — troubleshoot any protocol.",
    description:
      "Become fluent in Wireshark: capture strategy, display and capture filters, protocol statistics, stream reassembly and the common troubleshooting workflows for HTTP, TLS and DNS.",
    category: "Networking",
    level: "beginner",
    hours: 5,
    price_cents: 0,
    rating: 4.6,
    review_count: 154,
    enrolled_count: 19230,
    created_at: "2026-04-02T09:00:00Z",
    format: "lab",
    career_track: "cyber_security",
    instructor_id: "priya",
    sections: [
      ["Capture Craft", ["Where and how to capture", "Capture vs display filters", "Colorization and profiles"]],
      ["Protocol Workflows", ["Following TCP/UDP streams", "HTTP and TLS inspection", "DNS troubleshooting"]],
      ["Efficiency", ["Statistics and IO graphs", "Expert information", "Capstone: solve three mysteries"]],
    ],
  },
  {
    id: "network-automation-python",
    title: "Network Automation with Python",
    subtitle: "Stop SSH-ing by hand — model, push and verify network config at scale.",
    description:
      "Automate network operations: device inventory, configuration templating, bulk changes with validation, and intent verification using Python and Nornir-style workflows.",
    category: "Networking",
    level: "advanced",
    hours: 8,
    price_cents: 129900,
    rating: 4.5,
    review_count: 58,
    enrolled_count: 2960,
    created_at: "2026-06-09T09:00:00Z",
    format: "project",
    career_track: "cloud",
    instructor_id: "kabir",
    sections: [
      ["Automation Foundations", ["Inventory as data", "Templates for configs", "Dry-run safety nets"]],
      ["Change Management", ["Bulk pushes with validation", "Diffing intended vs running", "Rollback strategies"]],
      ["Verification", ["Intent-based checks", "Continuous compliance", "Capstone: zero-touch rollout"]],
    ],
  },
  // --- Systems ---------------------------------------------------------
  {
    id: "operating-systems-internals",
    title: "Operating Systems Internals",
    subtitle: "Processes, memory and filesystems — what your code does to the machine.",
    description:
      "Understand the machinery beneath your programs: syscalls, scheduling, virtual memory, page caches and filesystem internals, observed live with tracing tools.",
    category: "Systems",
    level: "advanced",
    hours: 13,
    price_cents: 149900,
    rating: 4.8,
    review_count: 92,
    enrolled_count: 5390,
    created_at: "2026-02-11T09:00:00Z",
    format: "video",
    career_track: "interview_prep",
    instructor_id: "kabir",
    sections: [
      ["Processes & Syscalls", ["User vs kernel mode", "Process lifecycle", "Signals and wait states"]],
      ["Memory", ["Virtual memory and MMU", "Page cache behavior", "Allocators and fragmentation"]],
      ["I/O & Filesystems", ["Buffered vs direct I/O", "Journaling filesystems", "Capstone: trace a slow program"]],
    ],
  },
  {
    id: "bash-scripting-for-engineers",
    title: "Bash Scripting for Engineers",
    subtitle: "Glue, automate and bulletproof — shell scripts you'll still trust next year.",
    description:
      "Write shell scripts that behave: argument parsing, error handling, quoting rules, text processing pipelines and portable patterns for CI and ops tasks.",
    category: "Systems",
    level: "beginner",
    hours: 5,
    price_cents: 0,
    rating: 4.6,
    review_count: 187,
    enrolled_count: 21540,
    created_at: "2026-01-31T09:00:00Z",
    format: "video",
    career_track: "cloud",
    instructor_id: "kabir",
    sections: [
      ["Shell Essentials", ["Quoting and expansion rules", "Exit codes and set -euo pipefail", "Arguments and flags"]],
      ["Text Pipelines", ["grep/sed/awk workflows", "JSON in the shell", "Finding things fast"]],
      ["Robust Scripts", ["Traps and cleanup", "Logging and dry-run modes", "Capstone: a deploy helper script"]],
    ],
  },
  // --- Software Engineering -------------------------------------------
  {
    id: "system-design-interview-prep",
    title: "System Design Interview Prep",
    subtitle: "Frameworks for the whiteboard — scale, storage and trade-off talk that lands.",
    description:
      "Prepare for system design interviews with repeatable frameworks: requirement scoping, capacity estimation, storage engines, caching, sharding and communicating trade-offs clearly.",
    category: "Software Engineering",
    level: "advanced",
    hours: 12,
    price_cents: 199900,
    rating: 4.8,
    review_count: 173,
    enrolled_count: 9870,
    created_at: "2026-03-22T09:00:00Z",
    format: "video",
    career_track: "interview_prep",
    instructor_id: "sana",
    sections: [
      ["Interview Framework", ["Scoping requirements fast", "Back-of-envelope math", "Drawing the right diagram"]],
      ["Core Building Blocks", ["Load balancers to queues", "SQL vs NoSQL choices", "Caching layers"]],
      ["Classic Systems", ["URL shortener to news feed", "Chat and presence", "Mock interview walkthroughs"]],
    ],
  },
  {
    id: "git-version-control-workflows",
    title: "Git & Version Control Workflows",
    subtitle: "History as a team sport — branching, rebasing and reviewing without fear.",
    description:
      "Master collaborative Git: commit craft, branch models, interactive rebase, conflict resolution, bisect debugging and recovery from seemingly fatal mistakes.",
    category: "Software Engineering",
    level: "beginner",
    hours: 5,
    price_cents: 0,
    rating: 4.7,
    review_count: 209,
    enrolled_count: 24310,
    created_at: "2026-02-06T09:00:00Z",
    format: "video",
    career_track: "interview_prep",
    instructor_id: "divya",
    sections: [
      ["Commit Craft", ["Atomic commits and messages", "Staging selectively", "Understanding the graph"]],
      ["Collaboration", ["Branch models that scale", "Rebase vs merge decisions", "Code review workflows"]],
      ["Recovery & Archaeology", ["reflog rescues", "bisect hunting", "Capstone: untangle a messy repo"]],
    ],
  },
];

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

/** Published marketplace courses, appended to the shared fixture store. */
const MARKETPLACE_COURSES: Course[] = MARKETPLACE_COURSE_SPECS.map(marketplaceCourseFromSpec);

for (const course of MARKETPLACE_COURSES) {
  if (!MOCK_COURSES_BY_ID.has(course.id)) {
    MOCK_COURSES.push(course);
    MOCK_COURSES_BY_ID.set(course.id, course);
  }
}

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
  const format = course.format ?? (
    course.title.includes("Web App") ? "lab" :
      course.title.includes("React") ? "project" :
        course.title.includes("Algorithms") ? "judge" : "video"
  );
  const career_track = course.career_track ?? (
    course.category === "Web Development" ? "web_development" :
      course.category === "Cloud & DevOps" ? "cloud" :
        course.category === "Programming" ? "interview_prep" : "cyber_security"
  );
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
    total_lessons: course.syllabus.reduce(
      (count, section) => count + section.lessons.length,
      0,
    ),
    instructor_name: course.instructor.display_name,
    language: course.language,
    cover_hue: hueForId(course.id),
    format,
    career_track,
    is_project_based: course.is_project_based ?? (format === "project" || format === "lab"),
    certificate_included: course.certificate_included ?? true,
  };
}
