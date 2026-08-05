import type { NotificationEvent } from "@/lib/contracts/notification";
import {
  isNotificationRead,
  markAllNotificationsReadInMock,
  markNotificationReadInMock,
  MOCK_NOTIFICATIONS,
} from "@/lib/mocks/notifications";
import { delay, jitter } from "@/lib/api/helpers";

export async function getNotifications(): Promise<NotificationEvent[]> {
  await delay(jitter(140));
  return MOCK_NOTIFICATIONS.map((notification) => ({
    ...notification,
    read: isNotificationRead(notification.id),
  }));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await delay(jitter(100));
  markNotificationReadInMock(notificationId);
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay(jitter(120));
  markAllNotificationsReadInMock();
}
