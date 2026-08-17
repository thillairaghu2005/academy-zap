"""Slice 09 acceptance tier — leagues + competitive seasons on the REAL pipeline.

Creates and activates a season through the admin API, earns real XP through the real
event pipeline (outbox -> Redis stream -> worker -> ledger), verifies the league
projection (Redis ZSET) reflects membership, reads the league APIs, then finalizes the
season and verifies promotion/demotion and finalization idempotency.

Real Postgres, real Redis, real worker — no mocks for the pipeline itself (same pattern
as test_leaderboard_acceptance.py and test_badges_acceptance.py).
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    AsyncRedis = Redis[str]
else:
    AsyncRedis = Redis

from assessments.models import Assessment, Question
from content.models import Course, Enrollment
from gamification.models import SeasonMembership
from gamification.repositories.leagues import MembershipRepository, SeasonRepository
from gamification.services.seasons import SeasonService
from platform_core.core.config import settings
from platform_core.core.db.session import get_session
from platform_core.core.models.user import User
from platform_core.core.rbac import Role
from platform_core.core.redis import get_redis
from tests.conftest import register_and_login

ASSESSMENT_MAX_MASTERY_XP = 500


@pytest_asyncio.fixture
async def real_redis_client(
    db_session: AsyncSession,
) -> AsyncGenerator[tuple[AsyncClient, AsyncRedis]]:
    real_redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _override_get_session() -> AsyncGenerator[AsyncSession]:
        yield db_session

    async def _override_get_redis() -> AsyncGenerator[AsyncRedis]:
        yield real_redis

    from fastapi_limiter import FastAPILimiter

    from main import app

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis
    # Clean the shared league keys + event stream so totals are exact.
    keys = [
        f"league:{key}" for key in await _all_league_keys(real_redis)
    ]
    if keys:
        await real_redis.delete(*keys)
    from platform_core.bus.producer import EVENTS_STREAM_KEY

    await real_redis.delete(EVENTS_STREAM_KEY)
    await FastAPILimiter.init(real_redis, prefix=f"fastapi-limiter-league-{uuid.uuid4().hex}")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac, real_redis
    finally:
        await FastAPILimiter.close()
        app.dependency_overrides.clear()
        await real_redis.delete(EVENTS_STREAM_KEY)
        await real_redis.close()


async def _all_league_keys(redis: AsyncRedis) -> list[str]:
    """All keys under the league: namespace (scan; bounded to the test's active season)."""
    cursor = 0
    keys: list[str] = []
    while True:
        cursor, batch = await redis.scan(cursor, match="league:*", count=100)
        keys.extend(batch)
        if cursor == 0:
            return keys


async def _promote_to_admin(
    db_session: AsyncSession, user_id: str, *, role: Role = Role.PLATFORM_OPS
) -> None:
    await db_session.execute(
        update(User).where(User.id == user_id).values(role=role.value)
    )
    await db_session.commit()


async def _seed_assessment_for_user(
    db_session: AsyncSession, *, user_id: uuid.UUID
) -> tuple[uuid.UUID, list[uuid.UUID]]:
    course = Course(
        id=uuid.uuid4(),
        title="League Acceptance Host",
        category="web_development",
        level="beginner",
        status="published",
        instructor_user_id=uuid.uuid4(),
    )
    db_session.add(course)
    await db_session.flush()
    db_session.add(Enrollment(course_id=course.id, user_id=user_id))
    assessment = Assessment(
        id=uuid.uuid4(),
        slug=f"league-acceptance-{uuid.uuid4().hex[:8]}",
        title="League Acceptance Assessment",
        category="web_development",
        description="Single easy MCQ.",
        attempts_allowed=3,
        estimated_minutes=30,
        passing_percent=50,
        course_id=course.id,
        status="published",
    )
    question = Question(
        id=uuid.uuid4(),
        assessment_id=assessment.id,
        type="mcq",
        difficulty="easy",
        prompt="Pick the first option.",
        options=["Wrong", "Correct"],
        accepted_answers=["1"],
        position=0,
    )
    assessment.questions = [question]
    db_session.add(assessment)
    await db_session.commit()
    return assessment.id, [question.id]


async def _complete_assessment(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    assessment_id: uuid.UUID,
    question_ids: list[uuid.UUID],
) -> None:
    started = await client.post(
        f"/api/v1/assessments/{assessment_id}/attempts", headers=headers
    )
    assert started.status_code == 201
    attempt_id: str = started.json()["attempt_id"]
    answered = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json={"question_id": str(question_ids[0]), "option_index": 1, "time_spent_ms": 2_000},
    )
    assert answered.status_code == 200
    final = await client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit-final", headers=headers
    )
    assert final.status_code == 200


