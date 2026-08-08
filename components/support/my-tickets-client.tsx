"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  LifeBuoy,
  MessageSquare,
  Plus,
  UserRound,
} from "lucide-react";

import type { TicketStatus } from "@/lib/contracts/support";
import { listMyTickets } from "@/lib/api/support";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCard } from "@/components/shared/skeletons";
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/support/support-badges";
import { cn } from "@/lib/utils";

const STATUS_TABS: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Awaiting you" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export function MyTicketsClient() {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const [tab, setTab] = React.useState<TicketStatus | "all">("all");

  const ticketsQuery = useQuery({
    queryKey: ["my-tickets", userId],
    queryFn: () => listMyTickets(userId),
    enabled: Boolean(user),
  });

  const visible =
    tab === "all"
      ? ticketsQuery.data
      : ticketsQuery.data?.filter((t) => t.status === tab);

  return (
    <PageContainer>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-h1">
            Support
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your tickets and their replies — add a ticket any time something
            breaks or billing looks off.
          </p>
        </div>
        <Button variant="gradient" asChild className="mt-3 w-fit sm:mt-0">
          <Link href="/support/new">
            <Plus className="size-4" />
            New ticket
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div className="mt-6 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter tickets by status">
        {STATUS_TABS.map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() => setTab(status.value)}
            id={`support-tab-${status.value}`}
            role="tab"
            aria-selected={tab === status.value}
            aria-controls="support-ticket-panel"
            tabIndex={tab === status.value ? 0 : -1}
            onKeyDown={(event) => {
              const currentIndex = STATUS_TABS.findIndex((item) => item.value === status.value);
              const nextIndex = event.key === "ArrowRight"
                ? (currentIndex + 1) % STATUS_TABS.length
                : event.key === "ArrowLeft"
                  ? (currentIndex - 1 + STATUS_TABS.length) % STATUS_TABS.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? STATUS_TABS.length - 1
                      : -1;
              if (nextIndex < 0) return;
              event.preventDefault();
              const next = STATUS_TABS[nextIndex];
              if (!next) return;
              setTab(next.value);
              document.getElementById(`support-tab-${next.value}`)?.focus();
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === status.value
                ? "border-primary/50 bg-primary/10 font-medium text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {status.label}
          </button>
        ))}
      </div>

      <div id="support-ticket-panel" role="tabpanel" aria-labelledby={`support-tab-${tab}`} tabIndex={0} className="mt-5 outline-none">
        {ticketsQuery.isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} className="h-24" />
            ))}
          </div>
        ) : ticketsQuery.isError ? (
          <ErrorState
            title="Couldn't load your tickets"
            message={
              ticketsQuery.error instanceof Error
                ? ticketsQuery.error.message
                : "The support backend is not responding."
            }
            code="SUPPORT_ERR"
            onRetry={() => ticketsQuery.refetch()}
          />
        ) : visible && visible.length > 0 ? (
          <div className="flex flex-col gap-3">
            {visible.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                 className="group block rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/5">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <MessageSquare className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {ticket.id}
                        </span>
                        <TicketStatusBadge status={ticket.status} />
                        <TicketPriorityBadge priority={ticket.priority} />
                        <TicketCategoryBadge category={ticket.category} />
                      </div>
                      <h3 className="mt-1 truncate font-medium text-foreground">
                        {ticket.subject}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {ticket.messages[ticket.messages.length - 1]?.body}
                      </p>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1 text-right sm:flex">
                      <span className="text-xs text-muted-foreground">
                        {ticket.messages.length} message
                        {ticket.messages.length === 1 ? "" : "s"}
                      </span>
                      {ticket.assignee_name ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UserRound className="size-3" />
                          {ticket.assignee_name}
                        </span>
                      ) : null}
                      <ArrowRight className="size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={LifeBuoy}
            title={
              tab === "all" ? "No tickets yet" : `No ${tab} tickets`
            }
            description={
              tab === "all"
                ? "If something breaks or billing looks off, open a ticket and our team will pick it up."
                : "Nothing matches this status right now."
            }
            action={
              tab === "all" ? (
                <Button variant="gradient" asChild>
                  <Link href="/support/new">Open a ticket</Link>
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </PageContainer>
  );
}
