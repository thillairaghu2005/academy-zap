"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ChevronRight, LoaderCircle, ShieldAlert, Sparkles, Trophy } from "lucide-react";

import type { NotificationEvent, NotificationType } from "@/lib/contracts/notification";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

const NOTIFICATION_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  rank_up: Trophy,
  streak_at_risk: ShieldAlert,
  league_change: Sparkles,
};

function formatNotificationTime(createdAt: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function NotificationRow({
  notification,
  onRead,
  onClose,
}: {
  notification: NotificationEvent;
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const Icon = NOTIFICATION_ICON[notification.type];
  const content = (
    <span className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
          notification.read
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn("text-sm", !notification.read && "font-semibold")}>
            {notification.title}
          </span>
          {!notification.read ? (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {notification.body}
        </span>
        <span className="mt-2 block text-[11px] text-muted-foreground/70">
          {formatNotificationTime(notification.created_at)}
        </span>
      </span>
      {notification.href ? (
        <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </span>
  );

  if (!notification.href) {
    return <div className="rounded-lg px-3 py-3">{content}</div>;
  }

  return (
    <Link
      href={notification.href}
      onClick={() => {
        onRead(notification.id);
        onClose();
      }}
      className="block rounded-lg px-3 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
    >
      {content}
    </Link>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: open,
    retry: false,
  });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.data?.filter((notification) => !notification.read).length ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell />
          {unreadCount ? (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 pb-4 pt-6">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <Check />
                Mark all read
              </Button>
            ) : null}
          </div>
          <SheetDescription>Updates from your learning journey.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {notifications.isLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-12 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading notifications...
            </div>
          ) : notifications.isError ? (
            <EmptyState
              icon={Bell}
              title="Notifications unavailable"
              description="We could not load your notification feed."
              action={
                <Button variant="outline" size="sm" onClick={() => notifications.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : notifications.data?.length ? (
            <div className="space-y-1">
              {notifications.data.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={(id) => markRead.mutate(id)}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="You are all caught up"
              description="New rank, streak, and league updates will appear here."
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
