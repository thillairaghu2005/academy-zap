from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from platform_core.contracts.content import CourseSummary, Enrollment


class LessonProgressInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    position_seconds: int = Field(ge=0, le=86_400)


class CourseProgress(BaseModel):
    enrollment: Enrollment | None
    completed_lesson_ids: list[UUID]


class MyLearningItem(BaseModel):
    enrollment: Enrollment
    course: CourseSummary
