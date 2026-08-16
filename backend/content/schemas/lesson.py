"""Lesson access schema (vertical slice 02) — enrollment-gated lesson content.

The public course detail intentionally carries only syllabus metadata (bodies are stripped
unless a lesson is a free preview). A learner reads full lesson content through
`GET /lessons/{lesson_id}`, which requires a valid enrollment for the lesson's course.
"""

from uuid import UUID

from pydantic import BaseModel


class LessonContent(BaseModel):
    id: UUID
    title: str
    kind: str
    duration_seconds: int
    position: int
    is_preview: bool
    # Article body. `None` for video lessons — playback moves through the signed-manifest
    # endpoint (deferred beyond this slice).
    body: str | None
