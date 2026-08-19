"""Judge Engine security tier (slice 10 remediation F-5, F-6, F-7, F-13, F-14, F-11).

Covers the conceptual cross-user / cross-tenant attacks from the audit:
- F-5: `GET /judge/submissions/{id}` — User A must never read User B's submission (404).
- F-6: tenant isolation — Tenant A cannot see/submit/stream against Tenant B resources.
- F-7: `GET /judge/submissions/{id}/stream` — ticket auth: no ticket → 401; another user's
  submission → 404; own submission → stream opens.
- F-13: domain errors map to 4xx (403/422/404), never a bare ValueError → 500.
- F-14: submit is rate-limited per user (429 after the quota, Redis-backed).
- F-11: production can never select the Docker sandbox — fail-closed at Settings construction
  AND at the get_sandbox() selection boundary.
"""

import asyncio
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from judge.models import Problem, Submission
from platform_core.core.models.user import User
from tests.conftest import register_and_login

pytestmark = pytest.mark.asyncio

SUBMIT_URL = "/api/v1/judge/submit"
GET_URL = "/api/v1/judge/submissions/{submission_id}"
TICKET_URL = "/api/v1/judge/submissions/{submission_id}/ticket"
STREAM_URL = "/api/v1/judge/submissions/{submission_id}/stream"


async def _make_problem(db_session: AsyncSession, *, org_id: uuid.UUID | None = None) -> uuid.UUID:
    problem = Problem(
        id=uuid.uuid4(),
        slug=f"sec-p-{uuid.uuid4().hex[:8]}",
        title="Security problem",
        difficulty="easy",
        estimated_minutes=5,
        topics=["basics"],
        statement="Print input",
        constraints=[],
        starter_code="",
        time_limit_ms=1000,
        memory_limit_kb=65536,
        expected_solution=None,
        org_id=org_id,
    )
    db_session.add(problem)
    await db_session.commit()
    return problem.id


async def _make_submission(
    db_session: AsyncSession,
    *,
    problem_id: uuid.UUID,
    user_id: uuid.UUID,
    org_id: uuid.UUID | None,
    status: str = "graded",
    verdict: str = "accepted",
) -> uuid.UUID:
    submission = Submission(
        id=uuid.uuid4(),
        problem_id=problem_id,
        user_id=user_id,
        org_id=org_id,
        language="python",
        source_code="print(input())",
        status=status,
        verdict=verdict,
        runtime_ms=5,
        memory_kb=512,
        test_cases_passed=1,
        test_cases_total=1,
        stdout="out",
        stderr=None,
        compile_output=None,
    )
    db_session.add(submission)
    await db_session.commit()
    return submission.id


async def _user_id(db_session: AsyncSession, email: str) -> uuid.UUID:
    return (
        await db_session.execute(select(User.id).where(User.email == email))
    ).scalar_one()


# -- F-5: cross-user authorization ------------------------------------------------


