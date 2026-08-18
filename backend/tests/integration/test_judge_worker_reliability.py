import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from gamification.services.event_processor import GamificationEventProcessor
from judge.models import Problem, Submission, TestCase
from judge.worker.executor import grade_submission
from platform_core.events.schema import JudgeSubmissionGradedEvent

pytestmark = pytest.mark.asyncio

async def test_worker_reliability_idempotent_processing(db_session: AsyncSession):
    # Setup test data
    user_id = uuid.uuid4()
    problem_id = uuid.uuid4()
    submission_id = uuid.uuid4()
    
    problem = Problem(id=problem_id, title="Test", time_limit_ms=1000, memory_limit_kb=128000)
    db_session.add(problem)
    
    test_case = TestCase(id=uuid.uuid4(), problem_id=problem_id, position=0, input="in", expected_output="out")
    db_session.add(test_case)
    
    submission = Submission(
        id=submission_id,
        user_id=user_id,
        problem_id=problem_id,
        language="python",
        source_code="print('out')",
        status="queued"
    )
    db_session.add(submission)
    await db_session.commit()
    
    # Mock publish to intercept event
    published_events = []
    async def mock_publish(event, redis):
        published_events.append(event)
        
    with patch("judge.worker.executor.publish", side_effect=mock_publish), \
         patch("judge.worker.executor.get_redis_client", return_value=MagicMock()), \
         patch("judge.worker.executor.publish_judge_result", new_callable=MagicMock) as mock_sse:
             
        # Mock get_sandbox to return a dummy
        class DummySandbox:
            async def run(self, *args, **kwargs):
                return {"stdout": "out", "stderr": "", "exit_code": 0, "runtime_ms": 10, "memory_kb": 1024}
                
        with patch("judge.worker.executor.get_sandbox", return_value=DummySandbox()):
            await grade_submission(db_session, str(submission_id))
            
            # Wait, verify processing
            await db_session.refresh(submission)
            assert submission.status == "graded"
            assert submission.verdict == "accepted"
            assert len(published_events) == 1
            event = published_events[0]
            assert isinstance(event, JudgeSubmissionGradedEvent)
            
            # Simulate worker redelivery (duplicate event/retry)
            await grade_submission(db_session, str(submission_id))
            assert submission.status == "graded" # Status doesn't change
            assert len(published_events) == 1 # Event is NOT republished
            
            # Now test Gamification Event Processor idempotency
            processor = GamificationEventProcessor(db_session)
            res1 = await processor.process(event)
            assert res1.xp_delta == 250 # 250 XP for accepted judge problem
            
            # Deliver again
            res2 = await processor.process(event)
            assert res2.context is None # Idempotency blocked it
            
            # Create a second submission for the same problem, should yield 0 XP (completion cap)
            event2 = JudgeSubmissionGradedEvent(
                user_id=event.user_id,
                idempotency_key=f"judge:{uuid.uuid4()}",
                session_fingerprint="system",
                submission_id=uuid.uuid4(),
                problem_id=event.problem_id,
                verdict="accepted",
                runtime_ms=10,
                memory_kb=1024,
                test_cases_passed=1,
                test_cases_total=1,
            )
            res3 = await processor.process(event2)
            assert res3.xp_delta == 0
