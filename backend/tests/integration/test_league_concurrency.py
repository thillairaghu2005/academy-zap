"""Slice 09 remediation — FIX-1 race tests on REAL PostgreSQL (no mocks).

The bug being pinned: `MembershipRepository.upsert` used to re-apply the caller's
`xp_this_season` on the ON CONFLICT branch, so a stale reader (GET /me/league that read
the ledger before the worker's append committed) could overwrite the authoritative
`xp_this_season` the worker just wrote. The fix: the conflict branch returns the existing
row UNMODIFIED, and `apply_event_delta` remains the ONLY authoritative incremental XP
updater (it explicitly applies its delta when its INSERT loses).

Each test opens its own sessions so the interleavings are real transaction-level races
against the same throwaway Postgres — never simulated with mocks.

Note on isolation: these tests COMMIT through their own engines (the `db_session`
savepoint is not visible to other connections), so each test removes its committed rows
afterwards — a leftover ACTIVE season would trip the partial unique index for later tests
in the same throwaway DB.
"""

import asyncio
import uuid
from collections.abc import AsyncGenerator, Callable
from datetime import UTC, datetime, timedelta

import fakeredis
import pytest
import pytest_asyncio
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from gamification.models import LeagueSeason, LedgerEntry, SeasonMembership
from gamification.repositories.leagues import SeasonRepository
from gamification.repositories.ledger import LedgerRepository
from gamification.services.seasons import SeasonService
from tests.conftest import TEST_DATABASE_URL

NOW = datetime.now(UTC)


def _new_session(url: str) -> AsyncSession:
    engine = create_async_engine(url)
    return AsyncSession(bind=engine, expire_on_commit=False)


async def _active_season(db_session: AsyncSession) -> uuid.UUID:
    """Create + activate a season spanning now, in its OWN committed transaction (the
    `db_session` fixture's savepoint is invisible to other connections), so it is visible
    to the concurrent sessions below."""
    session = _new_session(TEST_DATABASE_URL)
    try:
        repo = SeasonRepository(session)
        season = await repo.create(
            name=f"Race {uuid.uuid4().hex[:8]}",
            start_at=NOW - timedelta(hours=1),
            end_at=NOW + timedelta(days=7),
        )
        await repo.set_status(season.id, "active", expected_status="scheduled")
        await session.commit()
        return season.id
    finally:
        await session.close()
        await session.bind.dispose()  # type: ignore[union-attr]


@pytest_asyncio.fixture
async def committed_db_cleanup(
    db_session: AsyncSession,
) -> AsyncGenerator[Callable[[uuid.UUID, list[uuid.UUID]], None], None]:
    """Remove the committed rows a test created (all committed rows in the shared
    throwaway DB are this test's own — other tests' data lives in uncommitted savepoints).
    Depends on `db_session` (same graph as `real_redis_client`) so the session-scoped
    `postgres_test_db` fixture is instantiated exactly once for the whole run."""
    created: list[tuple[uuid.UUID, list[uuid.UUID]]] = []

    def _register(season_id: uuid.UUID, user_ids: list[uuid.UUID]) -> None:
        created.append((season_id, user_ids))

    yield _register

    session = _new_session(TEST_DATABASE_URL)
    try:
        for season_id, user_ids in created:
            await session.execute(
                delete(SeasonMembership).where(SeasonMembership.season_id == season_id)
            )
            for user_id in user_ids:
                await session.execute(delete(LedgerEntry).where(LedgerEntry.user_id == user_id))
            await session.execute(delete(LeagueSeason).where(LeagueSeason.id == season_id))
        await session.commit()
    finally:
        await session.close()
        await session.bind.dispose()  # type: ignore[union-attr]


async def _membership_state(url: str, season_id: uuid.UUID, user_id: uuid.UUID) -> tuple[int, int]:
    """(count_of_rows, xp_this_season_of_the_single_row) for (user, season)."""
    session = _new_session(url)
    try:
        result = await session.execute(
            select(func.count())
            .select_from(SeasonMembership)
            .where(
                SeasonMembership.season_id == season_id,
                SeasonMembership.user_id == user_id,
            )
        )
        count = int(result.scalar_one())
        if count == 0:
            return 0, 0
        row = await session.execute(
            select(SeasonMembership.xp_this_season).where(
                SeasonMembership.season_id == season_id,
                SeasonMembership.user_id == user_id,
            )
        )
        return count, int(row.scalar_one())
    finally:
        await session.close()
        await session.bind.dispose()  # type: ignore[union-attr]


