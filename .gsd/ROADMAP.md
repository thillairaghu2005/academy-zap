# Zapsters — GSD Roadmap

## Milestone 1: Enterprise Skills Platform Transformation

- [x] **Phase 1: Course Player & Card Foundations**
  - Course player UX, auto-completion, layout isolation, and course card actions.
  - Completed in commits `c3294c3`, `869de9e`, `bde5268`.

- [x] **Phase 2: Course Details, Player & Credentials Alignment**
  - Align course details (`course-detail-client.tsx`), player (`player-client.tsx`), and digital badge dialog (`digital-badge-dialog.tsx`) with AWS Skill Builder and IBM SkillsBuild.
  - Completed in commit `fb72619`.

- [x] **Phase 3: Auto-Scroll Progress & In-Page 10-Q Quizzes**
  - Auto-scroll progress tracking, in-page 10-question module quizzes, and Zapsters theme alignment.
  - Completed in commit `c02dd6d`.

- [x] **Phase 4: Platform-Wide IBM SkillsBuild & AWS Skill Builder Enterprise Layout Transformation**
  - Transform `/courses`, `/learning-paths`, `/assessments`, `/labs`, `/profile`, `/challenges`, and `/interviews` to match the enterprise layout of IBM SkillsBuild and AWS Skill Builder.
  - Invariants: Preserve Zapsters dark neon amber/gold UI theme; preserve marketing landing page; preserve user dashboard.
  - Plan: [.gsd/plans/PLAN-04-SKILLSBUILD-TRANSFORMATION.md](file:///d:/Projects/academy-zap/.gsd/plans/PLAN-04-SKILLSBUILD-TRANSFORMATION.md)
  - Wave 1: Enterprise Layout Foundation & Navigation Shell (Completed)
  - Wave 2: Course Catalog & Marketplace Transformation (`/courses`) (Completed)
  - Wave 3: Role-Based Learning Paths & Roadmaps Overhaul (`/learning-paths`) (Completed)
  - Wave 4: Skill Assessments & Certification Practice Exams (`/assessments`) (Completed)
  - Wave 5: Virtual Labs & Sandboxes Engine (`/labs`) (Completed)
  - Wave 6: Learner Profile, Official Transcript & Digital Credentials (`/profile`) (Completed)
