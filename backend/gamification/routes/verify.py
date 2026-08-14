"""Public credential verify page — 501 stub. `integrity/credentials.py` (Ed25519-signed W3C
Verifiable Credentials) is out of scope this round — see build.md B4.
"""

from fastapi import APIRouter

from platform_core.core.exceptions import NotImplementedFoundationError

router = APIRouter(tags=["gamification"])


@router.get("/verify/{credential_id}")
async def verify_credential(credential_id: str) -> None:
    # Intentionally no auth guard (SOP §8.1): this is meant to be a public, unauthenticated
    # verify page even once implemented — see gamification §7.3.
    raise NotImplementedFoundationError("gamification", see="ZAPSTERS_GAMIFICATION_ENGINE.md §7.3")
