"""Submit/poll — 501 stubs. The real orchestrator (gVisor pod lifecycle, cgroups, grader) is
build.md B5; a synchronous 501 here is honest, whereas silently inserting a "queued" row that
never grades would look like it works and then hang forever from the frontend's point of view.
"""

import uuid

from fastapi import APIRouter, Depends

from platform_core.contracts.judge import CodeSubmission, JudgeResult, SubmissionAccepted
from platform_core.core.deps import CurrentUser
from platform_core.core.exceptions import NotImplementedFoundationError
from platform_core.core.rate_limiting import CompatibleRateLimiter
from platform_core.core.rate_limits import JUDGE_SUBMIT_RATE_LIMIT

router = APIRouter(prefix="/judge", tags=["judge"])
_judge_submit_rate_limit = CompatibleRateLimiter(
    times=JUDGE_SUBMIT_RATE_LIMIT.times,
    seconds=JUDGE_SUBMIT_RATE_LIMIT.seconds,
)


@router.post(
    "/submit",
    response_model=SubmissionAccepted,
    status_code=202,
    dependencies=[Depends(_judge_submit_rate_limit)],
)
async def submit(submission: CodeSubmission, _current_user: CurrentUser) -> SubmissionAccepted:
    raise NotImplementedFoundationError("judge", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §5")


@router.get("/submissions/{submission_id}", response_model=JudgeResult)
async def get_result(submission_id: uuid.UUID, _current_user: CurrentUser) -> JudgeResult:
    raise NotImplementedFoundationError("judge", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §5")
