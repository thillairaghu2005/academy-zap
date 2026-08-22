/**
 * Marketplace presentation layer for the Courses page.
 *
 * The Content Engine fixtures (lib/mocks/courses.ts) remain the source of
 * truth for course identity, pricing and enrollment. This module adds the
 * marketplace-only projection: subcategories, skills, learning outcomes,
 * merch badges, compare-at pricing and curated collection rails.
 *
 * Everything here is derived from published courses at module load, so a
 * course added to the fixtures automatically becomes purchasable/browsable
 * without touching this file.
 */

import { MOCK_COURSES } from "@/lib/mocks/courses";
import type { CourseLevel } from "@/lib/contracts/content";

export type MarketplaceCourseType = "video" | "lab" | "project" | "assessment";

export type MerchBadge = "BESTSELLER" | "NEW" | "POPULAR" | "HIGH RATED";

export interface MarketplaceCourse {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  description: string;
  type: MarketplaceCourseType;
  level: CourseLevel;
  instructor: string;
  rating: number;
  reviewCount: number;
  studentCount: number;
  durationHours: number;
  priceCents: number;
  originalPriceCents: number | null;
  isFree: boolean;
  discountPercent: number;
  badge: MerchBadge | null;
  skills: string[];
  whatYouWillLearn: string[];
  comingSoon: boolean;
  /** Fixture creation date (ISO) — powers the "Newest" sort. */
  createdAt: string;
  /**
   * Learner's progress through this course as a 0–1 fraction. Only set for
   * enrolled courses at render time by the marketplace page — never part of
   * the base fixture projection.
   */
  progressPercent?: number;
}

interface MarketplaceMetadata {
  subcategory: string;
  type?: MarketplaceCourseType;
  originalPriceCents?: number;
  badge?: MerchBadge;
  skills: string[];
  whatYouWillLearn: string[];
  comingSoon?: boolean;
}

const TYPE_BY_FORMAT: Record<string, MarketplaceCourseType> = {
  video: "video",
  lab: "lab",
  project: "project",
  judge: "assessment",
  interactive: "assessment",
};

