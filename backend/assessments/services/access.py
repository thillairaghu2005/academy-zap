"""Assessment access gate (slice 03 §2) — shared by catalog/detail and attempt entry.

A user may read an assessment (and start an attempt) only when every check passes:
  - the assessment exists and is `published`;
  - it is visible within the caller's tenant (platform-scoped rows are visible to all);
  - it belongs to a course, that course is published and tenant-visible; and
  - the user is enrolled in that course.

Existence of a foreign/unpublished assessment is never disclosed — those fail with the same
404 shape as a missing id (mirrors the content catalog's posture). All identity comes from the
authenticated request; `user_id`/`org_id`/`enrollment_id` are never accepted from the client.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from assessments.models import Assessment
from assessments.repositories.assessment import AssessmentRepository
from content.read_api import get_published_course, is_enrolled
from platform_core.core.exceptions import PermissionDenied, ResourceNotFound


async def get_accessible_assessment(
    session: AsyncSession,
    assessment_id: uuid.UUID,
    user_id: uuid.UUID,
    org_id: uuid.UUID | None,
) -> Assessment:
    row = await AssessmentRepository(session).get_by_id(assessment_id)
    if row is None or row.status != "published":
        raise ResourceNotFound("Assessment not found.")
    if row.org_id is not None and row.org_id != org_id:
        raise ResourceNotFound("Assessment not found.")
    if row.course_id is None:
        # The access model is course-anchored (slice 03 §2): an assessment with no course
        # linkage is never accessible, even by id.
        raise ResourceNotFound("Assessment not found.")
    course = await get_published_course(session, row.course_id, org_id)
    if course is None:
        raise ResourceNotFound("Assessment not found.")
    if not await is_enrolled(session, row.course_id, user_id):
        raise PermissionDenied("Enroll in this assessment's course to access it.")
    return row
