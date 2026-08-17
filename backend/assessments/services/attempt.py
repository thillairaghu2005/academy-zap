import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from assessments.models import Assessment as AssessmentModel
from assessments.models import AssessmentSubmission
from assessments.repositories.assessment import AssessmentRepository
from assessments.repositories.attempt import AttemptRepository
from assessments.rules import QUESTION_POINTS
from assessments.schemas.attempt import (
    AssessmentResult,
    SubmitMcqAnswer,
    TelemetryInput,
)
from assessments.services.access import get_accessible_assessment
from platform_core.contracts.assessments import (
    AssessmentAttempt,
    AssessmentAttemptSummary,
    AttemptAnswer,
    ComboState,
    GradeResult,
)
from platform_core.core.exceptions import ConflictError, ResourceNotFound
from platform_core.core.redis import AsyncRedis
from platform_core.events.schema import AssessmentSubmittedEvent


def _points(difficulty: str) -> int:
    return QUESTION_POINTS.get(difficulty, 0)


def _answers(row: AssessmentSubmission) -> list[AttemptAnswer]:
    return [
        AttemptAnswer(
            question_id=uuid.UUID(str(answer["question_id"])),
            correct=bool(answer["correct"]),
            score=float(str(answer["score"])),
            submitted_at=datetime.fromisoformat(str(answer["submitted_at"])),
        )
        for answer in row.question_level_answers
    ]


def _attempt_contract(row: AssessmentSubmission, assessment: AssessmentModel) -> AssessmentAttempt:
    total_score = sum(_points(question.difficulty) for question in assessment.questions)
    return AssessmentAttempt(
        attempt_id=row.attempt_id,
        assessment_id=row.assessment_id,
        user_id=row.user_id,
        status=row.status,
        attempt_number=row.attempt_number,
        started_at=row.started_at,
        expires_at=row.expires_at,
        answers=_answers(row),
        score=float(row.score),
        integrity_flags=row.integrity_flags,
        submitted_at=row.submitted_at,
        total_score=total_score,
        passed=(
            row.status == "submitted"
            and total_score > 0
            and float(row.score) / total_score * 100 >= float(assessment.passing_percent)
        ),
    )