/** Marketplace-only enrichment, keyed by course id. */
const METADATA: Record<string, MarketplaceMetadata> = {
  "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a": {
    subcategory: "Operating Systems",
    skills: ["Shell navigation", "File permissions", "Text pipelines", "Process management"],
    whatYouWillLearn: [
      "Navigate and inspect any Linux file system",
      "Build grep/sed/awk text-processing pipelines",
      "Manage permissions, processes and services",
      "Harden SSH access on a live box",
    ],
  },
  "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d": {
    subcategory: "Security Automation",
    skills: ["Log parsing", "Threat intel processing", "Port scanning", "Python scripting"],
    whatYouWillLearn: [
      "Parse auth logs and packet dumps with Python",
      "Batch-process IoCs from threat feeds",
      "Automate scan workflows end to end",
      "Build an IoC enrichment bot",
    ],
  },
  "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e": {
    subcategory: "Offensive Security",
    originalPriceCents: 249900,
    badge: "BESTSELLER",
    skills: ["OWASP Top Ten", "SQL injection", "Traffic interception", "Exploit chaining"],
    whatYouWillLearn: [
      "Exploit the OWASP Top Ten in a safe lab app",
      "Chain SQL injection to remote code execution",
      "Intercept and manipulate web traffic",
      "Write professional pentest reports",
    ],
  },
  "soc-analyst-fundamentals": {
    subcategory: "Security Operations",
    badge: "POPULAR",
    skills: ["Alert triage", "SIEM workflow", "Threat escalation", "Incident notes"],
    whatYouWillLearn: [
      "Run the tier-one SOC triage lifecycle",
      "Separate true positives from noise",
      "Enrich alerts with threat intelligence",
      "Write escalations IR teams can act on",
    ],
  },
  "network-traffic-analysis": {
    subcategory: "Network Defense",
    skills: ["Wireshark", "Zeek", "Beacon detection", "TLS fingerprinting"],
    whatYouWillLearn: [
      "Dissect protocols inside real captures",
      "Detect C2 beaconing patterns",
      "Uncover DNS tunneling attempts",
      "Build investigation timelines from pcaps",
    ],
  },
  "digital-forensics-fundamentals": {
    subcategory: "Forensics",
    skills: ["Disk imaging", "Timeline analysis", "Artifact carving", "Chain of custody"],
    whatYouWillLearn: [
      "Acquire evidence without breaking integrity",
      "Build filesystem timelines",
      "Carve deleted files from images",
      "Write findings that hold up under review",
    ],
  },
  "malware-analysis-basics": {
    subcategory: "Malware Analysis",
    originalPriceCents: 199900,
    skills: ["Static analysis", "Sandboxing", "Unpacking", "IOC extraction"],
    whatYouWillLearn: [
      "Triage suspicious binaries safely",
      "Inspect PE headers, imports and entropy",
      "Detonate samples in an isolated lab",
      "Extract IOCs into a full report",
    ],
  },
  "practical-osint-recon": {
    subcategory: "OSINT",
    skills: ["Domain recon", "Breach data hygiene", "Footprinting", "OPSEC"],
    whatYouWillLearn: [
      "Map an org's attack surface from open sources",
      "Pivot through certificates and archives",
      "Operationalize breach data responsibly",
      "Deliver a complete recon report",
    ],
  },
  "0a1b2c3d-4e5f-4a6b-7c8d-9e0f1a2b3c4d": {
    subcategory: "Network Fundamentals",
    skills: ["OSI model", "IPv4 addressing", "TCP handshake", "DNS resolution"],
    whatYouWillLearn: [
      "Read the network stack layer by layer",
      "Subnet IPv4 networks by hand",
      "Trace TCP handshakes in captures",
      "Follow DNS resolution end to end",
    ],
  },
  "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b": {
    subcategory: "Cloud Security",
    originalPriceCents: 179900,
    skills: ["IAM design", "VPC segmentation", "Centralized logging", "Drift detection"],
    whatYouWillLearn: [
      "Design least-privilege IAM policies",
      "Segment VPCs like a defender",
      "Wire centralized logging architecture",
      "Detect drift and exfiltration paths",
    ],
  },
  "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f": {
    subcategory: "Frontend",
    badge: "BESTSELLER",
    skills: ["React 19", "TypeScript generics", "State modelling", "Render optimization"],
    whatYouWillLearn: [
      "Model state with discriminated unions",
      "Master advanced TypeScript generics",
      "Optimize rendering without memo-spam",
      "Test the data layer, not the DOM",
    ],
  },
  "modern-javascript": {
    subcategory: "JavaScript",
    skills: ["ES2024+", "Async patterns", "Iterators", "Memory model"],
    whatYouWillLearn: [
      "Use modules and bundlers like production teams do",
      "Master promises and async control flow",
      "Apply proxies, generators and closures",
      "Diagnose memory leaks before users feel them",
    ],
  },
  "full-stack-nextjs": {
    subcategory: "Full Stack",
    originalPriceCents: 259900,
    skills: ["Next.js", "Server components", "Auth flows", "Deployment"],
    whatYouWillLearn: [
      "Architect server/client component boundaries",
      "Build session-based auth from scratch",
      "Design caching and revalidation strategy",
      "Ship and observe a production deployment",
    ],
  },
  "nodejs-backend-engineering": {
    subcategory: "Backend",
    skills: ["Node.js", "API design", "Background jobs", "Observability"],
    whatYouWillLearn: [
      "Design APIs that survive production traffic",
      "Implement idempotent write paths",
      "Run background jobs with retries",
      "Instrument services with metrics and logs",
    ],
  },
  "web-performance-engineering": {
    subcategory: "Performance",
    skills: ["Core Web Vitals", "Bundle analysis", "Profiling", "Performance budgets"],
    whatYouWillLearn: [
      "Measure LCP/INP/CLS like an engineer",
      "Cut bundles with code splitting",
      "Fix rendering bottlenecks from flamegraphs",
      "Enforce budgets in CI",
    ],
  },
  "accessibility-first-frontend": {
    subcategory: "Accessibility",
    skills: ["WCAG 2.2", "Screen readers", "Keyboard UX", "ARIA"],
    whatYouWillLearn: [
      "Structure pages assistive tech understands",
      "Build accessible menus, dialogs and focus flows",
      "Test with real screen readers",
      "Gate regressions with CI audits",
    ],
  },
  "java-programming-foundations": {
    subcategory: "Java",
    skills: ["Java syntax", "OOP modeling", "Collections", "Exceptions"],
    whatYouWillLearn: [
      "Write idiomatic Java from day one",
      "Model problems with classes and interfaces",
      "Use the collections framework fluently",
      "Handle exceptions and resources correctly",
    ],
  },
  "advanced-java-oop": {
    subcategory: "Java",
    skills: ["Streams API", "Concurrency", "Design patterns", "JVM internals"],
    whatYouWillLearn: [
      "Compose data with streams and collectors",
      "Coordinate work with executors and futures",
      "Apply SOLID in real systems",
      "Refactor legacy services safely",
    ],
  },
  "python-programming-masterclass": {
    subcategory: "Python",
    badge: "BESTSELLER",
    skills: ["Idiomatic Python", "Decorators", "Generators", "Typing"],
    whatYouWillLearn: [
      "Think in Python's data model",
      "Write decorators and context managers",
      "Build lazy pipelines with generators",
      "Package and test like a professional",
    ],
  },
  "clean-code-software-architecture": {
    subcategory: "Architecture",
    skills: ["Coupling & cohesion", "Boundaries", "Refactoring", "Documentation"],
    whatYouWillLearn: [
      "Spot coupling before it calcifies",
      "Draw architectural boundaries that hold",
      "Choose between modular monoliths and microservices",
      "Keep documentation alive as code",
    ],
  },
  "go-concurrency-in-practice": {
    subcategory: "Go",
    skills: ["Goroutines", "Channels", "Context", "Race debugging"],
    whatYouWillLearn: [
      "Reason about the Go scheduler and memory model",
      "Compose channel pipelines and worker pools",
      "Cancel work cleanly with context",
      "Find and fix data races fast",
    ],
  },
  "linux-administration": {
    subcategory: "Linux",
    skills: ["systemd", "Storage & LVM", "Networking", "Server recovery"],
    whatYouWillLearn: [
      "Administer users, packages and sudo policy",
      "Write and debug systemd units",
      "Manage disks, LVM and mounts",
      "Recover a broken server under pressure",
    ],
  },
  "docker-and-kubernetes": {
    subcategory: "Containers",
    originalPriceCents: 219900,
    badge: "BESTSELLER",
    skills: ["Docker", "Kubernetes", "Helm basics", "Autoscaling"],
    whatYouWillLearn: [
      "Build lean images with sane layers",
      "Deploy workloads with Deployments and Services",
      "Configure ingress, secrets and config maps",
      "Debug pods that won't start",
    ],
  },
  "aws-cloud-foundations": {
    subcategory: "Cloud Platforms",
    skills: ["EC2", "S3", "VPC", "IAM"],
    whatYouWillLearn: [
      "Navigate core AWS services confidently",
      "Design VPCs with public/private subnets",
      "Apply IAM least privilege",
      "Control spend with budgets and alarms",
    ],
  },
  "cicd-engineering": {
    subcategory: "DevOps",
    skills: ["Pipeline design", "Canary deploys", "Feature flags", "Rollbacks"],
    whatYouWillLearn: [
      "Build fast, cached delivery pipelines",
      "Split and parallelize test suites",
      "Release with canaries and flags",
      "Roll back automatically on bad signals",
    ],
  },
  "terraform-infrastructure-as-code": {
    subcategory: "Infrastructure as Code",
    skills: ["Terraform", "State management", "Modules", "Policy as code"],
    whatYouWillLearn: [
      "Manage state safely across environments",
      "Compose reusable infrastructure modules",
      "Detect and reconcile drift",
      "Guard infra changes with policy checks",
    ],
  },
  "machine-learning-foundations": {
    subcategory: "Machine Learning",
    skills: ["Regression", "Ensembles", "Cross-validation", "Metric selection"],
    whatYouWillLearn: [
      "Train linear models and gradient boosting",
      "Validate honestly without leakage",
      "Pick metrics that match the problem",
      "Compete in a capstone ML competition",
    ],
  },
  "deep-learning-pytorch": {
    subcategory: "Deep Learning",
    originalPriceCents: 229900,
    skills: ["PyTorch", "CNNs", "Transformers", "Transfer learning"],
    whatYouWillLearn: [
      "Build custom training loops with autograd",
      "Fine-tune CNNs and transformers",
      "Debug runs that refuse to converge",
      "Ship a trained model behind an API",
    ],
  },
  "computer-vision": {
    subcategory: "Computer Vision",
    skills: ["Image processing", "Object detection", "Segmentation", "Model serving"],
    whatYouWillLearn: [
      "Process images with classical and learned features",
      "Fine-tune detectors on custom datasets",
      "Balance latency against accuracy",
      "Serve vision models in production",
    ],
  },
  "generative-ai-engineering": {
    subcategory: "Generative AI",
    badge: "NEW",
    originalPriceCents: 259900,
    skills: ["Prompt engineering", "RAG", "Evals", "Guardrails"],
    whatYouWillLearn: [
      "Engineer structured, reliable prompts",
      "Build retrieval-augmented pipelines",
      "Evaluate LLM output systematically",
      "Add guardrails that survive red-teaming",
    ],
  },
  "ai-agents-automation": {
    subcategory: "AI Agents",
    badge: "NEW",
    comingSoon: true,
    skills: ["Tool calling", "Planning loops", "Agent memory", "Tracing"],
    whatYouWillLearn: [
      "Design tool-using agent architectures",
      "Orchestrate multi-step task graphs",
      "Insert human checkpoints safely",
      "Trace every decision an agent makes",
    ],
  },
  "tcp-ip-deep-dive": {
    subcategory: "Protocols",
    skills: ["IP routing", "TCP states", "Congestion control", "NAT"],
    whatYouWillLearn: [
      "Trace TCP connection lifecycles packet by packet",
      "Explain congestion control behavior",
      "Understand what NAT really does",
      "Diagnose flaky connections methodically",
    ],
  },
  "wireshark-packet-mastery": {
    subcategory: "Network Tools",
    skills: ["Capture filters", "Display filters", "Stream reassembly", "Protocol stats"],
    whatYouWillLearn: [
      "Capture cleanly at the right vantage point",
      "Filter traffic with surgical precision",
      "Reassemble application streams",
      "Troubleshoot HTTP, TLS and DNS fast",
    ],
  },
  "network-automation-python": {
    subcategory: "Network Automation",
    skills: ["Config templating", "Bulk changes", "Intent verification", "Rollbacks"],
    whatYouWillLearn: [
      "Generate configs from inventory data",
      "Push validated changes to many devices",
      "Verify intent continuously",
      "Roll back failed network changes",
    ],
  },
  "operating-systems-internals": {
    subcategory: "Operating Systems",
    skills: ["Syscalls", "Virtual memory", "Scheduling", "Filesystems"],
    whatYouWillLearn: [
      "Follow a syscall from user space to kernel",
      "Explain virtual memory and page caches",
      "Read schedulers and wait states",
      "Trace slow programs to their system calls",
    ],
  },
  "bash-scripting-for-engineers": {
    subcategory: "Shell Scripting",
    skills: ["Quoting rules", "Error handling", "Text pipelines", "CI scripting"],
    whatYouWillLearn: [
      "Quote and expand variables without surprises",
      "Write scripts that fail loudly and clean up",
      "Process logs with grep/sed/awk pipelines",
      "Automate real ops tasks safely",
    ],
  },
  "system-design-interview-prep": {
    subcategory: "System Design",
    originalPriceCents: 259900,
    badge: "POPULAR",
    skills: ["Capacity estimation", "Caching", "Sharding", "Trade-off framing"],
    whatYouWillLearn: [
      "Scope requirements in the first five minutes",
      "Do back-of-envelope capacity math",
      "Choose storage engines deliberately",
      "Present trade-offs interviewers reward",
    ],
  },
  "git-version-control-workflows": {
    subcategory: "Developer Tooling",
    skills: ["Commit craft", "Branching models", "Interactive rebase", "bisect"],
    whatYouWillLearn: [
      "Write history your teammates thank you for",
      "Rebase interactively without fear",
      "Resolve conflicts calmly and correctly",
      "Recover 'lost' commits with reflog",
    ],
  },
  "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c": {
    subcategory: "Data Structures",
    skills: ["Complexity analysis", "Trees & heaps", "Graph traversal", "Go stdlib"],
    whatYouWillLearn: [
      "Implement core structures in Go",
      "Analyze time and space complexity",
      "Traverse graphs and shortest paths",
      "Solve timed problem sets under pressure",
    ],
  },
};

