"""Content Engine contracts (platform §4.1, §4.4) — Pydantic mirror of `lib/contracts/content.ts`,
field-for-field. The `ContentProvider` Protocol method shapes are locked by the doc; full
`Course`/`SignedManifest`/`Enrollment` field lists are the frontend's own logged, reasonable
decisions, reproduced here verbatim so backend and frontend never silently diverge.
"""

from datetime import datetime
from typing import Literal, Protocol
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

CourseLevel = Literal["beginner", "intermediate", "advanced"]
LessonKind = Literal["video", "article"]
CourseFormat = Literal["video", "interactive", "lab", "project", "judge"]
CareerTrack = Literal[
    "cyber_security",
    "web_development",
    "ai_ml",
    "cloud",
    "data_science",
    "game_dev",
    "interview_prep",
]
ContentStatus = Literal["draft", "in_review", "published"]
EnrollmentStatus = Literal["active", "completed"]


class CourseInstructor(BaseModel):
    id: UUID
    display_name: str
    title: str


class CourseLesson(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    title: str
    kind: LessonKind
    duration_seconds: int
    position: int
    # `lib/contracts/content.ts` spells this camelCase (the one exception to that file's
    # otherwise-uniform snake_case) — kept as an alias so wire compatibility with the frontend
    # doesn't require the whole codebase to violate PEP 8 naming.
    is_preview: bool = Field(alias="isPreview")
    preview_body: str | None = None


class CourseSection(BaseModel):
    id: UUID
    title: str
    position: int
    lessons: list[CourseLesson]


class Course(BaseModel):
    id: UUID
    title: str
    subtitle: str
    description: str
    category: str
    level: CourseLevel
    language: str
    status: ContentStatus
    submitted_by: UUID | None = None
    reviewed_by: UUID | None = None
    instructor: CourseInstructor
    rating: float
    review_count: int
    price_cents: int
    enrolled_count: int
    estimated_hours: float
    syllabus: list[CourseSection]
    created_at: datetime
    updated_at: datetime
    format: CourseFormat | None = None
    career_track: CareerTrack | None = None
    is_project_based: bool | None = None
    certificate_included: bool | None = None


class CourseSummary(BaseModel):
    """Lightweight card shape for catalog hits."""

    id: UUID
    title: str
    subtitle: str
    category: str
    level: CourseLevel
    rating: float
    review_count: int
    price_cents: int
    enrolled_count: int
    estimated_hours: float
    total_lessons: int
    instructor_name: str
    language: str
    format: CourseFormat
    career_track: CareerTrack
    is_project_based: bool
    certificate_included: bool


class SignedManifest(BaseModel):
    """Signed, short-TTL HLS URL (platform §2.3/§4.1). A fetch after `expires_at` must 403."""

    lesson_id: UUID
    user_id: UUID
    manifest_url: str
    expires_at: datetime
    signature: str
    captions_url: str | None


class Enrollment(BaseModel):
    course_id: UUID
    user_id: UUID
    status: EnrollmentStatus
    progress_pct: float
    last_lesson_id: UUID | None
    last_position_seconds: int
    enrolled_at: datetime
    updated_at: datetime


class MeilisearchCatalogResponse(BaseModel):
    """Mirrors the real Meilisearch JSON API field names verbatim."""

    hits: list[CourseSummary]
    query: str
    processingTimeMs: int  # noqa: N815 - verbatim Meilisearch field name
    limit: int
    offset: int
    estimatedTotalHits: int  # noqa: N815 - verbatim Meilisearch field name


class ContentProvider(Protocol):
    """Platform §4.1 — locked verbatim."""

    async def get_course(self, course_id: UUID) -> Course: ...

    async def get_playback_manifest(self, lesson_id: UUID, user_id: UUID) -> SignedManifest: ...
