"""Content Engine published read-API (platform §4.2, §8.1).

Cross-subsystem data needs go through the event bus or a published read-API, never a join
across schema boundaries. The Assessment Engine gates assessment access on course
publication, tenant scope, and enrollment — all Content-owned state. This module is the
sanctioned read surface it calls instead of querying Content tables directly.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from content.models import Course
from content.repositories.course import CourseRepository
from content.repositories.enrollment import EnrollmentRepository


async def get_published_course(
    session: AsyncSession, course_id: uuid.UUID, org_id: uuid.UUID | None
) -> Course | None:
    """The published course visible within `org_id`, or None (hidden/foreign/draft)."""
    return await CourseRepository(session).get_published_by_id(course_id, org_id=org_id)


async def is_enrolled(
    session: AsyncSession, course_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """True when the user holds an enrollment row for the course."""
    return (
        await EnrollmentRepository(session).get(course_id, user_id)
    ) is not None
