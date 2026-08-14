"""Commerce / Payments contracts (platform §2.2, §4.1, §8.2, §8.3) — mirrors
`lib/contracts/commerce.ts`. Hosted-checkout/tokenized only (Razorpay + Stripe) — no card data
ever touches these servers; that is a PCI-scope decision, not a UX one.

Note: the source `.ts` file names both a type alias `PaymentProvider` ("razorpay" | "stripe")
*and* the platform doc's `PaymentProvider` Protocol class — a collision only avoidable in Python
by renaming the literal. The literal is one of the frontend's own logged "not locked by the
docs" decisions, so it is renamed here to `PaymentProviderName`; the Protocol class keeps the
doc's exact locked name.
"""

from datetime import datetime
from typing import Literal, Protocol
from uuid import UUID

from pydantic import BaseModel

PaymentProviderName = Literal["razorpay", "stripe"]
CheckoutSessionStatus = Literal["pending", "paid", "failed", "expired"]
ProductKind = Literal["course", "lab"]
CartItemKind = Literal["course", "lab", "subscription"]


class CatalogProduct(BaseModel):
    product_id: UUID
    kind: ProductKind
    title: str
    price_cents: int
    stock: int


class CartItem(BaseModel):
    product_id: UUID
    kind: CartItemKind
    title: str
    unit_price_cents: int
    quantity: int


class Cart(BaseModel):
    cart_id: UUID
    user_id: UUID
    items: list[CartItem]
    total_cents: int
    updated_at: datetime


class CheckoutSession(BaseModel):
    """Provider-shaped so the swap to real hosted-checkout embeds is field-identical."""

    checkout_id: UUID
    provider: PaymentProviderName
    status: CheckoutSessionStatus
    checkout_url: str
    cart: Cart
    amount_cents: int
    currency: str
    idempotency_key: str
    created_at: datetime
    expires_at: datetime


class PaymentEvent(BaseModel):
    """Mirrors `PaymentProvider.verify_webhook`'s typed result."""

    event_type: Literal["payment.succeeded", "payment.failed", "payment.refunded"]
    checkout_id: UUID
    order_id: UUID
    amount_cents: int
    currency: str
    provider: PaymentProviderName
    idempotency_key: str
    occurred_at: datetime


class Order(BaseModel):
    order_id: UUID
    user_id: UUID
    checkout_id: UUID
    provider: PaymentProviderName
    amount_cents: int
    currency: str
    status: Literal["paid", "failed", "refunded"]
    items: list[CartItem]
    created_at: datetime
    idempotency_key: str


class Entitlement(BaseModel):
    product_id: UUID
    kind: CartItemKind
    order_id: UUID | None
    granted_at: datetime
    active: bool


class EntitlementsSnapshot(BaseModel):
    user_id: UUID
    entitlements: list[Entitlement]
    product_ids: list[UUID]


class PaymentProvider(Protocol):
    """Platform §4.1 — locked verbatim."""

    async def create_checkout(self, cart: Cart) -> CheckoutSession: ...

    async def verify_webhook(self, raw_payload: bytes, signature: str) -> PaymentEvent: ...
