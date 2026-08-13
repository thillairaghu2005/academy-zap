import { cn } from "@/lib/utils";

import type { ContentStatus } from "@/lib/contracts/content";
import type { Order } from "@/lib/contracts/commerce";
import type { SessionUser } from "@/lib/contracts/session";
import type { LabDifficulty } from "@/lib/contracts/lab";
import type { ProblemDifficulty } from "@/lib/contracts/judge";

/** Shared status badges for the admin tables (F7). */

const COURSE_STATUS_STYLES: Record<ContentStatus, string> = {
  draft: "border-slate-400/40 bg-slate-500/10 text-slate-500",
  in_review: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  published: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
};
const COURSE_STATUS_LABELS: Record<ContentStatus, string> = { draft: "Draft", in_review: "In review", published: "Published" };
const ORDER_STATUS_STYLES: Record<Order["status"], string> = {
  paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  failed: "border-primary-border bg-primary-light text-primary",
  refunded: "border-slate-400/40 bg-slate-500/10 text-slate-500",
};
const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700", beginner: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-700", intermediate: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  hard: "border-primary-border bg-primary-light text-primary", advanced: "border-primary-border bg-primary-light text-primary",
};

export function CourseStatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
         COURSE_STATUS_STYLES[status],
      )}
    >
      {COURSE_STATUS_LABELS[status]}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
         ORDER_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: SessionUser["role"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
        role === "admin"
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-secondary text-muted-foreground",
      )}
    >
      {role}
    </span>
  );
}

export function DifficultyBadge({
  difficulty,
}: {
  difficulty: LabDifficulty | ProblemDifficulty;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
         DIFFICULTY_STYLES[difficulty] ?? "border-border bg-secondary text-muted-foreground",
      )}
    >
      {difficulty}
    </span>
  );
}
