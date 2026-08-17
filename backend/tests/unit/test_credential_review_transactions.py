"""B3 transaction tests — guarded transitions, concurrency, and atomic rollback.

These run at the repository layer against the real Postgres throwaway DB so the database's
own guarantees (guarded UPDATE, transaction rollback) are what's under test, not a mock.
"""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from gamification.integrity.ledger_hash import GENESIS_HASH, HashableEntry, compute_entry_hash
from gamification.models import Credential, CredentialStatusHistory, UserBadge
from gamification.repositories.badges import CredentialRepository
from gamification.repositories.ledger import LedgerRepository


@pytest_asyncio.fixture
async def seeded_flagged_credential(
    db_session: AsyncSession,
) -> tuple[AsyncSession, uuid.UUID, uuid.UUID, uuid.UUID]:
    """One flagged credential + the award row linking it, committed so other sessions see it."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()
    await LedgerRepository(db_session).append(
        user_id=user_id,
        event_id=uuid.uuid4(),
        xp_type="completion",
        xp_delta=100,
        reason_code="COURSE_COMPLETE",
    )
    await db_session.flush()
    entries = await LedgerRepository(db_session).list_for_user(user_id)
    entry = entries[0]
    entry.prev_hash = GENESIS_HASH
    entry.entry_hash = compute_entry_hash(
        GENESIS_HASH,
        HashableEntry(
            user_id=entry.user_id,
            xp_delta=entry.xp_delta,
            reason_code=entry.reason_code,
            created_at=entry.created_at,
        ),
    )
    credential_id = uuid.uuid4()
    db_session.add(
        Credential(
            id=credential_id,
            public_id="b3-txn-" + uuid.uuid4().hex,
            user_id=user_id,
            badge_id="first_course_completed",
            credential_type="badge",
            status="flagged",
            issuer="Zapsters",
            claim={"credentialSubject": {"id": str(user_id), "name": "First Course Completed"}},
            signature="signed",
            source_event_id=entry.event_id,
        )
    )
    db_session.add(
        UserBadge(
            id=uuid.uuid4(),
            user_id=user_id,
            badge_id="first_course_completed",
            source_event_id=entry.event_id,
            credential_id=credential_id,
            org_id=org_id,
        )
    )
    await db_session.commit()
    return db_session, user_id, credential_id, org_id


@pytest.mark.asyncio
async def test_guarded_transition_prevents_stale_overwrite(
    seeded_flagged_credential: tuple[AsyncSession, uuid.UUID, uuid.UUID, uuid.UUID],
) -> None:
    """A transition from a stale previous_status fails (returns None) instead of overwriting."""
    session, _user_id, credential_id, org_id = seeded_flagged_credential
    repo = CredentialRepository(session)

    # First transition succeeds.
    updated = await repo.transition_status(
        credential_id=credential_id,
        previous_status="flagged",
        new_status="verified",
        reviewer_id=uuid.uuid4(),
        org_id=org_id,
        reason="clear",
    )
    assert updated is not None and updated.status == "verified"
    await session.commit()

    # A second transition still assuming 'flagged' must fail.
    stale = await repo.transition_status(
        credential_id=credential_id,
        previous_status="flagged",
        new_status="revoked",
        reviewer_id=uuid.uuid4(),
        org_id=org_id,
        reason="stale",
    )
    assert stale is None
    await session.rollback()

    # Status is still the winner's 'verified'; exactly one history row exists.
    rows = (await session.execute(select(CredentialStatusHistory))).scalars().all()
    assert len(rows) == 1
    assert rows[0].new_status == "verified"


@pytest.mark.asyncio
async def test_concurrent_reviewers_produce_one_transition(
    postgres_test_db: str,
) -> None:
    """Two admins reviewing the same flagged credential at once: exactly one transition wins;
    the loser sees a stale guard and cannot create contradictory state or duplicate history.

    The credential is seeded through a dedicated engine connection (a REAL commit) so both
    racing connections can see it — the shared `db_session` fixture's SAVEPOINT isolation
    would hide it from other connections."""
    org_id = uuid.uuid4()
    credential_id = uuid.uuid4()
    user_id = uuid.uuid4()
    seed_engine = create_async_engine(postgres_test_db)
    seed_factory = async_sessionmaker(seed_engine, expire_on_commit=False)
    async with seed_factory() as session:
        session.add(
            Credential(
                id=credential_id,
                public_id="b3-concurrent-" + uuid.uuid4().hex,
                user_id=user_id,
                badge_id="first_course_completed",
                credential_type="badge",
                status="flagged",
                issuer="Zapsters",
                claim={"credentialSubject": {"id": str(user_id), "name": "First Course Completed"}},
                signature="signed",
                source_event_id=uuid.uuid4(),
            )
        )
        session.add(
            UserBadge(
                id=uuid.uuid4(),
                user_id=user_id,
                badge_id="first_course_completed",
                source_event_id=uuid.uuid4(),
                credential_id=credential_id,
                org_id=org_id,
            )
        )
        await session.commit()
    await seed_engine.dispose()

    async def _attempt(new_status: str) -> str:
        engine = create_async_engine(postgres_test_db)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            try:
                updated = await CredentialRepository(session).transition_status(
                    credential_id=credential_id,
                    previous_status="flagged",
                    new_status=new_status,
                    reviewer_id=uuid.uuid4(),
                    org_id=org_id,
                    reason=f"concurrent {new_status}",
                )
                if updated is None:
                    return "lost"
                await session.commit()
                return "won"
            finally:
                await engine.dispose()

    import asyncio

    results = await asyncio.gather(_attempt("verified"), _attempt("revoked"))

    assert sorted(results) == ["lost", "won"]

    # Verify final state: exactly one winner's status, exactly one history row.
    engine = create_async_engine(postgres_test_db)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        credential = (await session.execute(
            select(Credential).where(Credential.id == credential_id)
        )).scalar_one()
        history = (await session.execute(
            select(CredentialStatusHistory).where(
                CredentialStatusHistory.credential_id == credential_id
            )
        )).scalars().all()
        assert credential.status in {"verified", "revoked"}
        assert len(history) == 1
        assert history[0].new_status == credential.status
    await engine.dispose()


@pytest.mark.asyncio
async def test_history_insert_failure_rolls_back_status(
    seeded_flagged_credential: tuple[AsyncSession, uuid.UUID, uuid.UUID, uuid.UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """B3 atomicity: if the history insert fails, the status UPDATE must roll back too —
    status and audit history are one transaction."""
    session, _user_id, credential_id, org_id = seeded_flagged_credential
    repo = CredentialRepository(session)

    async def _exploding_flush() -> None:
        # Simulate a DB failure on the history write (e.g., constraint/connection error).
        raise RuntimeError("simulated database failure")

    monkeypatch.setattr(session, "flush", _exploding_flush)

    with pytest.raises(RuntimeError):
        await repo.transition_status(
            credential_id=credential_id,
            previous_status="flagged",
            new_status="verified",
            reviewer_id=uuid.uuid4(),
            org_id=org_id,
            reason="will not commit",
        )
    await session.rollback()
    monkeypatch.undo()

    # The status update was rolled back with the failed history insert.
    credential = (await session.execute(
        select(Credential).where(Credential.id == credential_id)
    )).scalar_one()
    assert credential.status == "flagged"
    history = (await session.execute(
        select(CredentialStatusHistory).where(
            CredentialStatusHistory.credential_id == credential_id
        )
    )).scalars().all()
    assert history == []
