import { cn } from "@/lib/utils";

import type { ContentStatus } from "@/lib/contracts/content";
import type { Order } from "@/lib/contracts/commerce";
import type { SessionUser } from "@/lib/contracts/session";
import type { LabDifficulty } from "@/lib/contracts/lab";
import type { ProblemDifficulty } from "@/lib/contracts/judge";

/** Shared status badges for the admin tables (F7). */

export function CourseStatusBadge({ status }: { status: ContentStatus }) {
  const styles: Record<ContentStatus, string> = {
    draft: "border-slate-400/40 bg-slate-500/10 text-slate-500",
    in_review: "border-amber-500/40 bg-amber-500/10 text-amber-600",
    published: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  };
  const labels: Record<ContentStatus, string> = {
    draft: "Draft",
    in_review: "In review",
    published: "Published",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: Order["status"] }) {
  const styles: Record<Order["status"], string> = {
    paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
    failed: "border-rose-500/40 bg-rose-500/10 text-rose-600",
    refunded: "border-slate-400/40 bg-slate-500/10 text-slate-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[status],
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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
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
  const styles: Record<string, string> = {
    easy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
    beginner: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-600",
    intermediate: "border-amber-500/40 bg-amber-500/10 text-amber-600",
    hard: "border-rose-500/40 bg-rose-500/10 text-rose-600",
    advanced: "border-rose-500/40 bg-rose-500/10 text-rose-600",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[difficulty] ?? "border-border bg-secondary text-muted-foreground",
      )}
    >
      {difficulty}
    </span>
  );
}
