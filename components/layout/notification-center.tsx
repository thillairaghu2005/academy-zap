"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { m as motion } from "framer-motion";
import {
  Award,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  FlaskConical,
  Gauge,
  GraduationCap,
  LoaderCircle,
  Medal,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  Trophy,
  UserPlus,
} from "lucide-react";

import type { NotificationCategory, NotificationEvent, NotificationType } from "@/lib/contracts/notification";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/data/demo/notifications";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { formatNotificationTime } from "@/lib/format";
import { useGestureSheet } from "@/components/motion/use-gesture-sheet";

const NOTIFICATION_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  course_available: BookOpen,
  judge_accepted: CircleCheck,
  judge_failed: ShieldAlert,
  streak_maintained: Sparkles,
  xp_earned: Gauge,
  level_up: Trophy,
  badge_unlocked: Award,
  rank_improved: Medal,
  friend_joined: UserPlus,
  guild_invitation: FlaskConical,
  mentor_announcement: GraduationCap,
  system_update: MessageCircle,
};

const CATEGORY_LABELS: Record<"all" | NotificationCategory, string> = {
  all: "All",
  learning: "Learning",
  judge: "Judge",
  labs: "Labs",
  achievements: "Achievements",
  system: "System",
};

const CATEGORY_VALUES: Array<"all" | NotificationCategory> = [
  "all",
  "learning",
  "judge",
  "labs",
  "achievements",
  "system",
];

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
    <span className="flex min-w-0 gap-3">
      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", notification.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn("text-sm", !notification.read && "font-semibold")}>{notification.title}</span>
          {!notification.read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{notification.body}</span>
        <span className="mt-2 block text-caption text-muted-foreground/70">{formatNotificationTime(notification.created_at)}</span>
      </span>
      {notification.href ? <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" /> : null}
    </span>
  );

  return (
    <li className="group list-none flex items-start gap-1 rounded-lg px-1 transition-colors hover:bg-accent">
      {notification.href ? (
        <Link href={notification.href} onClick={() => { onRead(notification.id); onClose(); }} className="min-h-11 min-w-0 flex-1 rounded-lg px-2 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {content}
        </Link>
      ) : <div className="min-w-0 flex-1 px-2 py-3">{content}</div>}
      {!notification.read ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="mt-3 mr-1 shrink-0"
          aria-label={`Mark ${notification.title} as read`}
          onClick={() => onRead(notification.id)}
        >
          <Check />
        </Button>
      ) : null}
    </li>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = React.useState(false);
  const centerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [category, setCategory] = React.useState<"all" | NotificationCategory>("all");
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const categoryRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const queryClient = useQueryClient();
  const sheet = useGestureSheet({ open, onDismiss: () => setOpen(false) });
  const notifications = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.offset + lastPage.notifications.length : undefined,
    retry: false,
  });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const markAllRead = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });

  const allNotifications = notifications.data?.pages.flatMap((page) => page.notifications) ?? [];
  const visibleNotifications = category === "all" ? allNotifications : allNotifications.filter((notification) => notification.category === category);
  const unreadCount = notifications.data?.pages[0]?.unread_count ?? 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = notifications;

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!centerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const moveCategory = (index: number, direction: "next" | "previous" | "first" | "last") => {
    const nextIndex = direction === "next"
      ? (index + 1) % CATEGORY_VALUES.length
      : direction === "previous"
        ? (index - 1 + CATEGORY_VALUES.length) % CATEGORY_VALUES.length
        : direction === "first"
          ? 0
          : CATEGORY_VALUES.length - 1;
    const next = CATEGORY_VALUES[nextIndex];
    if (!next) return;
    setCategory(next);
    categoryRefs.current[nextIndex]?.focus();
  };

  React.useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void fetchNextPage();
    }, { rootMargin: "160px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div ref={centerRef} className="relative shrink-0">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className={cn(
          "relative h-9 w-9 rounded-xl border border-border bg-white text-muted-foreground shadow-none hover:border-primary/25 hover:bg-primary-muted hover:text-primary active:bg-primary-light",
          open && "border-primary/30 bg-primary-light text-primary",
        )}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-haspopup="dialog"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="size-4" />
        {unreadCount ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground ring-2 ring-background">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </Button>

      {open ? (
        <motion.div
          // eslint-disable-next-line react-hooks/refs
          ref={sheet.ref}
          // eslint-disable-next-line react-hooks/refs
          style={{ y: sheet.y }}
          className="absolute right-0 top-[calc(100%+0.75rem)] z-50"
        >
          <div
            id="notification-panel"
            aria-labelledby="notification-panel-title"
            role="dialog"
            aria-modal="true"
            className="frosted-heavy flex max-h-[min(640px,calc(100dvh-5rem))] w-[min(360px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-border/70 text-foreground shadow-[0_14px_36px_rgb(23_23_23_/_11%)]"
          >
            <div
              // eslint-disable-next-line react-hooks/refs
              ref={sheet.handleRef}
              // eslint-disable-next-line react-hooks/refs
              {...sheet.handleProps}
              className="shrink-0 touch-none"
            >
              <span
                aria-hidden="true"
                className="mx-auto mt-2 block h-1.5 w-9 rounded-full bg-foreground/15"
              />
              <div className="border-b border-border px-4 pb-3 pt-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 id="notification-panel-title" className="font-display text-base font-semibold">Notifications</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Updates from your learning journey.</p>
                  </div>
                  {unreadCount ? <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}><Check /> Mark all as read</Button> : null}
                </div>
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2" role="tablist" aria-label="Notification categories" aria-orientation="horizontal">
                {CATEGORY_VALUES.map((value, index) => (
                  <button
                    key={value}
                    ref={(element) => { categoryRefs.current[index] = element; }}
                    type="button"
                    id={`notification-tab-${value}`}
                    role="tab"
                    aria-selected={category === value}
                    aria-controls="notification-panel-list"
                    tabIndex={category === value ? 0 : -1}
                    onClick={() => setCategory(value)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowRight") {
                        event.preventDefault();
                        moveCategory(index, "next");
                      } else if (event.key === "ArrowLeft") {
                        event.preventDefault();
                        moveCategory(index, "previous");
                      } else if (event.key === "Home") {
                        event.preventDefault();
                        moveCategory(index, "first");
                      } else if (event.key === "End") {
                        event.preventDefault();
                        moveCategory(index, "last");
                      }
                    }}
                    className={cn("min-h-9 shrink-0 rounded-md px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", category === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                  >
                    {CATEGORY_LABELS[value]}
                  </button>
                ))}
              </div>

            <section id="notification-panel-list" aria-labelledby={`notification-tab-${category}`} tabIndex={0} className="min-h-0 flex-1 overflow-y-auto p-2 outline-none">
              {notifications.isLoading ? (
                <div role="status" className="flex items-center justify-center gap-2 px-3 py-12 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading notifications...</div>
              ) : notifications.isError ? (
                <EmptyState icon={Bell} title="Notifications unavailable" description="We could not load your notification feed." primaryAction={<Button variant="outline" size="sm" onClick={() => void notifications.refetch()}>Try again</Button>} />
              ) : visibleNotifications.length ? (
                <ul className="m-0 space-y-1 p-0" aria-label={`${CATEGORY_LABELS[category]} notifications`}>
                  {visibleNotifications.map((notification) => <NotificationRow key={notification.id} notification={notification} onRead={(id) => markRead.mutate(id)} onClose={() => setOpen(false)} />)}
                  <div ref={loadMoreRef} className="flex min-h-8 items-center justify-center text-xs text-muted-foreground" aria-live="polite">
                    {notifications.isFetchingNextPage ? <><LoaderCircle className="mr-2 size-3.5 animate-spin" /> Loading more</> : notifications.hasNextPage ? "" : "All caught up"}
                  </div>
                </ul>
              ) : (
                <EmptyState icon={Bell} title="No notifications" description="You are all caught up. New learning and achievement updates will appear here." primaryAction={<Button variant="outline" size="sm" asChild><Link href="/dashboard" onClick={() => setOpen(false)}>Go to dashboard</Link></Button>} />
              )}
            </section>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
