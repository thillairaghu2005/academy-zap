import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from judge.grader import Grader
from judge.orchestrator.sandbox import SandboxOrchestrator, get_sandbox
from judge.repositories.problem import ProblemRepository
from judge.repositories.submission import SubmissionRepository
from platform_core.bus.producer import publish
from platform_core.core.redis import get_redis_client
from platform_core.events.schema import JudgeSubmissionGradedEvent

logger = structlog.get_logger(__name__)

async def grade_submission(session: AsyncSession, submission_id_str: str) -> None:
    submission_id = uuid.UUID(submission_id_str)
    sub_repo = SubmissionRepository(session)
    prob_repo = ProblemRepository(session)
    
    submission = await sub_repo.get_by_id(submission_id)
    if not submission:
        logger.error("Submission not found", submission_id=submission_id_str)
        return
        
    if submission.status != "queued":
        logger.info("Submission already graded or processing", submission_id=submission_id_str, status=submission.status)
        return
        
    # Mark as processing
    submission.status = "processing"
    await session.commit()
    
    problem = await prob_repo.get_by_id(submission.problem_id)
    if not problem:
        logger.error("Problem not found", problem_id=str(submission.problem_id))
        submission.status = "error"
        await session.commit()
        return

    test_cases = await sub_repo.get_test_cases(problem.id)
    
    sandbox: SandboxOrchestrator = get_sandbox()
    
    grader = Grader(sandbox, problem, test_cases)
    result = await grader.grade(submission.source_code, submission.language)
    
    submission.status = "graded"
    submission.verdict = result["verdict"]
    submission.runtime_ms = result["runtime_ms"]
    submission.memory_kb = result["memory_kb"]
    submission.test_cases_passed = result["test_cases_passed"]
    submission.test_cases_total = result["test_cases_total"]
    submission.stdout = result["stdout"]
    submission.stderr = result["stderr"]
    submission.compile_output = result["compile_output"]
    submission.cases = result["cases"]
    submission.graded_at = datetime.now(UTC)
    
    await session.commit()
    
    # Emit event
    event = JudgeSubmissionGradedEvent(
        user_id=submission.user_id,
        idempotency_key=f"judge:{submission.id}",
        session_fingerprint="system",
        submission_id=submission.id,
        problem_id=submission.problem_id,
        verdict=submission.verdict,
        runtime_ms=submission.runtime_ms,
        memory_kb=submission.memory_kb,
        test_cases_passed=submission.test_cases_passed,
        test_cases_total=submission.test_cases_total,
    )
    
    redis = get_redis_client()
    await publish(event, redis)
    
    from judge.routes.sse import publish_judge_result
    await publish_judge_result(submission.id)
    
    logger.info("Submission graded successfully", submission_id=submission_id_str, verdict=submission.verdict)
