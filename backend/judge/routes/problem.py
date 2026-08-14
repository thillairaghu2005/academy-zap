import uuid

from fastapi import APIRouter, Query

from judge.services.problem import ProblemService
from platform_core.contracts.judge import Problem
from platform_core.core.deps import DbSession

router = APIRouter(prefix="/problems", tags=["judge"])


@router.get("", response_model=list[Problem])
async def list_problems(
    session: DbSession, limit: int = Query(50, le=100), offset: int = Query(0, ge=0)
) -> list[Problem]:
    return await ProblemService(session).list_problems(limit=limit, offset=offset)


@router.get("/{problem_id}", response_model=Problem)
async def get_problem(problem_id: uuid.UUID, session: DbSession) -> Problem:
    return await ProblemService(session).get_problem(problem_id)
