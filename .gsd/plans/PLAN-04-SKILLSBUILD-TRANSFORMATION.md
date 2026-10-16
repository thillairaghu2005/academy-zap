---
phase: 4
plan: 4.0
wave: 1-6
status: completed
gap_closure: false
title: "Platform-Wide IBM SkillsBuild & AWS Skill Builder Enterprise Layout Transformation"
theme: "Zapsters Dark Neon Amber (#F59E0B / #D97706)"
frozen_surfaces:
  - "Landing Page (app/(marketing)/page.tsx & components/landing/*)"
  - "Dashboard (app/(app)/dashboard/page.tsx & components/dashboard/*)"
---

# Plan 4.0: Platform-Wide IBM SkillsBuild & AWS Skill Builder Layout Transformation

## Objective
Transform the entire Zapsters learning platform to match the enterprise layout paradigms of **IBM SkillsBuild** and **Amazon SkillsBuild (AWS Skill Builder)** — following the successful course player, detail, and digital badge alignments in commits `fb72619` and `c02dd6d`.

Strict Invariants:
1. **Preserve Zapsters UI Theme**: Retain the dark neon amber/gold theme (`#F59E0B`/`#D97706`), deep dark surfaces (`#090D16`/`#0F172A`), glowing borders, and typography. No IBM blue or AWS orange palette changes.
2. **Preserve Landing Page**: `app/(marketing)/page.tsx` and all components in `components/landing/*` remain completely untouched.
3. **Preserve Dashboard**: `app/(app)/dashboard/page.tsx` and all components in `components/dashboard/*` remain completely untouched.

## Context
Load these files for context:
- `build.md` (Frontend F0-F9 architecture)
- `components/courses/player-client.tsx` (AWS Skill Builder / IBM SkillsBuild player reference)
- `components/courses/course-detail-client.tsx` (AWS / IBM SkillsBuild course overview reference)
- `components/courses/digital-badge-dialog.tsx` (Credly / Open Badges reference)
- `lib/courses/skillbuild-helpers.ts` (Enterprise metadata and badge helpers)
- `design-ref/` (AWS Skill Builder visual frames)

---

## Tasks

### Wave 1: Enterprise Layout Foundation & Navigation Shell

<task type="auto">
  <name>Task 4.1: Enterprise Navigation Strip & Catalog Quick-Access</name>
  <files>
    components/layout/skillbuild-nav-strip.tsx
    components/layout/top-nav.tsx
    components/layout/side-nav.tsx
    lib/navigation.ts
  </files>
  <action>
    Create `components/layout/skillbuild-nav-strip.tsx` to provide an AWS Skill Builder / IBM SkillsBuild-inspired enterprise utility strip beneath the primary top bar:
    1. Quick-access navigation: "Explore Catalog", "Role Pathways", "Hands-on Sandboxes", "Skill Assessments", "My Transcripts & Badges".
    2. Enterprise domain quick-filter chips (Cloud Architecture, Generative AI, Cyber Defense, Enterprise DevOps, Data Engineering).
    3. Style in Zapsters dark theme (`bg-background/80 backdrop-blur-md border-b border-border/40 text-xs font-medium text-muted-foreground hover:text-primary`).
    4. Mount inside `TopNav` across authenticated learning routes (`/courses`, `/learning-paths`, `/assessments`, `/labs`, `/profile`), while keeping marketing landing and dashboard completely untouched.
  </action>
  <verify>pnpm typecheck && pnpm test</verify>
  <done>Enterprise navigation strip displays smoothly on learning routes; landing and dashboard remain untouched.</done>
</task>

---

### Wave 2: Course Catalog & Marketplace Transformation (`/courses`)

<task type="auto">
  <name>Task 4.2: Enterprise Faceted Filter Rail & Domain Search</name>
  <files>
    components/courses/marketplace/enterprise-filter-rail.tsx
    components/courses/marketplace/marketplace-client.tsx
    lib/mocks/marketplace.ts
  </files>
  <action>
    Transform `MarketplaceClient` from Udemy-style rails to the AWS Skill Builder / IBM SkillsBuild enterprise catalog layout:
    1. Create `EnterpriseFilterRail` with multi-faceted filtering:
       - Domain/Topic: Cloud Architecture, AI & Machine Learning, Cyber Defense, Modern DevOps, Full-Stack Systems.
       - Delivery Format: Digital Training (Self-paced), Hands-on Lab, Learning Plan, Exam Readiness.
       - Skill Level: Foundational, Associate, Professional / Specialty.
       - Credentials: "Includes Verifiable Digital Badge" (Credly-style) toggle.
       - Duration: <2 hours, 2–5 hours, 5–10 hours, 10+ hours.
    2. Active filter chips with 1-click clear and real-time query count.
    3. Grid and detailed syllabus list views.
    4. Preserve all existing cart, checkout, and enrollment hooks without breaking contract signatures.
  </action>
  <verify>pnpm typecheck</verify>
  <done>Faceted filter rail renders on `/courses`; users can filter by domain, level, format, and badge status; URL params synchronized.</done>
