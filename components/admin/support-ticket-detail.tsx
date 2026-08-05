"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LoaderCircle,
  Lock,
  Send,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import type { TicketMessage, TicketStatus } from "@/lib/contracts/support";
import { TICKET_TRANSITIONS } from "@/lib/contracts/support";
import {
  assignTicket,
  getTicket,
  listSupportAgents,
  replyToTicket,
  updateTicketStatus,
} from "@/lib/api/support";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCard } from "@/components/shared/skeletons";
import {
  TicketCategoryBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/components/support/support-badges";
import { cn } from "@/lib/utils";

const ALL_STATUSES: TicketStatus[] = ["open", "pending", "resolved", "closed"];

function InternalNote({ message }: { message: TicketMessage }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm sm:max-w-[70%]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-caption font-bold uppercase tracking-wide text-amber-700">
            <Lock className="size-3" />
            Internal note
          </span>
          <span className="text-xs font-semibold">{message.author_name}</span>
          <span className="text-caption text-muted-foreground/70">
            {new Date(message.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">
          {message.body}
        </p>
      </div>
    </div>
  );
}

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
            {message.author_role === "agent" ? "You" : "Learner"}
          </span>
          <span className="text-caption text-muted-foreground/70">
            {new Date(message.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">
          {message.body}
        </p>
      </div>
    </div>
  );
}

export function AdminSupportTicketDetail({ ticketId }: { ticketId: string }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [body, setBody] = React.useState("");
  const [internalNote, setInternalNote] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const ticketQuery = useQuery({
    queryKey: ["ticket", ticketId, user?.id],
    queryFn: () => getTicket(ticketId, user!),
    enabled: Boolean(user),
  });

  const agentsQuery = useQuery({
    queryKey: ["admin-support-agents"],
    queryFn: () => listSupportAgents(user!),
    enabled: Boolean(user),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    await queryClient.invalidateQueries({ queryKey: ["admin-support-queue"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await fn();
      await invalidate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = (status: TicketStatus) =>
    runAction(() => updateTicketStatus(ticketId, status, user!));

  const changeAssignee = (agentId: string) =>
    runAction(() =>
      assignTicket(ticketId, agentId === "unassigned" ? null : agentId, user!),
    );

  const submitReply = () => {
    const text = body.trim();
    if (!text || submitting) return;
    runAction(async () => {
      await replyToTicket(ticketId, { body: text, internal_note: internalNote }, user!);
      setBody("");
      setInternalNote(false);
    });
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
    return (
      <PageContainer>
        <ErrorState
          title="Couldn't load this ticket"
          message={
            ticketQuery.error instanceof Error
              ? ticketQuery.error.message
              : "The support backend is not responding."
          }
          code="SUPPORT_ERR"
          onRetry={() => ticketQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const ticket = ticketQuery.data;
  if (!ticket) return null;

  const closed = ticket.status === "closed";
  const allowedTransitions = TICKET_TRANSITIONS[ticket.status];
  const mine = (message: TicketMessage) => message.author_id === user?.id;

  return (
    <PageContainer>
      <Link
        href="/admin/support"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        Support queue
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
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
            Opened by <span className="font-medium text-foreground">{ticket.created_by_name}</span> on{" "}
            {new Date(ticket.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Assignee */}
        <div className="w-full shrink-0 lg:w-56">
          <label
            htmlFor="support-assignee"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <UserRound className="size-3.5" />
            Assigned agent
          </label>
          <Select
            value={ticket.assignee_id ?? "unassigned"}
            onValueChange={changeAssignee}
            disabled={submitting}
          >
            <SelectTrigger id="support-assignee" className="h-9 w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {(agentsQuery.data ?? []).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status workflow */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Status workflow — only allowed transitions are enabled (server
          enforces the same table with 409s).
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Change ticket status">
          {ALL_STATUSES.map((status) => {
            const current = status === ticket.status;
            const allowed = allowedTransitions.includes(status);
            return (
              <button
                key={status}
                onClick={() => changeStatus(status)}
                disabled={current || !allowed || submitting}
                title={
                  current
                    ? "Current status"
                    : allowed
                      ? `Move to ${status}`
                      : `Not allowed from ${ticket.status}`
                }
                aria-pressed={current}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  current
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : allowed
                      ? "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      : "cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground/40",
                )}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {actionError}
        </p>
      ) : null}

      {/* Thread — internal notes visible to agents only */}
      <div className="mt-5 flex flex-col gap-3">
        {ticket.messages.map((message) =>
          message.internal_note ? (
            <InternalNote key={message.id} message={message} />
          ) : (
            <MessageBubble key={message.id} message={message} mine={mine(message)} />
          ),
        )}
      </div>

      {/* Reply */}
      <Card className="mt-6">
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Send className="size-4 text-muted-foreground" />
              Reply as {user?.display_name.split(" ")[0]}
            </p>
            <button
              onClick={() => setInternalNote((v) => !v)}
              aria-pressed={internalNote}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                internalNote
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-700"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Lock className="size-3.5" />
              {internalNote ? "Posting as internal note" : "Public reply"}
            </button>
          </div>

          <Textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              internalNote
                ? "Visible only to agents — learners never see this. No status change happens when you post one."
                : closed
                  ? "This ticket is closed — reopen it before replying publicly."
                  : "Public reply — the learner sees this. Posting one moves the ticket to pending."
            }
            disabled={closed && !internalNote}
          />

          <div className="flex justify-end">
            <Button
              onClick={submitReply}
              variant="gradient"
              disabled={
                submitting ||
                body.trim().length === 0 ||
                (closed && !internalNote)
              }
            >
              {submitting && <LoaderCircle className="animate-spin" />}
              {internalNote ? "Post internal note" : "Send reply"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
