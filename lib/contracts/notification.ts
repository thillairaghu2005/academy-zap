/** Notification read model consumed by the global tray. */
export type NotificationType =
  | "rank_up"
  | "streak_at_risk"
  | "league_change";

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  created_at: string;
  href: string | null;
  read: boolean;
}
