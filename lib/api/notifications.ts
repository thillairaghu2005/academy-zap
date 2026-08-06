import type { NotificationPage } from "@/lib/contracts/notification";
import {
  isNotificationRead,
  markAllNotificationsReadInMock,
  markNotificationReadInMock,
  MOCK_NOTIFICATIONS,
} from "@/lib/mocks/notifications";
import { delay, jitter } from "@/lib/api/helpers";

export async function getNotifications(offset = 0, limit = 5): Promise<NotificationPage> {
  await delay(jitter(140));
  const notifications = MOCK_NOTIFICATIONS.map((notification) => ({
    ...notification,
    read: isNotificationRead(notification.id),
  }));
  const page = notifications.slice(offset, offset + limit);
  return {
    notifications: page,
    offset,
    total: notifications.length,
    unread_count: notifications.filter((notification) => !notification.read).length,
    has_more: offset + page.length < notifications.length,
  };
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await delay(jitter(100));
  markNotificationReadInMock(notificationId);
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay(jitter(120));
  markAllNotificationsReadInMock();
}