async def test_result_read_requires_ownership(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """User B must not read User A's submission — 404, indistinguishable from missing."""
    token_a = await register_and_login(client, "judge-sec-a@example.com")
    token_b = await register_and_login(client, "judge-sec-b@example.com")
    user_a_id = await _user_id(db_session, "judge-sec-a@example.com")
    problem_id = await _make_problem(db_session)
    submission_id = await _make_submission(
        db_session, problem_id=problem_id, user_id=user_a_id, org_id=None
    )

    # Owner can read.
    own = await client.get(
        GET_URL.format(submission_id=submission_id),
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert own.status_code == 200
    assert own.json()["verdict"] == "accepted"

    # Foreign user gets 404 — no existence oracle, no stdout/verdict leakage.
    foreign = await client.get(
        GET_URL.format(submission_id=submission_id),
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert foreign.status_code == 404


async def test_result_read_rejects_unauthenticated(client: AsyncClient) -> None:
    response = await client.get(GET_URL.format(submission_id=uuid.uuid4()))
    assert response.status_code == 401


# -- F-6: tenant isolation ---------------------------------------------------------


async def test_tenant_a_cannot_read_tenant_b_submission(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token_a = await register_and_login(client, "judge-tenant-a@example.com")
    token_b = await register_and_login(client, "judge-tenant-b@example.com")
    org_a, org_b = uuid.uuid4(), uuid.uuid4()
    user_a_id = await _user_id(db_session, "judge-tenant-a@example.com")
    await db_session.execute(
        __import__("sqlalchemy").update(User)
        .where(User.id == user_a_id)
        .values(org_id=org_a)
    )
    user_b_id = await _user_id(db_session, "judge-tenant-b@example.com")
    await db_session.execute(
        __import__("sqlalchemy").update(User).where(User.id == user_b_id).values(org_id=org_b)
    )
    await db_session.commit()

    problem_id = await _make_problem(db_session, org_id=org_b)
    submission_id = await _make_submission(
        db_session, problem_id=problem_id, user_id=user_b_id, org_id=org_b
    )

    # Owner (tenant B) reads fine.
    own = await client.get(
        GET_URL.format(submission_id=submission_id),
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert own.status_code == 200

    # Tenant A cannot read tenant B's submission.
    foreign = await client.get(
        GET_URL.format(submission_id=submission_id),
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert foreign.status_code == 404


async def test_tenant_a_cannot_submit_against_tenant_b_problem(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token_a = await register_and_login(client, "judge-tenant-sub-a@example.com")
    await register_and_login(client, "judge-tenant-sub-b@example.com")
    org_a, org_b = uuid.uuid4(), uuid.uuid4()
    user_a_id = await _user_id(db_session, "judge-tenant-sub-a@example.com")

    await db_session.execute(update(User).where(User.id == user_a_id).values(org_id=org_a))
    user_b_id = await _user_id(db_session, "judge-tenant-sub-b@example.com")
    await db_session.execute(update(User).where(User.id == user_b_id).values(org_id=org_b))
    await db_session.commit()

    problem_id = await _make_problem(db_session, org_id=org_b)

    # Tenant A submits against tenant B's private problem → 404 (invisible).
    response = await client.post(
        SUBMIT_URL,
        json={
            "problem_id": str(problem_id),
            "user_id": str(user_a_id),
            "language": "python",
            "source_code": "print(input())",
        },
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 404


async def test_public_problem_submittable_by_any_tenant(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """A public (org_id NULL) problem remains usable by any tenant — only private org
    problems are tenant-scoped."""
    token = await register_and_login(client, "judge-public-sub@example.com")
    user_id = await _user_id(db_session, "judge-public-sub@example.com")
    problem_id = await _make_problem(db_session, org_id=None)

    response = await client.post(
        SUBMIT_URL,
        json={
            "problem_id": str(problem_id),
            "user_id": str(user_id),
            "language": "python",
            "source_code": "print(input())",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 202


# -- F-7: SSE ticket security ------------------------------------------------------


async def test_stream_with_unknown_ticket_is_401(client: AsyncClient) -> None:
    # A well-formed (>=16 chars) but never-issued ticket must be rejected before any event
    # data is sent. A missing ticket is a FastAPI validation error (422).
    response = await client.get(
        STREAM_URL.format(submission_id=uuid.uuid4()),
        params={"ticket": "unknown-ticket-0123456789abcdef"},
    )
    assert response.status_code == 401


async def test_stream_ticket_rejects_foreign_submission(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token_a = await register_and_login(client, "judge-stream-a@example.com")
    token_b = await register_and_login(client, "judge-stream-b@example.com")
    user_a_id = await _user_id(db_session, "judge-stream-a@example.com")
    problem_id = await _make_problem(db_session)
    # A queued (not yet graded) submission is still streamable by its owner.
    submission_id = await _make_submission(
        db_session, problem_id=problem_id, user_id=user_a_id, org_id=None, status="queued"
    )

    # User B cannot even obtain a ticket for User A's submission.
    foreign_ticket = await client.post(
        TICKET_URL.format(submission_id=submission_id),
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert foreign_ticket.status_code == 404

    # User A obtains a ticket and opens the stream. ASGITransport buffers infinite bodies,
    # so a successful open never completes — which is exactly the assertion: the request is
    # still streaming (heartbeats) instead of completing with 401/404. Cancelled on timeout.
    own_ticket = await client.post(
        TICKET_URL.format(submission_id=submission_id),
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert own_ticket.status_code == 200
    ticket = own_ticket.json()["ticket"]
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(
            client.get(
                STREAM_URL.format(submission_id=submission_id), params={"ticket": ticket}
            ),
            timeout=1.0,
        )


async def test_stream_ticket_is_single_use(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token = await register_and_login(client, "judge-stream-single@example.com")
    user_id = await _user_id(db_session, "judge-stream-single@example.com")
    problem_id = await _make_problem(db_session)
    submission_id = await _make_submission(
        db_session, problem_id=problem_id, user_id=user_id, org_id=None
    )

    ticket_resp = await client.post(
        TICKET_URL.format(submission_id=submission_id),
        headers={"Authorization": f"Bearer {token}"},
    )
    ticket = ticket_resp.json()["ticket"]
    # First open consumes the ticket and starts the (infinite) stream — never completes.
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(
            client.get(
                STREAM_URL.format(submission_id=submission_id), params={"ticket": ticket}
            ),
            timeout=1.0,
        )
    # The ticket was consumed by the first stream open — replay opens nothing (401).
    replay = await client.get(
        STREAM_URL.format(submission_id=submission_id), params={"ticket": ticket}
    )
    assert replay.status_code == 401


# -- F-13: proper HTTP errors ------------------------------------------------------


async def test_submit_foreign_user_id_is_403(client: AsyncClient) -> None:
    token = await register_and_login(client, "judge-f13-user@example.com")
    attacker_id = uuid.uuid4()  # not the authenticated user's id
    response = await client.post(
        SUBMIT_URL,
        json={
            "problem_id": str(uuid.uuid4()),
            "user_id": str(attacker_id),
            "language": "python",
            "source_code": "print(1)",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


async def test_submit_unsupported_language_is_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token = await register_and_login(client, "judge-f13-lang@example.com")
    user_id = await _user_id(db_session, "judge-f13-lang@example.com")
    response = await client.post(
        SUBMIT_URL,
        json={
            "problem_id": str(uuid.uuid4()),
            "user_id": str(user_id),
            "language": "brainfuck",
            "source_code": "print(1)",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


async def test_submit_oversized_source_is_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    token = await register_and_login(client, "judge-f13-size@example.com")
    user_id = await _user_id(db_session, "judge-f13-size@example.com")
    response = await client.post(
        SUBMIT_URL,
        json={
            "problem_id": str(uuid.uuid4()),
            "user_id": str(user_id),
            "language": "python",
            "source_code": "x" * 70_000,  # > 64KB cap
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


# -- F-14: per-user rate limiting ---------------------------------------------------


async def test_submit_rate_limit_is_per_user_and_returns_429(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """The Redis-backed limiter must 429 the same user past the quota — and the quota is
    per authenticated user, not per IP."""
    token = await register_and_login(client, "judge-rate-limited@example.com")
    user_id = await _user_id(db_session, "judge-rate-limited@example.com")
    problem_id = await _make_problem(db_session)

    quota = 10
    responses = []
    for _ in range(quota + 1):
        response = await client.post(
            SUBMIT_URL,
            json={
                "problem_id": str(problem_id),
                "user_id": str(user_id),
                "language": "python",
                "source_code": "print(input())",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        responses.append(response.status_code)

    assert responses.count(202) == quota
    assert responses[-1] == 429


# -- F-11: fail-closed sandbox selection --------------------------------------------


async def test_production_can_never_select_docker_sandbox() -> None:
    """Both independent guards must fire: Settings construction and get_sandbox()."""
    import judge.orchestrator.sandbox as sandbox_module
    from judge.orchestrator.sandbox import SandboxInfrastructureError, get_sandbox
    from platform_core.core.config import Settings

    # Guard 1: Settings construction fails closed — production + docker is a hard ValueError
    # at import/startup time, so EVERY process (API and worker) refuses to boot.
    with pytest.raises(Exception) as excinfo:
        Settings(ENV="production", JUDGE_SANDBOX_TYPE="docker")
    assert "DevelopmentOnlyDockerSandbox cannot be used in production" in str(excinfo.value)

    # Guard 2: the selection boundary fails closed independently, even if a caller managed
    # to construct a production Settings by other means.
    class _PoisonedSettings:
        ENV = "production"
        JUDGE_SANDBOX_TYPE = "docker"
        JUDGE_SANDBOX_NAMESPACE = "judge-sandboxes"
        JUDGE_SANDBOX_RUNTIME_CLASS = "gvisor"
        JUDGE_SANDBOX_IMAGE = (
            "python:3.12-alpine@sha256:d09d15e60962ca365d1cd544a48773bac9d33f2fb1b00f2aa0deec78ade7dc31"
        )
        JUDGE_SANDBOX_MAX_OUTPUT_BYTES = 65536
        JUDGE_SANDBOX_MAX_PROCESSES = 64
        JUDGE_SANDBOX_MAX_DISK_MB = 64
        JUDGE_SANDBOX_CPU_LIMIT = "1"
        JUDGE_SANDBOX_MEMORY_LIMIT_MB = 256
        JUDGE_SANDBOX_WALL_GRACE_SECONDS = 5

    original_settings = sandbox_module.settings  # type: ignore[attr-defined]
    sandbox_module.settings = _PoisonedSettings()  # type: ignore[assignment, attr-defined]
    try:
        with pytest.raises(SandboxInfrastructureError):
            get_sandbox()
    finally:
        sandbox_module.settings = original_settings  # type: ignore[attr-defined]
