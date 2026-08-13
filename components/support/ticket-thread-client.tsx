"use client";

import * as React from "react";
import { formatSupportDateTime, formatLongEnglishDate } from "@/lib/format";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LifeBuoy,
  LoaderCircle,
  Lock,
  Send,
  TriangleAlert,
} from "lucide-react";

import type { SupportTicket, TicketMessage } from "@/lib/contracts/support";
import { getTicket, replyToTicket } from "@/lib/data/demo/support";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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

const STATUS_HINTS: Record<SupportTicket["status"], string> = {
  open: "An agent hasn't replied yet — hang tight, the queue moves fast.",
  pending: "An agent replied. If you add anything else, the ticket reopens for them.",
  resolved: "This ticket is resolved. Replying reopens it for an agent.",
  closed: "This ticket is closed. It can't be reopened from here — open a new one if you need help.",
};

function MessageBubble({
  message,
  mine,
}: {
  message: TicketMessage;
  mine: boolean;
}) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 text-sm sm:max-w-[70%]",
          mine
            ? "border-primary/30 bg-primary/10 text-foreground"
            : "border-border bg-card text-foreground",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-baseline gap-2",
            mine ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="text-xs font-semibold">{message.author_name}</span>
          <span className="text-caption uppercase tracking-wide text-muted-foreground">
            {message.author_role === "agent" ? "Support" : "You"}
          </span>
          <span className="text-caption text-muted-foreground/70">
            {formatSupportDateTime(message.created_at)}
          </span>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">
          {message.body}
        </p>
      </div>
    </div>
  );
}

export function TicketThreadClient({ ticketId }: { ticketId: string }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [body, setBody] = React.useState("");
  const [replyError, setReplyError] = React.useState<string | null>(null);

  const ticketQuery = useQuery({
    queryKey: ["ticket", ticketId, user?.id],
    queryFn: () => getTicket(ticketId, user!),
    enabled: Boolean(user),
  });

  const [submitting, setSubmitting] = React.useState(false);

  const submitReply = async () => {
    if (!user || !ticketQuery.data || submitting) return;
    const text = body.trim();
    if (!text) return;
    setSubmitting(true);
    setReplyError(null);
    try {
      await replyToTicket(ticketId, { body: text }, user);
      setBody("");
      await queryClient.invalidateQueries({
        queryKey: ["ticket", ticketId],
      });
      await queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Reply failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (ticketQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonCard className="h-10 w-40" />
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (ticketQuery.isError) {
    const err = ticketQuery.error;
    const notFound = err instanceof Error && /not found/i.test(err.message);
    return (
      <PageContainer>
        {notFound ? (
          <EmptyState
            icon={LifeBuoy}
            title="Ticket not found"
            description="This ticket doesn't exist or belongs to another account — tickets are private to their owner."
            action={
              <Button variant="gradient" asChild>
                <Link href="/support">Back to my tickets</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="Couldn't load this ticket"
            message={err instanceof Error ? err.message : "The support demo data is unavailable."}
            code="SUPPORT_ERR"
            onRetry={() => ticketQuery.refetch()}
          />
        )}
      </PageContainer>
    );
  }

  const ticket = ticketQuery.data;
  if (!ticket) return null;

  const closed = ticket.status === "closed";
  const mine = (message: TicketMessage) => message.author_id === user?.id;

  return (
    <PageContainer>
      <Link
        href="/support"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        My tickets
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {ticket.id}
            </span>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
            <TicketCategoryBadge category={ticket.category} />
          </div>
          <h1 className="mt-2 font-display text-h1">
            {ticket.subject}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Opened {formatLongEnglishDate(ticket.created_at)}
            {ticket.assignee_name ? ` · Assigned to ${ticket.assignee_name}` : ""}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Lock className="size-3" />
            Private to you &amp; support agents
          </p>
        </div>
      </div>

      {/* Thread */}
      <div className="mt-5 flex flex-col gap-3">
        {ticket.messages.map((message) => (
          <MessageBubble key={message.id} message={message} mine={mine(message)} />
        ))}
      </div>

      {/* Reply */}
      <Card className="mt-6">
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Send className="size-4 text-muted-foreground" />
            Add a reply
            <span className="text-xs font-normal text-muted-foreground">
              ({STATUS_HINTS[ticket.status]})
            </span>
          </p>

          {replyError ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {replyError}
            </p>
          ) : null}

          <Textarea
            aria-label="Reply to this ticket"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              closed
                ? "This ticket is closed — open a new ticket for anything else."
                : "Anything else we should know? Agent replies go straight to this thread."
            }
            disabled={closed}
          />

          <div className="flex justify-end">
            <Button
              onClick={submitReply}
              variant="gradient"
              disabled={closed || submitting || body.trim().length === 0}
            >
              {submitting && <LoaderCircle className="animate-spin" />}
              {submitting ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
