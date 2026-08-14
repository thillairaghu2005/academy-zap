"""Unified search — 501 stub. No owned tables; needs the Meilisearch indexing pipeline
(build.md B9), not built this round.
"""

from fastapi import APIRouter, Query

from platform_core.contracts.content import MeilisearchCatalogResponse
from platform_core.core.exceptions import NotImplementedFoundationError

router = APIRouter(tags=["search"])


@router.get("/search", response_model=MeilisearchCatalogResponse)
async def search(q: str = Query(default="")) -> MeilisearchCatalogResponse:
    raise NotImplementedFoundationError("search", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §2.2")
