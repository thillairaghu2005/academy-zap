"""Slice 09 security tier — leagues + seasons (Phase 12, Phase 20).

Attackers can never: create/activate/finalize seasons without admin RBAC, spoof a score,
season_id, user_id, or tier from the request, promote/demote themselves (no such
endpoint exists), or read another user's league membership. The league board is a
server-owned projection over the authoritative ledger.
"""

import uuid

import fakeredis
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_no_client_mutation_endpoints_exist(client: AsyncClient) -> None:
    """There is no POST /promote, /demote, or /set-score — those are server-side outcomes
    of season finalization only."""
    for path in (
        "/api/v1/me/league/promote",
        "/api/v1/me/league/demote",
        "/api/v1/me/league/set-score",
        "/api/v1/seasons/current/promote",
    ):
        for method in ("post", "put", "patch", "delete"):
            response = await getattr(client, method)(path)
            # The route does not exist — 404 (or 405 if the framework surfaces it as
            # method-not-allowed). The property that matters: nothing is awarded or
            # promoted by any client-visible mutation path.
            assert response.status_code in (404, 405), f"{method.upper()} {path}"


@pytest.mark.asyncio
async def test_season_management_requires_admin(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Anonymous and normal users cannot create/activate/finalize seasons."""
    body = {
        "name": "Sneaky Season",
        "start_at": "2026-01-01T00:00:00+00:00",
        "end_at": "2026-02-01T00:00:00+00:00",
    }
    # Anonymous -> 401.
    assert (await client.post("/api/v1/admin/seasons", json=body)).status_code == 401
    assert (
        await client.post(f"/api/v1/admin/seasons/{uuid.uuid4()}/activate")
    ).status_code == 401

    # Normal user -> 403.
    token = await register_and_login(client, "league-sec-user@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.post("/api/v1/admin/seasons", json=body, headers=headers)
    assert response.status_code == 403
    assert (
        await client.post(
            f"/api/v1/admin/seasons/{uuid.uuid4()}/activate", headers=headers
        )
    ).status_code == 403
    assert (
        await client.post(
            f"/api/v1/admin/seasons/{uuid.uuid4()}/finalize", headers=headers
        )
    ).status_code == 403


@pytest.mark.asyncio
async def test_client_cannot_spoof_score_or_identity(
    client: AsyncClient, redis: fakeredis.FakeAsyncRedis
) -> None:
    """Query params for user_id/score/tier are ignored — the league read model is
    server-derived from the token + authoritative ledger, never from the request."""
    token = await register_and_login(client, "league-sec-spoof@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # No active season -> /me/league returns None regardless of spoofed params.
    spoofed = await client.get(
        "/api/v1/me/league",
        params={
            "user_id": str(uuid.uuid4()),
            "score": "999999",
            "tier": "obsidian",
        },
        headers=headers,
    )
    assert spoofed.status_code == 200
    assert spoofed.json() is None

    # No active season -> league leaderboard is a clean 404, not a leak of other tiers.
    board = await client.get(
        "/api/v1/me/league/leaderboard",
        params={"tier": "obsidian", "user_id": str(uuid.uuid4())},
        headers=headers,
    )
    assert board.status_code == 404


@pytest.mark.asyncio
async def test_league_board_exposes_only_intended_fields(
    client: AsyncClient, db_session: AsyncSession, redis: fakeredis.FakeAsyncRedis
) -> None:
    """The board read model contains no private data — only rank, display name, and the
    server-derived season XP."""
    from gamification.projections.leagues import LeagueProjection

    await LeagueProjection(redis).update_member(
        season_id="s1",
        tier_id="bronze",
        user_id="11111111-1111-4111-8111-111111111111",
        xp_this_season=500,
        display_name="Board Viewer",
    )

    page = await LeagueProjection(redis).page(
        season_id="s1", tier_id="bronze", offset=0, limit=10
    )
    entry = page["entries"][0]
    assert set(entry.keys()) == {
        "rank",
        "user_id",
        "display_name",
        "avatar_url",
        "xp_this_season",
        "is_me",
    }
    assert entry["xp_this_season"] == 500
