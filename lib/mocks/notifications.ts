import type { NotificationEvent } from "@/lib/contracts/notification";

export const MOCK_NOTIFICATIONS: NotificationEvent[] = [
  {
    id: "notification-rank-up",
    type: "rank_up",
    title: "You reached Vanguard",
    body: "Your latest accepted solution moved you up the rank ladder.",
    created_at: "2026-08-05T08:42:00Z",
    href: "/rank",
    read: false,
  },
  {
    id: "notification-streak",
    type: "streak_at_risk",
    title: "Your streak is at risk",
    body: "Complete one activity before midnight to protect your 12-day streak.",
    created_at: "2026-08-05T06:15:00Z",
    href: "/dashboard",
    read: false,
  },
  {
    id: "notification-league",
    type: "league_change",
    title: "Promoted to Gold league",
    body: "You finished the week inside the promotion zone.",
    created_at: "2026-08-03T17:20:00Z",
    href: "/leaderboards",
    read: true,
  },
];

const readNotificationIds = new Set(
  MOCK_NOTIFICATIONS.filter((notification) => notification.read).map(
    (notification) => notification.id,
  ),
);

export function isNotificationRead(id: string): boolean {
  return readNotificationIds.has(id);
}

export function markNotificationReadInMock(id: string): void {
  readNotificationIds.add(id);
}

export function markAllNotificationsReadInMock(): void {
  MOCK_NOTIFICATIONS.forEach((notification) => readNotificationIds.add(notification.id));
}
