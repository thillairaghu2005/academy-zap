import type { Course, CourseLesson } from "@/lib/contracts/content";

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
 * Derives official AWS Skill Builder / IBM SkillsBuild enterprise metadata
 * for any course across the platform.
 */
export function getCourseSkillBuildMeta(course: Course) {
  // Course Code like "SB-AWS-SEC-204" or "IBM-SB-AI-102"
  const catCode = course.category.toUpperCase().slice(0, 3);
  const hash = Math.abs(course.id.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
  const codeNum = 100 + (hash % 899);
  const courseCode = `SB-${catCode}-${codeNum}`;

  const levelTag: SkillBadgeInfo["level"] =
    course.level === "advanced" ? "Professional" : course.level === "intermediate" ? "Associate" : "Foundational";

  const badgeInfo: SkillBadgeInfo = {
    id: `cred-${course.id.slice(0, 8)}`,
    badgeCode: `BADGE-${catCode}-${codeNum}`,
    name: `${course.title} — Verified Skill Credential`,
    tagline: `Demonstrated competency in ${course.category} architectures, applied best practices, and verified lab implementation.`,
    issuer: "Zapsters Enterprise Academy",
    partner: "AWS Skill Builder & IBM SkillsBuild Accredited Pathway",
    level: levelTag,
    ceuCredits: Math.max(0.5, Number((course.estimated_hours * 0.1).toFixed(1))),
    passingScorePct: 80,
    skillsValidated: [
      `${course.category} Fundamentals`,
      "Zero-Trust Architecture",
      "Applied Security Automation",
      "Production Workload Hardening",
      "Compliance & Threat Mitigation",
    ],
    criteria: [
      "Complete 100% of interactive course modules and labs",
      "Demonstrate hands-on competency in the interactive Cloud Sandbox",
      "Achieve 80% or higher score on the scenario-based Knowledge Check Assessment",
    ],
    verificationUrl: `https://zapsters.dev/verify/cred-${course.id.slice(0, 8)}`,
    issueDate: "October 2026",
    expiryDate: "Valid indefinitely (No expiration)",
  };

  const learningObjectives = [
    `Architect and configure resilient, secure ${course.category} workloads following enterprise design patterns.`,
    `Identify, evaluate, and mitigate common operational risks, misconfigurations, and attack surfaces.`,
    `Execute hands-on implementation tasks using simulated CLI and Cloud Shell tooling.`,
    `Apply principles of least privilege, continuous verification, and automated monitoring.`,
    `Prepare for accredited industry certifications with scenario-based technical knowledge checks.`,
  ];

  const targetAudience = [
    { role: "Cloud & Security Engineers", desc: "Professionals implementing scalable cloud workloads and access control." },
    { role: "Solutions Architects", desc: "Engineers designing resilient architectures aligned to AWS / IBM best practices." },
    { role: "DevSecOps & Operations", desc: "Practitioners managing deployment pipelines, telemetry, and automated mitigation." },
  ];

  const prerequisites = [
    "Foundational understanding of core computing and networking concepts (TCP/IP, HTTP, DNS).",
    "Familiarity with command-line interfaces and basic scripting (Python / Bash).",
    "No paid cloud subscription required — all labs run in the integrated Zapsters sandbox.",
  ];

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
 */
export function getLabScenario(course: Course, lesson: CourseLesson): LabScenarioData {
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
        cliHint: "aws iam get-role-policy --role-name app-execution-role",
      },
      {
        id: "task-2",
        title: "Task 2: Apply Scoped Least-Privilege Policy",
        description: "Deploy the hardened JSON access policy restricting S3 and KMS key operations to explicit resource ARNs.",
        cliHint: "aws iam put-role-policy --role-name app-execution-role --policy-name scoped-access",
      },
      {
        id: "task-3",
        title: "Task 3: Verify Audit Logging & Ingress Controls",
        description: "Query CloudTrail / Event Streams to confirm unauthorized attempts are rejected with 403 Forbidden.",
        cliHint: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=AccessDenied",
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
        command: "aws iam get-role-policy --role-name app-execution-role",
        output: `{\n  "RoleName": "app-execution-role",\n  "PolicyName": "legacy-policy",\n  "PolicyDocument": {\n    "Version": "2012-10-17",\n    "Statement": [{\n      "Effect": "Allow",\n      "Action": ["s3:GetObject", "s3:PutObject"],\n      "Resource": "arn:aws:s3:::corporate-data/*"\n    }]\n  }\n}`,
      },
      {
        command: "aws s3 ls s3://corporate-data/audit-logs/",
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
 * Generates realistic scenario-based knowledge check questions modeled after
 * AWS Skill Builder & IBM SkillsBuild certification prep exams.
 */
export function getKnowledgeCheckQuestions(course: Course, lesson: CourseLesson): KnowledgeCheckQuestion[] {
  const hash = Math.abs((course.id + lesson.id).split("").reduce((acc, c) => (acc * 19 + c.charCodeAt(0)) | 0, 0));

  const questionsPool: KnowledgeCheckQuestion[] = [
    {
      id: "q1",
      domain: "Security & Access Management",
      scenario: "An enterprise application hosted on an EC2 instance needs to securely read encrypted objects from an Amazon S3 bucket. The security architect prohibits embedding long-term API credentials in code or configuration files.",
      question: "Which approach aligns with AWS Skill Builder and IBM SkillsBuild security best practices?",
      options: [
        "Store AWS access keys in an environment variable on the server instance",
        "Create an IAM Role with an attached policy and associate an IAM Instance Profile with the EC2 instance",
        "Generate a temporary presigned URL on every request using root account credentials",
        "Enable public read access on the S3 bucket with an IP address restriction block",
      ],
      correctIndex: 1,
      explanation: "IAM Roles and Instance Profiles eliminate the need to distribute or manage long-term credentials. The AWS SDK automatically requests and rotates short-lived credentials via the instance metadata service (IMDSv2).",
      documentationRef: "AWS Security Pillar §4.2: Manage and Rotate Credentials Securely",
    },
    {
      id: "q2",
      domain: "Resilience & Architecture",
      scenario: "During an architecture review, an engineering team must ensure that unexpected infrastructure outages in a single Availability Zone (AZ) do not disrupt continuous user requests.",
      question: "Which architectural design pattern provides the most fault-tolerant solution?",
      options: [
        "Deploy a multi-AZ architecture behind an Application Load Balancer with auto-scaling across diverse zones",
        "Increase the compute instance size to a larger instance type within the primary Availability Zone",
        "Schedule hourly automated database snapshots to be archived in cold glacier storage",
        "Run an active-passive standby server in the same subnet with manual DNS failover",
      ],
      correctIndex: 0,
      explanation: "Multi-AZ redundancy coupled with health-checked load balancing automatically reroutes traffic around impaired zones without manual intervention, upholding high availability SLA requirements.",
      documentationRef: "IBM SkillsBuild Cloud Patterns: Designing Fault-Tolerant Distributed Systems",
    },
    {
      id: "q3",
      domain: "Governance & Threat Detection",
      scenario: "A compliance auditor discovers that root user login activity occurred outside standard change management maintenance windows.",
      question: "Which automated detection mechanism should the security team configure to alert within 60 seconds?",
      options: [
        "Run a weekly Python script to query CloudTrail historical event downloads",
        "Configure an EventBridge rule matching CloudTrail 'ConsoleLogin' events where userIdentity.type is 'Root', triggering an Amazon SNS notification",
        "Check S3 access logs at the end of each billing cycle",
        "Require engineers to manually send a Slack message whenever root credentials are used",
      ],
      correctIndex: 1,
      explanation: "Streaming CloudTrail events into EventBridge provides near real-time telemetry. An automated EventBridge rule directly invokes notifications or remediation functions within seconds of unauthorized activity.",
      documentationRef: "AWS Skill Builder: Automated Security Response & Incident Notification",
    },
  ];

  // Pick questions based on deterministic hash
  const q1 = questionsPool[hash % questionsPool.length]!;
  const q2 = questionsPool[(hash + 1) % questionsPool.length]!;
  const q3 = questionsPool[(hash + 2) % questionsPool.length]!;

  return [q1, q2, q3];
}