class AttemptService:
    def __init__(self, session: AsyncSession, redis: AsyncRedis | None = None) -> None:
        self._session = session
        self._redis = redis
        self._assessments = AssessmentRepository(session)
        self._attempts = AttemptRepository(session)

    async def start(
        self, assessment_id: uuid.UUID, user_id: uuid.UUID, org_id: uuid.UUID | None
    ) -> AssessmentAttempt:
        # Slice 03 §2/§4: attempt creation is gated on publication, tenant scope, course
        # publication, and enrollment — never reachable by guessing an id.
        assessment = await get_accessible_assessment(
            self._session, assessment_id, user_id, org_id
        )
        await self._session.execute(
            select(
                func.pg_advisory_xact_lock(
                    func.hashtextextended(f"attempt:{assessment_id}:{user_id}", 0)
                )
            )
        )
        count = await self._attempts.count_for_user(assessment_id, user_id)
        if count >= assessment.attempts_allowed:
            raise ConflictError("You have used all attempts for this assessment.")
        now = datetime.now(UTC)
        row = await self._attempts.create(
            AssessmentSubmission(
                assessment_id=assessment_id,
                user_id=user_id,
                attempt_number=count + 1,
                started_at=now,
                expires_at=now + timedelta(minutes=max(1, assessment.estimated_minutes)),
            )
        )
        await self._session.commit()
        return _attempt_contract(row, assessment)

    async def get(self, attempt_id: uuid.UUID, user_id: uuid.UUID) -> AssessmentAttempt:
        row = await self._attempts.get(attempt_id, for_update=True)
        if row is None or row.user_id != user_id:
            raise ResourceNotFound("Assessment attempt not found.")
        assessment = await self._assessments.get_by_id(row.assessment_id)
        if assessment is None:
            raise ResourceNotFound("Assessment not found.")
        if row.status == "in_progress" and datetime.now(UTC) >= row.expires_at:
            row.status = "expired"
            row.submitted_at = datetime.now(UTC)
            await self._session.commit()
        return _attempt_contract(row, assessment)

    async def list(
        self, assessment_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[AssessmentAttemptSummary]:
        assessment = await self._assessments.get_by_id(assessment_id)
        if assessment is None:
            raise ResourceNotFound("Assessment not found.")
        rows = await self._attempts.list_for_user(assessment_id, user_id)
        total_score = sum(_points(question.difficulty) for question in assessment.questions)
        return [
            AssessmentAttemptSummary(
                attempt_id=row.attempt_id,
                attempt_number=row.attempt_number,
                status=row.status,
                score=float(row.score),
                passed=(
                    row.status == "submitted"
                    and total_score > 0
                    and float(row.score) / total_score * 100 >= float(assessment.passing_percent)
                ),
                correct_count=sum(1 for answer in row.question_level_answers if answer["correct"]),
                question_count=len(assessment.questions),
                max_combo=self._best_combo(row),
                submitted_at=row.submitted_at,
            )
            for row in rows
        ]

    async def submit_answer(
        self, attempt_id: uuid.UUID, user_id: uuid.UUID, data: SubmitMcqAnswer
    ) -> GradeResult:
        row = await self._attempts.get(attempt_id, for_update=True)
        if row is None or row.user_id != user_id:
            raise ResourceNotFound("Assessment attempt not found.")
        await self._ensure_open(row)
        if any(
            answer["question_id"] == str(data.question_id) for answer in row.question_level_answers
        ):
            raise ConflictError("This question has already been answered.")
        assessment = await self._assessments.get_by_id(row.assessment_id)
        if assessment is None:
            raise ResourceNotFound("Assessment not found.")
        question = next((q for q in assessment.questions if q.id == data.question_id), None)
        if question is None or question.type != "mcq":
            raise ResourceNotFound("MCQ question not found.")
        if question.options is None or data.option_index >= len(question.options):
            raise ConflictError("The selected option is invalid.")
        correct = str(data.option_index) in (question.accepted_answers or [])
        score = _points(question.difficulty) if correct else 0
        now = datetime.now(UTC)
        time_spent_ms = data.time_spent_ms

        answer = {
            "question_id": str(question.id),
            "option_index": data.option_index,
            "time_spent_ms": time_spent_ms,
            "correct": correct,
            "score": score,
            "submitted_at": now.isoformat(),
        }
        row.question_level_answers = [*row.question_level_answers, answer]
        row.score = float(row.score) + score
        await self._session.commit()
        combo_count = self._current_combo(row)
        return GradeResult(
            attempt_id=attempt_id,
            question_id=question.id,
            correct=correct,
            score=score,
            feedback="Correct — your answer passed the server check."
            if correct
            else "Incorrect — review the lesson material.",
            combo=ComboState(
                count=combo_count,
                multiplier=min(3.0, 1 + combo_count * 0.25),
                best=self._best_combo(row),
            ),
        )

    async def submit(
        self, attempt_id: uuid.UUID, user_id: uuid.UUID, org_id: uuid.UUID | None
    ) -> AssessmentResult:
        row = await self._attempts.get(attempt_id, for_update=True)
        if row is None or row.user_id != user_id:
            raise ResourceNotFound("Assessment attempt not found.")
        await self._ensure_open(row)
        assessment = await self._assessments.get_by_id(row.assessment_id)
        if assessment is None:
            raise ResourceNotFound("Assessment not found.")
        if len(row.question_level_answers) < len(assessment.questions):
            raise ConflictError("Answer every question before submitting.")
        now = datetime.now(UTC)
        row.status = "submitted"
        row.submitted_at = now
        total_score = sum(_points(question.difficulty) for question in assessment.questions)
        score_pct = float(row.score) / total_score * 100 if total_score else 0
        result = AssessmentResult(
            attempt_id=row.attempt_id,
            assessment_id=row.assessment_id,
            score=float(row.score),
            total_score=total_score,
            correct_count=sum(1 for answer in row.question_level_answers if answer["correct"]),
            question_count=len(assessment.questions),
            time_taken_seconds=max(0, round((now - row.started_at).total_seconds())),
            max_combo=self._best_combo(row),
            integrity_flags=row.integrity_flags,
            passed=score_pct >= float(assessment.passing_percent),
        )
        event = AssessmentSubmittedEvent(
            user_id=user_id,
            org_id=org_id,  # slice 03 §9: the event envelope carries org identity
            idempotency_key=f"assessment.submitted:{attempt_id}",
            session_fingerprint=f"auth:{user_id}",
            assessment_id=assessment.id,
            assessment_kind="main",
            score_pct=score_pct,
            max_score=float(total_score),
            time_taken_seconds=result.time_taken_seconds,
            attempt_number=row.attempt_number,
            question_level_answers=row.question_level_answers,
        )
        from platform_core.events.models import OutboxEvent
        self._session.add(
            OutboxEvent(
                event_type=event.event_type,
                payload=event.model_dump(mode="json"),
                idempotency_key=event.idempotency_key,
            )
        )
        await self._session.commit()
        return result

    async def record_telemetry(
        self, attempt_id: uuid.UUID, user_id: uuid.UUID, data: TelemetryInput
    ) -> None:
        row = await self._attempts.get(attempt_id, for_update=True)
        if row is None or row.user_id != user_id:
            raise ResourceNotFound("Assessment attempt not found.")
        flag = f"{data.type}@{data.occurred_at.isoformat()}"
        if flag not in row.integrity_flags:
            row.integrity_flags = [*row.integrity_flags, flag]
        await self._session.commit()

    async def _ensure_open(self, row: AssessmentSubmission) -> None:
        if row.status != "in_progress":
            raise ConflictError("This assessment attempt is no longer in progress.")
        if datetime.now(UTC) >= row.expires_at:
            row.status = "expired"
            row.submitted_at = datetime.now(UTC)
            await self._session.commit()
            raise ConflictError("This assessment attempt has expired.")

    @staticmethod
    def _current_combo(row: AssessmentSubmission) -> int:
        count = 0
        for answer in reversed(row.question_level_answers):
            if not answer["correct"]:
                break
            count += 1
        return count

    @classmethod
    def _best_combo(cls, row: AssessmentSubmission) -> int:
        best = current = 0
        for answer in row.question_level_answers:
            current = current + 1 if answer["correct"] else 0
            best = max(best, current)
        return best