function buildMarketplaceCourses(): MarketplaceCourse[] {
  const courses: MarketplaceCourse[] = [];
  for (const course of MOCK_COURSES) {
    if (course.status !== "published") continue;
    const meta = METADATA[course.id];
    if (!meta) continue; // fixture-only course (draft/in_review demo states)
    const priceCents = course.price_cents;
    const isFree = priceCents === 0;
    const original = meta.originalPriceCents ?? null;
    const discount =
      original && original > priceCents
        ? Math.round(((original - priceCents) / original) * 100)
        : 0;
    courses.push({
      id: course.id,
      title: course.title,
      category: course.category,
      subcategory: meta.subcategory,
      description: course.description,
      type: meta.type ?? TYPE_BY_FORMAT[course.format ?? "video"] ?? "video",
      level: course.level,
      instructor: course.instructor.display_name,
      rating: course.rating,
      reviewCount: course.review_count,
      studentCount: course.enrolled_count,
      durationHours: course.estimated_hours,
      priceCents,
      originalPriceCents: discount > 0 ? original : null,
      isFree,
      discountPercent: discount,
      badge: meta.badge ?? null,
      skills: meta.skills,
      whatYouWillLearn: meta.whatYouWillLearn,
      comingSoon: meta.comingSoon ?? false,
      createdAt: course.created_at,
    });
  }
  return courses;
}

