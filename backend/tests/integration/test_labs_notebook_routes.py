"""Labs notebook engine (B6) route tier — real Postgres, fakeredis, real services.

Covers the notebook request path: catalog detail with the published manifest (slug + UUID),
progress creation/autosave, cell execution enqueue (202 + queued row — execution is NEVER
inline), checkpoints, and the completion gate (all code cells succeeded → outboxed
lab.session_completed event; idempotent replay; 409 until the gate passes). Security mirrors
the judge tier: notebook routes are authenticated, a tenant-owned lab is invisible to other
tenants (404), and execute is rate-limited per authenticated user.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from labs.models import (
    Lab,
    LabCell,
    LabCellExecution,
    LabObjective,
    LabSection,
    LabVersion,
    UserCheckpoint,
    UserLabProgress,
)
from platform_core.core.models.user import User
from platform_core.events.models import OutboxEvent
from tests.conftest import register_and_login

pytestmark = pytest.mark.asyncio

BASE = "/api/v1/labs"


async def _user_id(db_session: AsyncSession, email: str) -> uuid.UUID:
    return (
        await db_session.execute(select(User.id).where(User.email == email))
    ).scalar_one()


async def _seed_notebook_lab(
    db_session: AsyncSession,
    *,
    slug: str | None = None,
    code_cells: int = 1,
    org_id: uuid.UUID | None = None,
) -> tuple[uuid.UUID, uuid.UUID, list[uuid.UUID]]:
    """One lab with one published version (intro markdown + `code_cells` code cells)."""
    lab = Lab(
        id=uuid.uuid4(),
        slug=slug or f"notebook-{uuid.uuid4().hex[:8]}",
        title="Notebook lab",
        category="python",
        difficulty="beginner",
        org_id=org_id,
    )
    db_session.add(lab)
    await db_session.flush()
    db_session.add(
        LabObjective(
            id="run-code",
            lab_id=lab.id,
            title="Run the code",
            description="Run every code cell.",
            position=0,
        )
    )
    version = LabVersion(id=uuid.uuid4(), lab_id=lab.id, version=1, status="published")
    db_session.add(version)
    await db_session.flush()
    section = LabSection(id=uuid.uuid4(), version_id=version.id, title="Intro", position=0)
    db_session.add(section)
    await db_session.flush()
    cells = [
        LabCell(
            id=uuid.uuid4(),
            section_id=section.id,
            cell_type="markdown",
            content="# Intro",
            position=0,
        )
    ]
    for i in range(code_cells):
        cells.append(
            LabCell(
                id=uuid.uuid4(),
                section_id=section.id,
                cell_type="code",
                content=f"print({i})",
                position=i + 1,
            )
        )
    db_session.add_all(cells)
    await db_session.commit()
    code_ids = [cell.id for cell in cells if cell.cell_type == "code"]
    return lab.id, version.id, code_ids


async def _mark_cells_succeeded(
    db_session: AsyncSession, *, progress_id: uuid.UUID, cell_ids: list[uuid.UUID]
) -> None:
    for cell_id in cell_ids:
        db_session.add(
            LabCellExecution(
                id=uuid.uuid4(),
                progress_id=progress_id,
                cell_id=cell_id,
                user_id=(await db_session.execute(select(UserLabProgress.user_id).where(
                    UserLabProgress.id == progress_id
                ))).scalar_one(),
                org_id=None,
                source_code="print(1)",
                status="succeeded",
                stdout="1\n",
                exit_code=0,
            )
        )
    await db_session.commit()


# -- catalog detail with the notebook manifest --------------------------------------------


async def test_get_lab_by_slug_includes_published_notebook(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, version_id, code_ids = await _seed_notebook_lab(db_session, slug="slug-notebook-route")
    response = await client.get(f"{BASE}/slug-notebook-route")
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "slug-notebook-route"
    assert body["notebook"] is not None
    assert body["notebook"]["version"] == 1
    cells = body["notebook"]["sections"][0]["cells"]
    assert [c["cell_type"] for c in cells] == ["markdown", "code"]
    assert str(code_ids[0]) in {c["id"] for c in cells}


async def test_get_lab_by_uuid_includes_published_notebook(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, _ = await _seed_notebook_lab(db_session)
    response = await client.get(f"{BASE}/{lab_id}")
    assert response.status_code == 200
    assert response.json()["notebook"]["version"] == 1


async def test_highest_published_version_is_served_and_drafts_hidden(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Versioned-content invariant: published versions are immutable snapshots — the learner
    is always served the highest published version, and draft versions are never exposed."""
    lab_id, _, code_ids = await _seed_notebook_lab(db_session, slug="versioned-lab")

    version = await db_session.execute(
        select(LabVersion).where(LabVersion.lab_id == lab_id, LabVersion.version == 1)
    )
    version.scalar_one()
    v2 = LabVersion(id=uuid.uuid4(), lab_id=lab_id, version=2, status="published")
    draft = LabVersion(id=uuid.uuid4(), lab_id=lab_id, version=3, status="draft")
    db_session.add_all([v2, draft])
    await db_session.commit()

    response = await client.get(f"{BASE}/versioned-lab")
    assert response.status_code == 200
    assert response.json()["notebook"]["version"] == 2


