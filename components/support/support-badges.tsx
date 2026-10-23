import { cn } from "@/lib/utils";

import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@/lib/contracts/support";

/** Shared support badges — used by both the learner and admin surfaces. */

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "border-border bg-secondary text-foreground",
  pending: "border-border bg-secondary text-muted-foreground",
  resolved: "border-border bg-secondary text-muted-foreground",
  closed: "border-border bg-secondary text-muted-foreground",
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "border-border bg-secondary text-muted-foreground",
  medium: "border-border bg-secondary text-muted-foreground",
  high: "border-border bg-secondary text-foreground font-semibold",
  urgent: "border-primary/40 bg-primary/10 text-primary font-semibold",
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