export const MARKETPLACE_COURSES: MarketplaceCourse[] = buildMarketplaceCourses();

export const MARKETPLACE_COURSES_BY_ID: Map<string, MarketplaceCourse> = new Map(
  MARKETPLACE_COURSES.map((course) => [course.id, course]),
);

export const MARKETPLACE_CATEGORIES = [
  "All",
  "Cybersecurity",
  "Web Development",
  "Programming",
  "Cloud & DevOps",
  "AI & ML",
  "Networking",
  "Systems",
  "Software Engineering",
] as const;

/* ------------------------------------------------------------------ */
/*  Curated collections                                                */
/* ------------------------------------------------------------------ */

export interface MarketplaceCollection {
  id: string;
  title: string;
  subtitle?: string;
  /** Ordered course ids — missing/unpublished ids are skipped at render. */
  courseIds: string[];
}

export const MARKETPLACE_COLLECTIONS: MarketplaceCollection[] = [
  {
    id: "top-cybersecurity",
    title: "Top courses in Cybersecurity",
    subtitle: "Recommended for you",
    courseIds: [
      "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
      "network-traffic-analysis",
      "soc-analyst-fundamentals",
      "malware-analysis-basics",
      "digital-forensics-fundamentals",
      "practical-osint-recon",
      "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    ],
  },
  {
    id: "recommended",
    title: "Recommended for you",
    subtitle: "Because you enrolled in Linux Fundamentals for Hackers",
    courseIds: [
      "python-programming-masterclass",
      "wireshark-packet-mastery",
      "linux-administration",
      "network-traffic-analysis",
      "bash-scripting-for-engineers",
      "operating-systems-internals",
    ],
  },
  {
    id: "because-watched-linux",
    title: 'Because you watched "Linux Fundamentals for Hackers"',
    courseIds: [
      "linux-administration",
      "bash-scripting-for-engineers",
      "operating-systems-internals",
      "docker-and-kubernetes",
      "tcp-ip-deep-dive",
      "network-traffic-analysis",
    ],
  },
  {
    id: "skill-interests",
    title: "Based on your skill interests",
    subtitle: "Systems · Automation · Tooling",
    courseIds: [
      "bash-scripting-for-engineers",
      "git-version-control-workflows",
      "operating-systems-internals",
      "go-concurrency-in-practice",
      "cicd-engineering",
      "terraform-infrastructure-as-code",
      "network-automation-python",
    ],
  },
  {
    id: "top-web-development",
    title: "Top courses in Web Development",
    courseIds: [
      "modern-javascript",
      "full-stack-nextjs",
      "nodejs-backend-engineering",
      "web-performance-engineering",
      "accessibility-first-frontend",
      "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
    ],
  },
  {
    id: "top-programming",
    title: "Top courses in Programming",
    courseIds: [
      "python-programming-masterclass",
      "java-programming-foundations",
      "advanced-java-oop",
      "go-concurrency-in-practice",
      "clean-code-software-architecture",
      "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c",
    ],
  },
  {
    id: "top-cloud-devops",
    title: "Top courses in Cloud & DevOps",
    courseIds: [
      "docker-and-kubernetes",
      "aws-cloud-foundations",
      "cicd-engineering",
      "terraform-infrastructure-as-code",
      "linux-administration",
      "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b",
    ],
  },
  {
    id: "top-ai-ml",
    title: "Top courses in Artificial Intelligence",
    courseIds: [
      "machine-learning-foundations",
      "deep-learning-pytorch",
      "generative-ai-engineering",
      "computer-vision",
      "ai-agents-automation",
    ],
  },
  {
    id: "top-networking",
    title: "Top courses in Networking",
    courseIds: [
      "wireshark-packet-mastery",
      "tcp-ip-deep-dive",
      "network-automation-python",
      "network-traffic-analysis",
      "0a1b2c3d-4e5f-4a6b-7c8d-9e0f1a2b3c4d",
    ],
  },
  {
    id: "trending",
    title: "Trending courses",
    subtitle: "What learners are watching this week",
    courseIds: [
      "generative-ai-engineering",
      "docker-and-kubernetes",
      "system-design-interview-prep",
      "soc-analyst-fundamentals",
      "full-stack-nextjs",
      "deep-learning-pytorch",
      "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    ],
  },
  {
    id: "new-courses",
    title: "New courses",
    subtitle: "Fresh from the Zapsters studio",
    courseIds: [
      "ai-agents-automation",
      "generative-ai-engineering",
      "accessibility-first-frontend",
      "terraform-infrastructure-as-code",
      "network-automation-python",
      "computer-vision",
    ],
  },
  {
    id: "short-practical",
    title: "Short & practical courses",
    subtitle: "Under 6 hours, immediately useful",
    courseIds: [
      "bash-scripting-for-engineers",
      "git-version-control-workflows",
      "wireshark-packet-mastery",
      "accessibility-first-frontend",
      "web-performance-engineering",
      "practical-osint-recon",
    ],
  },
];

/** Resolve a collection's ids to marketplace courses (skipping unknown ids). */
export function resolveCollection(collection: MarketplaceCollection): MarketplaceCourse[] {
  const resolved: MarketplaceCourse[] = [];
  for (const id of collection.courseIds) {
    const course = MARKETPLACE_COURSES_BY_ID.get(id);
    if (course) resolved.push(course);
  }
  return resolved;
}