async def _drain_until_league_members(
    *,
    expected: int,
    db_session: AsyncSession,
    redis: AsyncRedis,
    monkeypatch: pytest.MonkeyPatch,
    max_polls: int = 25,
) -> int:
    """Run the real worker until the active season's league projection has `expected`
    members (bounded). Returns the member count seen on the last poll."""
    from contextlib import asynccontextmanager

    import platform_core.bus.worker as worker_module

    @asynccontextmanager
    async def _test_session_scope() -> AsyncGenerator[AsyncSession]:
        yield db_session

    monkeypatch.setattr(worker_module, "get_redis_client", lambda: redis)
    monkeypatch.setattr(worker_module, "session_scope", _test_session_scope)

    from gamification.projections.leagues import LeagueProjection
    from tests.conftest import drain_outbox_for_test

    season = await SeasonRepository(db_session).get_active()
    if season is None:
        return 0
    seen: int = 0
    for _ in range(max_polls):
        await drain_outbox_for_test(db_session, redis)
        await worker_module.poll_gamification_events({})
        page = await LeagueProjection(redis).page(
            season_id=str(season.id), tier_id="bronze", offset=0, limit=100
        )
        seen = int(page["total"])
        if seen >= expected:
            return seen
    return seen


# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_season_lifecycle_finalization_and_idempotency(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """End-to-end: admin creates+activates a season -> users earn real XP -> league
    projection fills -> APIs read the derived standing -> finalize -> promotion/demotion
    applied -> retry finalization is a no-op -> previous season data stays stable."""
    client, real_redis = real_redis_client

    # Admin creates and activates a season spanning now.
    admin_token = await register_and_login(client, "league-admin@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    await _promote_to_admin(db_session, me.json()["id"])
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    start = datetime.now(UTC) - timedelta(hours=1)
    end = datetime.now(UTC) + timedelta(days=7)
    created = await client.post(
        "/api/v1/admin/seasons",
        json={
            "name": "Season of Bronze",
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
        },
        headers=admin_headers,
    )
    assert created.status_code == 200
    season_id = created.json()["id"]

    activated = await client.post(
        f"/api/v1/admin/seasons/{season_id}/activate", headers=admin_headers
    )
    assert activated.status_code == 200

    # /seasons/current reports the live season.
    current = await client.get("/api/v1/seasons/current")
    assert current.status_code == 200
    assert current.json()["status"] == "active"
    assert current.json()["season"]["id"] == season_id

    # Two learners earn real XP (same 100% mastery score).
    tokens = []
    user_ids = []
    for suffix in ("a", "b"):
        token = await register_and_login(client, f"league-{suffix}@example.com")
        headers = {"Authorization": f"Bearer {token}"}
        me_user = await client.get("/api/v1/auth/me", headers=headers)
        user_ids.append(uuid.UUID(me_user.json()["id"]))
        tokens.append(token)
        aid, qids = await _seed_assessment_for_user(db_session, user_id=user_ids[-1])
        await _complete_assessment(client, headers, assessment_id=aid, question_ids=qids)

    total = await _drain_until_league_members(
        expected=2, db_session=db_session, redis=real_redis, monkeypatch=monkeypatch
    )
    assert total == 2

    # /me/league — the caller's standing is derived from their membership.
    headers_a = {"Authorization": f"Bearer {tokens[0]}"}
    my_league = await client.get("/api/v1/me/league", headers=headers_a)
    assert my_league.status_code == 200
    body = my_league.json()
    assert body["league_tier"] == "bronze"
    # Season XP is the raw ledger slice (500) — NOT the 0.6-weighted leaderboard score.
    assert body["xp_this_season"] == ASSESSMENT_MAX_MASTERY_XP
    # Both users have the same season XP -> deterministic tie-break (member id asc), so
    # the viewer holds one of the two dense ranks 1/2 — and their rank matches the board.
    assert body["rank_in_league"] in (1, 2)

    # /me/league/leaderboard — the tier board.
    board = await client.get("/api/v1/me/league/leaderboard", headers=headers_a)
    assert board.status_code == 200
    entries = board.json()["entries"]
    assert len(entries) == 2
    assert {e["xp_this_season"] for e in entries} == {ASSESSMENT_MAX_MASTERY_XP}
    mine = next(e for e in entries if e["is_me"] is True)
    assert mine["rank"] == body["rank_in_league"]
    assert mine["xp_this_season"] == ASSESSMENT_MAX_MASTERY_XP

    # Finalize: bronze has 2 active members -> both are in the top 3 slots and bronze has a
    # tier above (silver), so both are PROMOTED; demotion needs a tier below bronze, so 0.
    finalized = await client.post(
        f"/api/v1/admin/seasons/{season_id}/finalize", headers=admin_headers
    )
    assert finalized.status_code == 200
    outcome = finalized.json()
    assert outcome["status"] == "completed"
    assert outcome["promoted"] == 2
    assert outcome["demoted"] == 0
    assert outcome["retained"] == 0

    members = await MembershipRepository(db_session).list_for_season(uuid.UUID(season_id))
    assert {m.outcome for m in members} == {"promoted"}
    assert {m.league_tier for m in members} == {"silver"}

    # Retry finalization: idempotent — zero new writes, same state.
    retry = await client.post(
        f"/api/v1/admin/seasons/{season_id}/finalize", headers=admin_headers
    )
    assert retry.status_code == 200
    assert retry.json()["promoted"] == 0
    assert retry.json()["demoted"] == 0

    members_after = await MembershipRepository(db_session).list_for_season(uuid.UUID(season_id))
    assert len(members_after) == 2
    assert {m.outcome for m in members_after} == {"promoted"}

    # Previous season data remains stable and queryable.
    season_row = await SeasonRepository(db_session).get_by_id(uuid.UUID(season_id))
    assert season_row is not None
    assert season_row.status == "completed"


@pytest.mark.asyncio
async def test_promotion_demotion_across_tiers(
    real_redis_client: tuple[AsyncClient, AsyncRedis],
    db_session: AsyncSession,
    postgres_test_db: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Promotion/demotion semantics: a silver member at the top moves up to gold, a silver
    member at the bottom moves down to bronze, and an inactive (0-XP) member is retained.
    Exercises the service directly (deterministic rules; real Postgres)."""
    client, _redis = real_redis_client
    admin_token = await register_and_login(client, "league-admin-2@example.com")
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    await _promote_to_admin(db_session, me.json()["id"])
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    start = datetime.now(UTC) - timedelta(hours=1)
    end = datetime.now(UTC) + timedelta(days=7)
    created = await client.post(
        "/api/v1/admin/seasons",
        json={
            "name": "Season of Silver",
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
            "config": {"promotion_slots": 1, "demotion_slots": 2},
        },
        headers=admin_headers,
    )
    season_id = uuid.UUID(created.json()["id"])
    assert (
        await client.post(f"/api/v1/admin/seasons/{season_id}/activate", headers=admin_headers)
    ).status_code == 200

    season = await SeasonRepository(db_session).get_by_id(season_id)
    assert season is not None

    # Five silver members with demotion_slots=2: top -> promoted to gold, 2nd-from-last
    # (active) -> demoted to bronze, middles -> retained, inactive (0 XP) -> retained even
    # though it is last (inactive members are never promoted/demoted).
    service = SeasonService(db_session)
    members = []
    for xp in (1000, 800, 600, 100, 0):
        user_id = uuid.uuid4()
        await service.upsert_membership(user_id=user_id, season=season, tier_id="silver")
        members.append((user_id, xp))

        await db_session.execute(
            update(SeasonMembership)
            .where(SeasonMembership.user_id == user_id)
            .values(xp_this_season=xp)
        )
    await db_session.commit()

    outcome = await service.finalize_season(season_id)
    assert outcome == {"promoted": 1, "demoted": 1, "retained": 3}

    rows = {
        str(m.user_id): m
        for m in await MembershipRepository(db_session).list_for_season(season_id)
    }
    assert rows[str(members[0][0])].outcome == "promoted"
    assert rows[str(members[0][0])].league_tier == "gold"
    # 100 XP is the 2nd-from-last ACTIVE member -> demoted to bronze.
    assert rows[str(members[3][0])].outcome == "demoted"
    assert rows[str(members[3][0])].league_tier == "bronze"
    assert rows[str(members[1][0])].outcome == "retained"
    assert rows[str(members[2][0])].outcome == "retained"
    # Inactive member retained, stays in silver.
    assert rows[str(members[4][0])].outcome == "retained"
    assert rows[str(members[4][0])].league_tier == "silver"