</task>

<task type="auto">
  <name>Task 4.3: AWS/IBM SkillsBuild Standardized Course Cards & Badging Ribbons</name>
  <files>
    components/courses/marketplace/course-card.tsx
    components/courses/marketplace/course-rail.tsx
    lib/courses/skillbuild-helpers.ts
  </files>
  <action>
    Re-architect `CourseCard` to adhere strictly to the AWS Skill Builder / IBM SkillsBuild card layout:
    1. Header accreditation strip: e.g. "DIGITAL TRAINING • ACCREDITED PATHWAY".
    2. Hexagonal digital badge icon indicator with tooltip explaining verifiable badge eligibility.
    3. Prominent metadata row: Duration (hours), Skill Level badge, Domain Category, CEU/CPD credits.
    4. Enrolled state: Linear/circular progress meter with "Resume Learning" action.
    5. Clean Zapsters dark theme styling: Deep card surface (`bg-card/90 border-border/60 hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]`).
  </action>
  <verify>pnpm typecheck</verify>
  <done>Course cards display enterprise badges, metadata, and progress indicators matching AWS Skill Builder.</done>
</task>

---

### Wave 3: Role-Based Learning Paths & Roadmaps Overhaul (`/learning-paths`)

<task type="auto">
  <name>Task 4.4: Role-Based Learning Plans Catalog</name>
  <files>
    components/learning/learning-paths.tsx
    lib/data/demo/learning-paths.ts
  </files>
  <action>
    Upgrade `/learning-paths` to reflect AWS Skill Builder Role-Based Learning Plans & IBM SkillsBuild Pathways:
    1. Group paths into strategic enterprise roles:
       - Cloud Solutions Architect
       - Enterprise AI & LLM Systems Engineer
       - Zero-Trust Cyber Defense Specialist
       - DevOps & Cloud-Native SRE
    2. Path Card Specification:
       - Estimated timeline: Total Hours, Course count, Hands-on Lab count, Practice Exam count.
       - Credly-style hexagonal completion badge preview.
       - Target job role outcomes and salary benchmark signals.
       - Multi-step progress bar showing completed milestones vs. remaining.
    3. Filter by Role, Difficulty, and Career Track.
  </action>
  <verify>pnpm typecheck</verify>
  <done>Learning paths catalog presents structured role pathways with enterprise metadata and credential previews.</done>
</task>

<task type="auto">
  <name>Task 4.5: Visual Multi-Stage Milestone Journey & Ramp-Up Guide</name>
  <files>
    components/learning/learning-path-detail.tsx
    app/(app)/learning-paths/[id]/page.tsx
  </files>
  <action>
    Re-implement `LearningPathDetail` to deliver the comprehensive AWS Skill Builder / IBM SkillsBuild milestone roadmap:
    1. Hero Section: Pathway overview, accredited partner badge, prerequisites, CEU credits, credential preview dialog.
    2. Multi-Stage Sequential Stepper:
       - Stage 1: Core Fundamentals & Diagnostic Check (prerequisite reading + diagnostic quiz).
       - Stage 2: Architecture & Implementation (in-depth courses with real-world case studies).
       - Stage 3: Hands-on Sandbox Labs (interactive cloud/code labs with flag verification).
       - Stage 4: Capstone Exam & Credential Award (timed practice assessment unlocking verifiable digital badge).
    3. Milestone Nodes:
       - Status states: Completed (emerald checkmark), In Progress (glowing Zapsters amber node with pulse animation), Locked (padlock with prerequisite requirement).
       - Node type badges: Course, Hands-on Lab, Assessment, Reading Guide.
    4. "Ramp-Up Guide" sidebar: Downloadable study syllabus, reference documentation links, and mentor office hours.
  </action>
  <verify>pnpm typecheck</verify>
  <done>Learning path detail page renders an interactive 4-stage milestone roadmap with prerequisites and credential unlock mechanics.</done>
</task>

---

### Wave 4: Skill Assessments & Certification Practice Exams (`/assessments`)

<task type="auto">
  <name>Task 4.6: Dual-Track Assessment Catalog with Exam Blueprints</name>
  <files>
    components/assessments/catalog-client.tsx
    lib/contracts/assessment.ts
    lib/data/demo/assessment.ts
  </files>
  <action>
    Re-structure `AssessmentCatalogClient` into the AWS Practice Exam / IBM SkillsBuild Assessment layout:
    1. Dual-Track categorization:
       - Track A: Diagnostic Skill Assessments (adaptive, 20-30 mins, identifies knowledge gaps, unlimited retakes).
       - Track B: Official Certification Practice Exams (timed simulation, 65 questions, strict domain weighting, passing score 750/1000).
    2. Blueprint preview modal/cards: Breakdown of domains covered with percentage weightings.
    3. Display retake policy, time limit, question formats, and passing score thresholds.
  </action>
  <verify>pnpm typecheck</verify>
  <done>Assessments catalog presents distinct diagnostic vs certification readiness tracks with explicit domain blueprint weightings.</done>
