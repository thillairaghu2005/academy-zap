"""Cart/checkout/webhooks — 501 stubs (build.md B8). Entitlement service, hosted-checkout
integration, and signature-verified webhooks don't exist yet this round.
"""

from fastapi import APIRouter, Request

from platform_core.contracts.payments import Cart, CheckoutSession
from platform_core.core.deps import CurrentUser
from platform_core.core.exceptions import NotImplementedFoundationError

router = APIRouter(tags=["commerce"])


@router.post("/cart", response_model=Cart)
async def upsert_cart(_current_user: CurrentUser) -> Cart:
    raise NotImplementedFoundationError("commerce", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §7")


@router.post("/checkout", response_model=CheckoutSession)
async def create_checkout(_current_user: CurrentUser) -> CheckoutSession:
    raise NotImplementedFoundationError("commerce", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §7")


@router.post("/webhooks/{provider}", status_code=200)
async def webhook(provider: str, _request: Request) -> None:
    # Intentionally no CurrentUser guard (SOP §8.1): a payment provider calls this directly.
    # Real auth is the webhook signature (verify_webhook), not a session — not built this round.
    raise NotImplementedFoundationError("commerce", see="ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md §7")