async def test_lab_without_published_version_returns_null_notebook(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab = Lab(
        id=uuid.uuid4(),
        slug="terminal-only-lab",
        title="Terminal only",
        category="ctf",
        difficulty="beginner",
    )
    db_session.add(lab)
    await db_session.commit()

    response = await client.get(f"{BASE}/terminal-only-lab")
    assert response.status_code == 200
    assert response.json()["notebook"] is None


# -- progress + autosave ------------------------------------------------------------------


async def test_progress_created_on_first_read(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, _ = await _seed_notebook_lab(db_session)
    token = await register_and_login(client, "labs-progress@example.com")
    user_id = await _user_id(db_session, "labs-progress@example.com")

    response = await client.get(
        f"{BASE}/{lab_id}/progress", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "in_progress"
    assert body["user_id"] == str(user_id)
    assert body["lab_id"] == str(lab_id)
    assert body["version"] == 1
    assert body["outputs"] == {}
    assert body["hints_used"] == 0


async def test_save_progress_autosaves_and_reads_back(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, _ = await _seed_notebook_lab(db_session)
    token = await register_and_login(client, "labs-autosave@example.com")

    save = await client.put(
        f"{BASE}/{lab_id}/progress",
        json={"code": {"cell-1": "x = 1\nprint(x)"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert save.status_code == 200
    assert save.json()["progress_id"]

    read = await client.get(
        f"{BASE}/{lab_id}/progress", headers={"Authorization": f"Bearer {token}"}
    )
    assert read.status_code == 200
    assert read.json()["code"] == {"cell-1": "x = 1\nprint(x)"}


# -- execution ----------------------------------------------------------------------------


async def test_execute_cell_returns_202_and_queues_row(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, code_ids = await _seed_notebook_lab(db_session)
    token = await register_and_login(client, "labs-execute@example.com")

    response = await client.post(
        f"{BASE}/{lab_id}/cell/execute",
        json={"cell_id": str(code_ids[0]), "code": "print('hello')"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["cell_id"] == str(code_ids[0])
    assert body["status"] == "queued"

    row = (
        await db_session.execute(
            select(LabCellExecution).where(LabCellExecution.id == uuid.UUID(body["execution_id"]))
        )
    ).scalar_one()
    assert row.status == "queued"
    assert row.source_code == "print('hello')"
    assert row.stdout is None  # never executed inline


async def test_execute_cell_unknown_cell_is_404(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, _ = await _seed_notebook_lab(db_session)
    token = await register_and_login(client, "labs-execute-404@example.com")

    response = await client.post(
        f"{BASE}/{lab_id}/cell/execute",
        json={"cell_id": str(uuid.uuid4())},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


async def test_execute_cell_oversized_source_is_409(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, code_ids = await _seed_notebook_lab(db_session)
    token = await register_and_login(client, "labs-execute-size@example.com")

    response = await client.post(
        f"{BASE}/{lab_id}/cell/execute",
        json={"cell_id": str(code_ids[0]), "code": "x" * 70_000},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 409


# -- checkpoints --------------------------------------------------------------------------


async def test_checkpoint_snapshots_current_state(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, _ = await _seed_notebook_lab(db_session)
    token = await register_and_login(client, "labs-checkpoint@example.com")

    await client.put(
        f"{BASE}/{lab_id}/progress",
        json={"code": {"c1": "print(1)"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    response = await client.post(
        f"{BASE}/{lab_id}/checkpoint",
        json={"label": "before fix"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    checkpoint = (
        await db_session.execute(select(UserCheckpoint).order_by(UserCheckpoint.created_at.desc()))
    ).scalars().first()
    assert checkpoint is not None
    assert checkpoint.label == "before fix"
    assert checkpoint.snapshot["code"] == {"c1": "print(1)"}


# -- completion gate ----------------------------------------------------------------------


async def test_complete_gated_until_all_code_cells_succeed(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, code_ids = await _seed_notebook_lab(db_session, code_cells=2)
    token = await register_and_login(client, "labs-complete-gate@example.com")

    progress = await client.get(
        f"{BASE}/{lab_id}/progress", headers={"Authorization": f"Bearer {token}"}
    )
    progress_id = progress.json()["progress_id"]

    response = await client.post(
        f"{BASE}/{lab_id}/complete", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 409  # not all cells succeeded yet

    await _mark_cells_succeeded(db_session, progress_id=progress_id, cell_ids=code_ids)

    response = await client.post(
        f"{BASE}/{lab_id}/complete", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == progress_id
    assert sorted(body["objectives_completed"]) == sorted(str(c) for c in code_ids)

    # The completion event rides the outbox in the same transaction (F-12).
    events = (
        await db_session.execute(
            select(OutboxEvent).where(OutboxEvent.idempotency_key == f"lab:{progress_id}")
        )
    ).scalars().all()
    assert len(events) == 1
    assert events[0].event_type == "lab.session_completed"
    assert events[0].payload["lab_id"] == str(lab_id)


async def test_complete_is_idempotent_replay(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, code_ids = await _seed_notebook_lab(db_session)
    token = await register_and_login(client, "labs-complete-replay@example.com")

    progress = await client.get(
        f"{BASE}/{lab_id}/progress", headers={"Authorization": f"Bearer {token}"}
    )
    progress_id = progress.json()["progress_id"]
    await _mark_cells_succeeded(db_session, progress_id=progress_id, cell_ids=code_ids)

    first = await client.post(
        f"{BASE}/{lab_id}/complete", headers={"Authorization": f"Bearer {token}"}
    )
    assert first.status_code == 200
    second = await client.post(
        f"{BASE}/{lab_id}/complete", headers={"Authorization": f"Bearer {token}"}
    )
    assert second.status_code == 200
    assert second.json()["session_id"] == progress_id

    events = (
        await db_session.execute(
            select(OutboxEvent).where(OutboxEvent.idempotency_key == f"lab:{progress_id}")
        )
    ).scalars().all()
    assert len(events) == 1  # replayed, never double-emitted


# -- authn / authz ------------------------------------------------------------------------


async def test_notebook_routes_require_auth(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, _ = await _seed_notebook_lab(db_session)
    assert (
        await client.get(f"{BASE}/{lab_id}/progress")
    ).status_code == 401
    assert (
        await client.put(f"{BASE}/{lab_id}/progress", json={"code": {}})
    ).status_code == 401
    assert (
        await client.post(
            f"{BASE}/{lab_id}/cell/execute", json={"cell_id": str(uuid.uuid4())}
        )
    ).status_code == 401
    assert (
        await client.post(f"{BASE}/{lab_id}/checkpoint", json={})
    ).status_code == 401
    assert (
        await client.post(f"{BASE}/{lab_id}/complete")
    ).status_code == 401


async def test_tenant_owned_lab_is_invisible_to_other_org(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    tenant_a = uuid.uuid4()
    lab_id, version_id, _ = await _seed_notebook_lab(
        db_session, slug="tenant-a-lab", org_id=tenant_a
    )
    token_b = await register_and_login(client, "labs-tenant-b@example.com")

    response = await client.get(
        f"{BASE}/tenant-a-lab/progress", headers={"Authorization": f"Bearer {token_b}"}
    )
    assert response.status_code == 404


async def test_execute_is_rate_limited_per_user(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    lab_id, version_id, code_ids = await _seed_notebook_lab(db_session)
    token = await register_and_login(client, "labs-rate-limit@example.com")

    quota = 20
    statuses = []
    for _ in range(quota + 1):
        response = await client.post(
            f"{BASE}/{lab_id}/cell/execute",
            json={"cell_id": str(code_ids[0]), "code": "print(1)"},
            headers={"Authorization": f"Bearer {token}"},
        )
        statuses.append(response.status_code)

    assert statuses.count(202) == quota
    assert statuses[-1] == 429