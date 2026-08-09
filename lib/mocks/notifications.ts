import type { NotificationEvent } from "@/lib/contracts/notification";
import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  writeDemoStorage,
} from "@/lib/demo/storage";

export const MOCK_NOTIFICATIONS: NotificationEvent[] = [
  { id: "notification-course", type: "course_available", category: "learning", title: "New course in your path", body: "Cloud Security Essentials is ready when you are.", created_at: "2026-08-06T08:42:00Z", href: "/courses", read: false },
  { id: "notification-judge-accepted", type: "judge_accepted", category: "judge", title: "Judge submission accepted", body: "Your solution for Two Sum passed every test case.", created_at: "2026-08-06T07:48:00Z", href: "/judge/p-two-sum", read: false },
  { id: "notification-streak", type: "streak_maintained", category: "achievements", title: "Streak maintained", body: "You kept your 12-day learning streak alive.", created_at: "2026-08-06T06:15:00Z", href: "/rank", read: false },
  { id: "notification-xp", type: "xp_earned", category: "achievements", title: "+420 Mastery XP", body: "Your latest side assessment strengthened your mastery track.", created_at: "2026-08-05T18:20:00Z", href: "/rank", read: true },
  { id: "notification-level", type: "level_up", category: "achievements", title: "Level up: Spartan", body: "You crossed the next server-resolved rank threshold.", created_at: "2026-08-05T14:10:00Z", href: "/rank", read: true },
  { id: "notification-badge", type: "badge_unlocked", category: "achievements", title: "Badge unlocked", body: "Your first verified lab credential is now available.", created_at: "2026-08-04T12:10:00Z", href: "/rank/badges", read: true },
  { id: "notification-rank", type: "rank_improved", category: "achievements", title: "Rank improved", body: "Your public rank projection moved up this week.", created_at: "2026-08-03T17:20:00Z", href: "/leaderboards", read: true },
  { id: "notification-friend", type: "friend_joined", category: "system", title: "Maya joined Zapsters", body: "A teammate from your network started climbing.", created_at: "2026-08-03T09:30:00Z", href: "/leaderboards", read: true },
  { id: "notification-guild", type: "guild_invitation", category: "labs", title: "Guild invitation", body: "Blue Lanterns invited you to join their practice group.", created_at: "2026-08-02T15:40:00Z", href: "/guilds", read: true },
  { id: "notification-mentor", type: "mentor_announcement", category: "learning", title: "Mentor office hours posted", body: "Priya added a new detection engineering office hour.", created_at: "2026-08-01T11:00:00Z", href: "/courses", read: true },
  { id: "notification-failed", type: "judge_failed", category: "judge", title: "Submission needs another pass", body: "Your Maximum Subarray solution missed 3 hidden cases.", created_at: "2026-07-31T10:05:00Z", href: "/judge/p-max-subarray", read: true },
  { id: "notification-system", type: "system_update", category: "system", title: "Platform update", body: "The new guest try-it mode is now available for Judge and Labs.", created_at: "2026-07-30T08:00:00Z", href: "/", read: true },
];

const readNotificationIds = new Set(
  MOCK_NOTIFICATIONS.filter((notification) => notification.read).map((notification) => notification.id),
);

/** Persist the read set so the badge stays accurate across page loads. */
function persistReadIds(): void {
  writeDemoStorage(DEMO_STORAGE_KEYS.notificationReads, [...readNotificationIds]);
}

/** Hydrate the read set from the browser (the demo's notifications table). */
function hydrateReadIds(): void {
  const persisted = readDemoStorage<string[]>(DEMO_STORAGE_KEYS.notificationReads, []);
  if (!Array.isArray(persisted)) return;
  for (const id of persisted) readNotificationIds.add(id);
}

hydrateReadIds();

export function isNotificationRead(id: string): boolean {
  return readNotificationIds.has(id);
}

export function markNotificationReadInMock(id: string): void {
  readNotificationIds.add(id);
  persistReadIds();
}

export function markAllNotificationsReadInMock(): void {
  MOCK_NOTIFICATIONS.forEach((notification) => readNotificationIds.add(notification.id));
  persistReadIds();
}
