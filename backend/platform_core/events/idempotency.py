"""Idempotency check/record — redelivery of the same event to the same consumer is a no-op."""

from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from platform_core.events.models import ProcessedEvent


class IdempotencyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def try_mark_processed(
        self,
        *,
        idempotency_key: str,
        consumer_group: str,
        event_type: str,
        raw_event: dict[str, Any] | None = None,
    ) -> bool:
        """Returns True if this call is the first to mark the key processed (caller should
        proceed), False if it was already processed (caller should skip — a no-op redelivery).

        Uses `ON CONFLICT DO NOTHING ... RETURNING` so the check-and-mark is a single atomic
        statement — no TOCTOU race between a SELECT and a subsequent INSERT under concurrent
        delivery. A row comes back only when this call was the one that actually inserted it.
        """
        stmt = (
            pg_insert(ProcessedEvent)
            .values(
                idempotency_key=idempotency_key,
                consumer_group=consumer_group,
                event_type=event_type,
                raw_event=raw_event or {},
            )
            .on_conflict_do_nothing(
                index_elements=[ProcessedEvent.idempotency_key, ProcessedEvent.consumer_group]
            )
            .returning(ProcessedEvent.idempotency_key)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None