async def _reader_get_me_league(url: str, season_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Simulate GET /me/league: insert-if-absent with the reader's (possibly stale) ledger
    slice, exactly like `routes/leagues.get_my_league` does."""
    session = _new_session(url)
    try:
        season = await SeasonRepository(session).get_by_id(season_id)
        assert season is not None
        service = SeasonService(session)
        await service.upsert_membership(user_id=user_id, season=season, tier_id="bronze")
        await session.commit()
    finally:
        await session.close()
        await session.bind.dispose()  # type: ignore[union-attr]


async def _worker_apply_event(url: str, season_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Simulate the worker: append the authoritative ledger delta, then
    `apply_event_delta` — all in one transaction, exactly like `poll_gamification_events`."""
    session = _new_session(url)
    try:
        ledger = LedgerRepository(session)
        await ledger.append(
            user_id=user_id,
            event_id=uuid.uuid4(),
            xp_type="completion",
            xp_delta=500,
            reason_code="COURSE_COMPLETE",
            source_type="course",
            source_id=uuid.uuid4(),
        )
        season = await SeasonRepository(session).get_by_id(season_id)
        assert season is not None
        await SeasonService(session).apply_event_delta(
            user_id=user_id, xp_delta=500, occurred_at=NOW, redis=fakeredis.FakeAsyncRedis()
        )
        await session.commit()
    finally:
        await session.close()
        await session.bind.dispose()  # type: ignore[union-attr]


# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_me_league_vs_worker_membership_creation_never_loses_xp(
    db_session: AsyncSession,
    postgres_test_db: str,
    committed_db_cleanup: Callable[[uuid.UUID, list[uuid.UUID]], None],
) -> None:
    """The audit's BLOCKER 1 scenario: GET /me/league races the worker's membership
    creation (+500). Whatever the interleaving, the membership exists exactly once and
    carries 500 XP — NEVER 0. Run several user_ids so both interleavings are exercised."""
    season_id = await _active_season(db_session)
    user_ids: list[uuid.UUID] = []
    try:
        for _ in range(6):
            user_id = uuid.uuid4()
            user_ids.append(user_id)
            await asyncio.gather(
                _reader_get_me_league(postgres_test_db, season_id, user_id),
                _worker_apply_event(postgres_test_db, season_id, user_id),
            )
            count, xp = await _membership_state(postgres_test_db, season_id, user_id)
            assert count == 1, "membership must exist exactly once"
            assert xp == 500, f"authoritative 500 XP was lost (got {xp})"
    finally:
        committed_db_cleanup(season_id, user_ids)


@pytest.mark.asyncio
async def test_get_me_league_never_overwrites_existing_membership_then_worker_increments(
    db_session: AsyncSession,
    postgres_test_db: str,
    committed_db_cleanup: Callable[[uuid.UUID, list[uuid.UUID]], None],
) -> None:
    """Existing membership (500 XP) is NOT changed by the GET /me/league upsert path, and
    a later worker delta (+100) lands on top: final 600."""
    season_id = await _active_season(db_session)
    user_id = uuid.uuid4()
    try:
        # Seed the authoritative membership: 500 XP (as if a prior worker event wrote it).
        session = _new_session(postgres_test_db)
        try:
            season = await SeasonRepository(session).get_by_id(season_id)
            assert season is not None
            service = SeasonService(session)
            membership = await service.upsert_membership(
                user_id=user_id, season=season, tier_id="bronze"
            )
            membership.xp_this_season = 500
            await session.commit()
        finally:
            await session.close()
            await session.bind.dispose()  # type: ignore[union-attr]

        # A stale reader (compute would see 0) attempts an upsert with 0 — must be a no-op.
        await _reader_get_me_league(postgres_test_db, season_id, user_id)
        count, xp = await _membership_state(postgres_test_db, season_id, user_id)
        assert count == 1
        assert xp == 500, "GET /me/league must never overwrite existing xp_this_season"

        # Worker applies +100 on the existing membership -> 600.
        session = _new_session(postgres_test_db)
        try:
            season = await SeasonRepository(session).get_by_id(season_id)
            assert season is not None
            ledger = LedgerRepository(session)
            await ledger.append(
                user_id=user_id,
                event_id=uuid.uuid4(),
                xp_type="completion",
                xp_delta=100,
                reason_code="COURSE_COMPLETE",
                source_type="course",
                source_id=uuid.uuid4(),
            )
            await SeasonService(session).apply_event_delta(
                user_id=user_id,
                xp_delta=100,
                occurred_at=NOW,
                redis=fakeredis.FakeAsyncRedis(),
            )
            await session.commit()
        finally:
            await session.close()
            await session.bind.dispose()  # type: ignore[union-attr]

        count, xp = await _membership_state(postgres_test_db, season_id, user_id)
        assert count == 1
        assert xp == 600
    finally:
        committed_db_cleanup(season_id, [user_id])


