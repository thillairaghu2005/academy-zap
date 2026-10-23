import { cn } from "@/lib/utils";

import type { ContentStatus } from "@/lib/contracts/content";
import type { Order } from "@/lib/contracts/commerce";
import type { SessionUser } from "@/lib/contracts/session";
import type { LabDifficulty } from "@/lib/contracts/lab";
import type { ProblemDifficulty } from "@/lib/contracts/judge";

/** Shared status badges for the admin tables (F7). */

const COURSE_STATUS_STYLES: Record<ContentStatus, string> = {
  draft: "border-border bg-secondary text-muted-foreground",
  in_review: "border-border bg-secondary text-foreground",
  published: "border-primary/40 bg-primary/10 text-primary font-semibold",
};
const COURSE_STATUS_LABELS: Record<ContentStatus, string> = { draft: "Draft", in_review: "In review", published: "Published" };
const ORDER_STATUS_STYLES: Record<Order["status"], string> = {
  paid: "border-primary/40 bg-primary/10 text-primary font-semibold",
  failed: "border-border bg-secondary text-muted-foreground",
  refunded: "border-border bg-secondary text-muted-foreground",
};
const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "border-border bg-secondary text-foreground", beginner: "border-border bg-secondary text-foreground",
  medium: "border-border bg-secondary text-foreground", intermediate: "border-border bg-secondary text-foreground",
  hard: "border-primary/40 bg-primary/10 text-primary font-semibold", advanced: "border-primary/40 bg-primary/10 text-primary font-semibold",
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