</task>

<task type="auto">
  <name>Task 4.7: Timed Exam Simulation, Review Flagging & Diagnostic Scorecard</name>
  <files>
    components/assessments/assessment-detail-client.tsx
    components/assessments/attempt-client.tsx
  </files>
  <action>
    Enhance assessment runner and results to match enterprise certification exam standards:
    1. Runner Header: Exam title, active question indicator, countdown timer with warning colors (<5m amber, <1m red).
    2. Question Navigation Drawer: Matrix of question numbers with states: Answered, Unanswered, Flagged for Review.
    3. Post-Assessment Diagnostic Scorecard (IBM SkillsBuild standard):
       - Overall verdict: PASS (Score >= 75%) or NEEDS REVIEW with numerical score.
       - Domain-by-Domain Competency Bars (e.g. Cloud Security: 88% Proficient; Architecture: 62% Needs Review).
       - "Remedial Learning Recommendations": Direct links to courses and labs that remediate the learner's weak domains.
  </action>
  <verify>pnpm typecheck</verify>
  <done>Assessment attempt runner features question matrix navigation, review flagging, and domain diagnostic scorecards.</done>
</task>

---

### Wave 5: Virtual Labs, Learner Profile & Credentials Portfolio (`/labs`, `/profile`)

<task type="auto">
  <name>Task 4.8: AWS Builder Labs / Jam Architecture Scenario Layout</name>
  <files>
    components/lab/catalog-client.tsx
    components/lab/session-client.tsx
  </files>
  <action>
    Align Virtual Labs with AWS Builder Labs and IBM Hands-on Sandboxes:
    1. Lab Catalog: Group by Enterprise Cloud & Architecture Domains; duration, sandbox type, XP reward.
    2. Lab Session Workspace:
       - Left Pane: Scenario Briefing, Architectural Topology Diagram, Multi-Objective Checklist.
       - Top Bar: Sandbox TTL countdown timer, Cloud Credentials Drawer, "Verify Objective" button.
       - Clue / Hint Ladder: Progressive hints with scoring/XP deduction warnings.
  </action>
  <verify>pnpm typecheck</verify>
  <done>Virtual labs present scenario architecture briefings, automated objective verification, and timed sandbox sessions.</done>
</task>

<task type="auto">
  <name>Task 4.9: Enterprise Transcript & Credential Hub Overhaul</name>
  <files>
    components/profile/profile-page-client.tsx
    components/profile/profile-transcript.tsx
    components/profile/profile-badges-gallery.tsx
    components/profile/profile-skills-matrix.tsx
  </files>
  <action>
    Transform `ProfilePageClient` into an IBM SkillsBuild & AWS Skill Builder Credential Hub:
    1. Profile Header: Learner ID, Academy Organization, Total Verifiable Badges Earned, Total Learning Hours, CPE/CEU credits.
    2. Four Enterprise Tabs:
       - Tab 1: Verifiable Digital Badges (Credly/Open Badges compliant gallery with hexagonal badges).
       - Tab 2: Official Learning Transcript (audit ledger of completed courses, assessments, and labs with "Print / Export Transcript").
       - Tab 3: Skill Competency Matrix (proficiency bars across Cloud, AI/ML, Security, DevOps, Software Engineering).
       - Tab 4: In-Progress Curriculum (fast resumption cards).
  </action>
  <verify>pnpm typecheck</verify>
  <done>Profile page functions as an official credential hub with Credly badges, exportable transcripts, and competency skill meters.</done>
</task>

<task type="auto">
  <name>Task 4.10: Challenges & Practice Surfaces Alignment</name>
  <files>
    components/judge/challenges.tsx
    components/assessments/interviews.tsx
    app/(app)/saved/page.tsx
  </files>
  <action>
    Align remaining practice surfaces:
    1. Coding Challenges (`/challenges`): AWS Jam format with real-world bug/feature scenarios, test suite verification, and enterprise skill tags.
    2. Mock Interviews (`/interviews`): Structured competency question sets aligned with AWS & IBM role interview frameworks (STAR method rubric).
    3. Saved Items (`/saved`): Reorganized into "Enrolled Curriculum", "Saved For Later", and "Assigned Learning".
  </action>
  <verify>pnpm typecheck</verify>
  <done>Challenges, mock interviews, and saved collections match the enterprise learning layout and navigation structure.</done>
</task>

---

## Must-Haves & Success Criteria
- [ ] All tasks verified passing with `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
- [ ] Landing page (`app/(marketing)/page.tsx` & `components/landing/*`) is 100% identical and untouched.
- [ ] Dashboard (`app/(app)/dashboard/page.tsx` & `components/dashboard/*`) is 100% identical and untouched.
- [ ] UI Theme is strictly Zapsters dark neon amber/gold (`#F59E0B`/`#D97706`).
- [ ] No broken routes, hydration errors, or regression bugs.