@pytest.mark.asyncio
async def test_concurrent_membership_creation_creates_exactly_one_row(
    db_session: AsyncSession,
    postgres_test_db: str,
    committed_db_cleanup: Callable[[uuid.UUID, list[uuid.UUID]], None],
) -> None:
    """Two simultaneous first-event workers for the same user: exactly one membership row,
    and XP reflects the full authoritative slice (both deltas, no double count)."""
    season_id = await _active_season(db_session)
    user_id = uuid.uuid4()
    try:

        async def worker(xp_delta: int) -> None:
            session = _new_session(postgres_test_db)
            try:
                ledger = LedgerRepository(session)
                await ledger.append(
                    user_id=user_id,
                    event_id=uuid.uuid4(),
                    xp_type="completion",
                    xp_delta=xp_delta,
                    reason_code="COURSE_COMPLETE",
                    source_type="course",
                    source_id=uuid.uuid4(),
                )
                season = await SeasonRepository(session).get_by_id(season_id)
                assert season is not None
                await SeasonService(session).apply_event_delta(
                    user_id=user_id,
                    xp_delta=xp_delta,
                    occurred_at=NOW,
                    redis=fakeredis.FakeAsyncRedis(),
                )
                await session.commit()
            finally:
                await session.close()
                await session.bind.dispose()  # type: ignore[union-attr]

        await asyncio.gather(worker(300), worker(200))
        count, xp = await _membership_state(postgres_test_db, season_id, user_id)
        assert count == 1
        assert xp == 500, f"expected 500 (300+200), got {xp}"
    finally:
        committed_db_cleanup(season_id, [user_id])


@pytest.mark.asyncio
async def test_concurrent_xp_increment_on_existing_membership_sums_exactly(
    db_session: AsyncSession,
    postgres_test_db: str,
    committed_db_cleanup: Callable[[uuid.UUID, list[uuid.UUID]], None],
) -> None:
    """Two workers concurrently incrementing an EXISTING membership: the sum is exact
    (the per-user advisory lock serializes the ledger appends; apply_event_delta is the
    only incrementer)."""
    season_id = await _active_season(db_session)
    user_id = uuid.uuid4()
    try:
        # Seed a membership with 100 XP.
        session = _new_session(postgres_test_db)
        try:
            season = await SeasonRepository(session).get_by_id(season_id)
            assert season is not None
            membership = await SeasonService(session).upsert_membership(
                user_id=user_id, season=season, tier_id="bronze"
            )
            membership.xp_this_season = 100
            await session.commit()
        finally:
            await session.close()
            await session.bind.dispose()  # type: ignore[union-attr]

        async def worker(xp_delta: int) -> None:
            session = _new_session(postgres_test_db)
            try:
                ledger = LedgerRepository(session)
                await ledger.append(
                    user_id=user_id,
                    event_id=uuid.uuid4(),
                    xp_type="mastery",
                    xp_delta=xp_delta,
                    reason_code="MAIN_ASSESSMENT",
                    source_type="assessment",
                    source_id=uuid.uuid4(),
                )
                season = await SeasonRepository(session).get_by_id(season_id)
                assert season is not None
                await SeasonService(session).apply_event_delta(
                    user_id=user_id,
                    xp_delta=xp_delta,
                    occurred_at=NOW,
                    redis=fakeredis.FakeAsyncRedis(),
                )
                await session.commit()
            finally:
                await session.close()
                await session.bind.dispose()  # type: ignore[union-attr]

        await asyncio.gather(worker(150), worker(250))
        count, xp = await _membership_state(postgres_test_db, season_id, user_id)
        assert count == 1
        assert xp == 500, f"expected 500 (100+150+250), got {xp}"
    finally:
        committed_db_cleanup(season_id, [user_id])


