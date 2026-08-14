"""Content Engine request/response schemas — reuses the canonical shapes in
`platform_core.contracts.content` rather than re-declaring them (SOP §1.2: one place per shape).
"""

from pydantic import BaseModel

from platform_core.contracts.content import Course, CourseSummary

__all__ = ["Course", "CourseSummary", "CourseListResponse"]


class CourseListResponse(BaseModel):
    items: list[CourseSummary]
    total: int
