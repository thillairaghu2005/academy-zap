"""Mirrors `lib/contracts/notification.ts` — the in-app notification-center read model."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

NotificationType = Literal[
    "course_available",
    "judge_accepted",
    "judge_failed",
    "streak_maintained",
    "xp_earned",
    "level_up",
    "badge_unlocked",
    "rank_improved",
    "friend_joined",
    "guild_invitation",
    "mentor_announcement",
    "system_update",
]
NotificationCategory = Literal["learning", "judge", "labs", "achievements", "system"]


class NotificationEvent(BaseModel):
    id: UUID
    type: NotificationType
    category: NotificationCategory
    title: str
    body: str
    created_at: datetime
    href: str | None
    read: bool


class NotificationPage(BaseModel):
    notifications: list[NotificationEvent]
    offset: int
    total: int
    unread_count: int
    has_more: bool