@pytest.mark.asyncio
async def test_concurrent_season_finalization_writes_outcomes_exactly_once(
    db_session: AsyncSession,
    postgres_test_db: str,
    committed_db_cleanup: Callable[[uuid.UUID, list[uuid.UUID]], None],
) -> None:
    """Two transactions finalize the same ACTIVE season at the same time: the guarded
    active -> completed transition lets exactly one win, and every membership gets its
    outcome written exactly once (no duplicate outcomes, byte-identical state)."""
    season_id = await _active_season(db_session)
    user_ids = [uuid.uuid4() for _ in range(4)]
    try:
        # Seed 4 bronze members with distinct XP (committed, visible to both sessions).
        session = _new_session(postgres_test_db)
        try:
            season = await SeasonRepository(session).get_by_id(season_id)
            assert season is not None
            for index, user_id in enumerate(user_ids):
                membership = await SeasonService(session).upsert_membership(
                    user_id=user_id, season=season, tier_id="bronze"
                )
                membership.xp_this_season = 400 - index * 50
            await session.commit()
        finally:
            await session.close()
            await session.bind.dispose()  # type: ignore[union-attr]

        async def finalize() -> dict[str, int | bool]:
            s = _new_session(postgres_test_db)
            try:
                outcome = await SeasonService(s).finalize_season(season_id)
                await s.commit()
                return outcome
            finally:
                await s.close()
                await s.bind.dispose()  # type: ignore[union-attr]

        results = await asyncio.gather(finalize(), finalize())
        flags = [r["already_finalized"] for r in results]
        assert sorted(flags) == [False, True], f"one winner required, got {flags}"

        # Every member has exactly one outcome; the winning run's promoted count is
        # deterministic (top 3 of bronze promote under default promotion_slots=3).
        session = _new_session(postgres_test_db)
        try:
            rows = (
                (
                    await session.execute(
                        select(SeasonMembership)
                        .where(SeasonMembership.season_id == season_id)
                        .order_by(SeasonMembership.user_id)
                    )
                )
                .scalars()
                .all()
            )
            assert len(rows) == 4
            assert all(row.outcome is not None for row in rows)
            # Top 3 of bronze promote to silver; the bottom member is retained (bronze is
            # the bottom tier — nothing to demote to). Exactly once each.
            assert sorted(str(row.outcome) for row in rows) == [
                "promoted",
                "promoted",
                "promoted",
                "retained",
            ]
            assert sum(row.league_tier == "silver" for row in rows) == 3
            assert sum(row.league_tier == "bronze" for row in rows) == 1
            status = await SeasonRepository(session).get_by_id(season_id)
            assert status is not None and status.status == "completed"
        finally:
            await session.close()
            await session.bind.dispose()  # type: ignore[union-attr]
    finally:
        committed_db_cleanup(season_id, user_ids)


@pytest.mark.asyncio
async def test_event_processing_after_finalization_is_a_noop(
    db_session: AsyncSession,
    postgres_test_db: str,
    committed_db_cleanup: Callable[[uuid.UUID, list[uuid.UUID]], None],
) -> None:
    """Finalization vs event processing: once a season is completed, a late event for it
    must not resurrect membership/XP updates (no active season -> apply_event_delta no-ops
    and cannot touch the frozen outcomes)."""
    season_id = await _active_season(db_session)
    user_id = uuid.uuid4()
    try:
        # Seed membership + finalize the season.
        session = _new_session(postgres_test_db)
        try:
            season = await SeasonRepository(session).get_by_id(season_id)
            assert season is not None
            membership = await SeasonService(session).upsert_membership(
                user_id=user_id, season=season, tier_id="bronze"
            )
            membership.xp_this_season = 400
            await session.commit()
            outcome = await SeasonService(session).finalize_season(season_id)
            await session.commit()
            assert outcome["already_finalized"] is False
        finally:
            await session.close()
            await session.bind.dispose()  # type: ignore[union-attr]

        # A late worker event after finalization: apply_event_delta sees no active season.
        session = _new_session(postgres_test_db)
        try:
            season = await SeasonRepository(session).get_by_id(season_id)
            assert season is not None
            await SeasonService(session).apply_event_delta(
                user_id=user_id,
                xp_delta=100,
                occurred_at=NOW,
                redis=fakeredis.FakeAsyncRedis(),
            )
            await session.commit()
        finally:
            await session.close()
            await session.bind.dispose()  # type: ignore[union-attr]

        count, xp = await _membership_state(postgres_test_db, season_id, user_id)
        assert count == 1
        assert xp == 400, "completed-season membership/XP must stay frozen"
    finally:
        committed_db_cleanup(season_id, [user_id])
