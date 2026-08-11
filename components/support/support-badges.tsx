import { cn } from "@/lib/utils";

import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/lib/contracts/support";

/** Shared support badges — used by both the learner and admin surfaces. */

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "border-primary-border bg-primary-light text-primary",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  resolved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  closed: "border-slate-400/40 bg-slate-500/10 text-slate-500",
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "border-border bg-secondary text-muted-foreground",
  medium: "border-primary-border bg-primary-light text-primary",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  urgent: "border-primary-border bg-primary-light text-primary",
};

function badgeClass(styles: string): string {
  return cn(
    "inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
    styles,
  );
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <span className={badgeClass(STATUS_STYLES[status])}>{status}</span>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={badgeClass(PRIORITY_STYLES[priority])}>
      {priority}
    </span>
  );
}

export function TicketCategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-caption font-medium uppercase tracking-wide text-muted-foreground">
      {category}
    </span>
  );
}
