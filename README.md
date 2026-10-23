# Zapsters Academy

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.12-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.4-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-107%2F107%20Passed-brightgreen?style=flat&logo=vitest)](https://vitest.dev/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1_AA-success?style=flat)](https://www.w3.org/WAI/WCAG21/quickref/)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat)](LICENSE)

Zapsters Academy is an advanced technical learning platform and skill certification engine engineered for cybersecurity professionals, software engineers, and systems architects.

The platform combines video and interactive syllabus learning, a deterministic code judge, in-browser sandbox virtual labs, accredited exam blueprints, and an append-only, SHA-256 hash-chained gamification ledger delivering cryptographically verifiable digital credentials.

**Live Platform Demo:** [https://academy-zap.vercel.app](https://academy-zap.vercel.app)

---

## Executive Overview

Zapsters Academy eliminates generic SaaS aesthetics and AI-generated UI patterns in favor of a purposeful, high-density engineering interface. Designed from first principles for technical learners, the platform emphasizes:

- **Empirical Skill Verification:** Progress is validated through deterministic code execution, scenario-based knowledge checks, and tamper-resistant audit logs rather than passive video consumption.
- **Dual-Mode Architectural Boundary:** Runs entirely standalone in browser demo mode via structured client-side stores, or seamlessly connects to an enterprise-grade FastAPI backend with zero frontend code modification.
- **Cryptographic Trust:** All XP, rank transitions, and milestone completions derive from an append-only, hash-chained ledger and issue Ed25519-signed credentials verified against a public registry.
- **Disciplined Design System:** A strict two-font hierarchy (Geist for display/headings, Inter for UI/body), an OKLCH neutral palette accented by signature crimson, and full WCAG 2.1 AA accessibility compliance.

---

## Core Pillars & Capabilities

### 1. Course Player & Curriculum Delivery
- **Fluid Content Delivery:** Video streaming powered by Video.js with playback rate memory, picture-in-picture, and interactive transcript tracking.
- **Structured Syllabi:** Markdown-rendered reading topics featuring KaTeX mathematical expressions, syntax-highlighted code blocks, and scroll-depth progression sentinels.
- **Digital Skill Badging:** Embedded CEU credits, passing score criteria, and instant digital badge claims compatible with Credly and LinkedIn certification standards.

### 2. In-Browser Cloud Sandbox Labs
- **Interactive Terminal:** Integrated xterm.js terminal emulator with command snippet runners, session persistence, and real-time execution feedback.
- **Topology Architecture Visualizer:** Node-graph representation of lab network topologies and deployed services.
- **Automated Validation:** Step-by-step task checklist with automated verification routines evaluating simulated sandbox states.

### 3. Automated Code Judge
- **Monaco Code Editor:** Multi-language IDE environment (Python, TypeScript, Go, Rust, C++) with syntax highlighting, autocomplete, and theme coordination.
- **Deterministic Evaluation:** Multi-case test runner reporting execution runtimes, memory consumption, diff comparisons, and deterministic server verdicts.
- **Peer Solutions & Contests:** Community submission explorer, algorithmic discussion threads, and time-boxed competitive coding rounds.

### 4. Accredited Exam Blueprints & Assessments
- **Domain Weighting:** Assessments broken down into weighted enterprise competencies (e.g., Threat Modeling, Secure Coding, IAM).
- **Anti-Guessing Scoring:** Real-time combo meter multiplier rewarding consecutive correct answers on first attempts.
- **Server-Side Grading:** Deterministic scoring with immediate technical rationales, documentation citations, and automated review flags.

### 5. Hash-Chained Gamification & Integrity Core
- **Append-Only Ledger (§7.2):** Every XP delta is recorded as an immutable ledger transaction with SHA-256 hash-chain verification (`prev_hash` $\to$ `entry_hash`).
- **Dual XP System:** Independent Completion XP (curriculum progression) and Mastery XP (challenges, labs, and competitive judge victories).
- **Verifiable Credentials:** Issues digital credentials signed with Ed25519 keypairs, resolvable via rate-limited public verification endpoints (`/rank/verify/[credentialId]`).
- **Reconciliation Engine:** Real-time detection and alerting for balance drift between the immutable ledger sum and cached projection models.

### 6. Enterprise Administration & Operations
- **Two-Person Publishing Rule:** Strict draft-to-publish workflow requiring an independent second reviewer to approve course revisions with visual diff inspection.
- **Ledger Audit & Integrity Gate:** Administrative console to inspect raw ledger entries, context version snapshots, and flag or reverse suspicious transactions.
- **Support Operations:** Ticket management queue with internal staff notes, status transitions, and user inquiry threading.

---

## Architecture & Boundary Isolation

Zapsters Academy implements a decoupled architectural boundary governed by the `NEXT_PUBLIC_AUTH_MODE` configuration switch:

```text
                               +-----------------------------+
                               |     Next.js Application     |
                               | (App Router, Turbopack, UI) |
                               +--------------+--------------+
                                              |
                                              v
                              +-------------------------------+
                              |    Client Data Boundary       |
                              | (SessionProvider & Services)  |
                              +---------------+---------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
   [ NEXT_PUBLIC_AUTH_MODE=demo ]                    [ NEXT_PUBLIC_AUTH_MODE=backend ]
+------------------------------------+             +------------------------------------+
|        Local Browser Layer         |             |       FastAPI Gateway Proxy        |
|  - In-memory & localStorage stores |             |  - Same-origin /api/backend proxy  |
|  - Deterministic mock services     |             |  - HttpOnly JWT access/refresh     |
|  - Zero network/backend dependency |             |  - Redis token denylist & RBAC     |
+------------------------------------+             +-----------------+------------------+
                                                                     |
                                                                     v
                                                   +------------------------------------+
                                                   |       FastAPI Microservices        |
                                                   |  - PostgreSQL 16 + TimescaleDB     |
                                                   |  - Redis 7 Streams Event Bus       |
                                                   |  - Arq Asynchronous Workers        |
                                                   |  - SHA-256 Ledger & Integrity Gate |
                                                   +------------------------------------+
```

- **Demo Mode (`NEXT_PUBLIC_AUTH_MODE=demo`):** The application runs entirely client-side. Realistic mock services simulate API latency, mutations, grading, checkout sequences, and error conditions without external infrastructure.
- **Backend Mode (`NEXT_PUBLIC_AUTH_MODE=backend`):** The application transparently proxies requests to the real FastAPI backend. Authentication tokens are securely handled via `HttpOnly`, `SameSite=Lax` cookies with strict RBAC enforcement.

---

## Design System & Aesthetic Standards

The interface is engineered to adhere to strict institutional design principles:

| Principle | Specification |
|:---|:---|
| **Typography System** | Strict two-font system. Primary: **Geist** (`--font-heading`) for titles, display, and CTAs with consistent scale and weights. Secondary: **Inter** (`--font-body`) for body copy, data tables, and UI labels with consistent body thickness. |
| **Color System** | Built on perceptual OKLCH color spaces. High-contrast neutral surfaces (`surface-1`, `surface-2`, `surface-3`) with a single crimson brand accent (`#D92640`). |
| **Monochrome Iconography** | Strictly unified Lucide icons. Eliminates arbitrary multi-color icons in favor of monochrome foreground, muted foreground, or primary brand tokens. |
| **Clean Surfaces** | Removed artificial icon background boxes, divided border lines (`divide-y`), and blinking status dots. Icons and data points render cleanly and directly. |
| **Accessibility** | Minimum 4.5:1 text contrast on all surfaces (WCAG AA), accessible focus rings with double offsets, keyboard-navigable modals, and ARIA live regions for dynamic announcements. |

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16.2.12 (Turbopack, App Router, React Server Components)
- **Runtime:** React 19.2.4
- **Language:** TypeScript 5.9.3 (Strict Mode)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`), OKLCH semantic tokens
- **Component Primitives:** `@base-ui/react`, `@radix-ui/react-*`
- **State & Data Fetching:** `@tanstack/react-query` v5
- **Animations:** Framer Motion v12
- **Editors & Visuals:** Monaco Editor, xterm.js, D3.js v7, KaTeX, Video.js
- **Testing:** Vitest 4.1.10

### Backend (Foundational Services)
- **Framework:** FastAPI (0.141.x line), Starlette (patched 1.x line), Pydantic v2
- **Database:** PostgreSQL 16 + TimescaleDB, SQLAlchemy 2.0 (async), Alembic
- **Caching & Event Bus:** Redis 7, Redis Streams outbox pattern, Arq worker pool
- **Security:** Argon2id (`pwdlib`), PyJWT, Ed25519 asymmetric signatures, rate limiting

---

## Directory Structure

```text
academy-zap/
├── app/                        # Next.js App Router routes & layouts
│   ├── (auth)/                 # Authentication flows (login, register)
│   ├── admin/                  # Administrative management & audit consoles
│   ├── assessments/            # Accredited exams and blueprint attempts
│   ├── cart/ & checkout/       # Course enrollment & subscription checkout
│   ├── courses/                # Course catalog, details, and lesson player
│   ├── dashboard/              # Learner dashboard, streak tracker, and insights
│   ├── judge/                  # Coding challenges, contests, and Monaco IDE
│   ├── labs/                   # Cloud sandbox lab workspaces and terminals
│   ├── profile/                # Skill matrix, badges, and ledger transcript
│   ├── rank/                   # League standings and credential verification
│   ├── globals.css             # Tailwind v4 theme definitions and OKLCH tokens
│   └── layout.tsx              # Root layout with providers and SEO metadata
├── components/                 # Reusable React component library
│   ├── admin/                  # Administrative diff cards and reconciliation panels
│   ├── assessments/            # Exam runners, question cards, and combo meters
│   ├── courses/                # Video players, syllabi, and note-taking drawers
│   ├── gamification/           # Hash ledger viewer, badge walls, and skill trees
│   ├── judge/                  # Problem list, IDE controls, and submission panels
│   ├── lab/                    # Virtual lab terminals, topologies, and runners
│   ├── landing/                # High-density marketing sections and live demos
│   ├── layout/                 # Global navigation rails and notification centers
│   └── ui/                     # Accessible design system primitives (Base UI)
├── lib/                        # Core utilities and business logic
│   ├── contracts/              # Shared TypeScript domain contracts
│   ├── data/demo/              # Async client services for standalone execution
│   ├── mocks/                  # Realistic fixture data and immutable seed sets
│   └── format.ts               # Localized currency, runtime, and date formatters
├── backend/                    # FastAPI backend microservices and migrations
│   ├── platform_core/          # Auth, RBAC, event bus, and audit logging
│   ├── gamification/           # SHA-256 append-only ledger and leagues engine
│   ├── content/                # Course publishing workflow and lesson tracking
│   └── assessments/            # Server-side grading and telemetry engine
└── public/                     # Static assets, brand marks, and Monaco workers
```

---

## Getting Started

### Prerequisites
- **Node.js:** `>= 20.18.0` (LTS recommended)
- **Package Manager:** `pnpm >= 9.0.0`
- *(Optional for Backend)*: Python `3.12`, Docker Desktop

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/thillairaghu2005/academy-zap.git
   cd academy-zap
   ```

2. **Install frontend dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   *(The default configuration runs in standalone demo mode with no external dependencies required.)*

4. **Start the development server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Quality Commands

All code must pass strict quality and compilation checks prior to deployment:

```bash
# Execute unit and integration tests (107 tests across 16 suites)
pnpm test

# Run TypeScript typecheck across all files
pnpm typecheck

# Execute ESLint validation
pnpm lint

# Build optimized production bundle with Next.js Turbopack
pnpm build

# Launch production server locally
pnpm start
```

---

## Default Seeded Credentials

When running in demo mode (`NEXT_PUBLIC_AUTH_MODE=demo`), the following pre-seeded user accounts are available:

| Account Type | Email | Password | Role / Access Level |
|:---|:---|:---|:---|
| **Learner** | `demo@zapsters.dev` | `demo123` | Full student profile, active streak, enrolled courses |
| **Admin** | `admin@zapsters.dev` | `admin123` | Course review workflow, ledger reconciliation, audit logs |
| **Instructor** | `instructor@zapsters.dev` | `instructor123` | Course authoring console, student metrics |

---

## Backend Subsystem Foundation Status

The backend infrastructure architecture enforces explicit status transparency between functional foundation slices and planned extensions:

| Subsystem | Scope | Foundation Implementation Status |
|:---|:---|:---|
| **B0: Platform Core** | Auth, RBAC, Organizations | **Production Live** (Argon2id, JWT cookies, Redis denylist, audit logging) |
| **B1: Event Bus** | Messaging & Outbox | **Production Live** (Redis Streams producer/consumer, DLQ, idempotency store) |
| **B2: Content Engine** | Courses & Lessons | **Production Live** (Catalog, lesson progress, completion events) |
| **B3: Ledger & Integrity** | Gamification Ledger | **Production Live** (Append-only SHA-256 chain, Integrity Gate, review queue) |
| **B4: Progress Context** | Ranks, Streaks, Leagues | **Production Live** (Dual XP tracks, Redis projections, Ed25519 credentials) |
| **B5: Code Judge** | Sandbox Execution | Typed HTTP 501 Stubs (Browser simulation active in frontend) |
| **B6: Virtual Labs** | Cloud Runtime | Typed HTTP 501 Stubs (Browser terminal active in frontend) |
| **B7: Assessments** | Exams & Knowledge Checks | **Production Live** (MCQ deterministic server grading, telemetry pipeline) |
| **B8: Commerce** | Orders & Billing | Typed HTTP 501 Stubs (Simulated checkout flow active in frontend) |
| **B9: Search & Notifications**| Indexing & Dispatch | Typed HTTP 501 Stubs (Local search active in frontend) |

---

## Security & Compliance Architecture

- **Cryptographic Verifiability:** Digital badges and completion certificates are signed using asynchronous Ed25519 keys and verifiable via public cryptographic records.
- **Append-Only Accounting:** XP allocations and level promotions cannot be mutated or deleted; corrections are handled exclusively via counterbalancing adjustment entries.
- **PCI Scope Isolation:** Payment and billing surfaces never collect or transmit raw payment card data; transactions integrate with provider-hosted frames.
- **Zero-Trust Token Handling:** Session tokens use secure, partitioned cookies with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
