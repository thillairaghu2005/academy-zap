/** Notification read model consumed by the global tray. */
export type NotificationType =
  | "course_available"
  | "judge_accepted"
  | "judge_failed"
  | "streak_maintained"
  | "xp_earned"
  | "level_up"
  | "badge_unlocked"
  | "rank_improved"
  | "friend_joined"
  | "guild_invitation"
  | "mentor_announcement"
  | "system_update";

export type NotificationCategory =
  | "learning"
  | "judge"
  | "labs"
  | "achievements"
  | "system";

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  created_at: string;
  href: string | null;
  read: boolean;
}

export interface NotificationPage {
  notifications: NotificationEvent[];
  offset: number;
  total: number;
  unread_count: number;
  has_more: boolean;
}
