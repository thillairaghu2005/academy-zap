/**
 * Commerce / Payments contracts (platform doc §2.2, §4.1, §8.2, §8.3).
 *
 * Locked by the docs:
 *  - PaymentProvider Protocol (§4.1):
 *      create_checkout(cart: Cart) -> CheckoutSession
 *      verify_webhook(raw_payload: bytes, signature: str) -> PaymentEvent
 *  - Payments are **Razorpay (India, primary) + Stripe (international)**,
 *    hosted-checkout/tokenized only (§2.2) — NEVER a custom card-number
 *    input (that's a PCI-scope decision, not a UX one; §2.3 do-not-use).
 *  - `payment.succeeded` is a first-class bus event (§2.1/§3).
 *  - Webhook idempotency: replay a valid webhook twice, assert only one
 *    payment.succeeded and no double-fulfillment (§8.2/§8.3).
 *  - Tables: `orders`, `subscriptions`, `invoices` (§4.2) — tightest RBAC.
 *
 * NOT locked by the docs (reasonable decisions, logged in index.ts):
 *  - Cart / CheckoutSession / PaymentEvent field lists (the tables are
 *    referenced, not schematized). CheckoutSession mirrors the real
 *    provider-shaped checkout object (id, provider, status, hosted embed
 *    URL) so the swap to Razorpay/Stripe sandbox embeds is field-identical.
 *  - Entitlement / Subscription shapes are the frontend's read of
 *    `orders` / `subscriptions` for the gating + seat-management UI.
 *  - PaymentEvent event_type literal: "payment.succeeded" is the only one
 *    the docs name; "payment.failed" / "payment.refunded" are reasonable
 *    additions for the all-states requirement.
 */

export type PaymentProvider = "razorpay" | "stripe";

/** Purchasable product (course or lab pass) as listed in the catalog. */
export interface CatalogProduct {
  product_id: string;
  kind: "course" | "lab";
  title: string;
  price_cents: number;
  /** Mock inventory — Buy Now validates this before checkout. */
  stock: number;
}

export interface CartItem {
  /** Product id (course id / lab id / plan id). */
  product_id: string;
  kind: "course" | "lab" | "subscription";
  title: string;
  /** Unit price in minor units (cents / paise). */
  unit_price_cents: number;
  quantity: number;
}

export interface Cart {
  cart_id: string;
  user_id: string;
  items: CartItem[];
  total_cents: number;
  updated_at: string;
}

export type CheckoutSessionStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired";

/**
 * The object `create_checkout` returns — provider-shaped so the later swap
 * to real Razorpay/Stripe hosted-checkout embeds is field-identical.
 */
export interface CheckoutSession {
  checkout_id: string;
  provider: PaymentProvider;
  status: CheckoutSessionStatus;
  /** Hosted checkout embed URL (sandbox/test mode in mock). */
  checkout_url: string;
  cart: Cart;
  amount_cents: number;
  currency: string;
  /** Payment-method-independent: idempotency key guards double-charging. */
  idempotency_key: string;
  created_at: string;
  expires_at: string;
}

/** Mirrors PaymentProvider.verify_webhook's typed result. */
export interface PaymentEvent {
  event_type: "payment.succeeded" | "payment.failed" | "payment.refunded";
  checkout_id: string;
  order_id: string;
  amount_cents: number;
  currency: string;
  provider: PaymentProvider;
  /** Idempotency — a replayed webhook with the same key is a no-op. */
  idempotency_key: string;
  occurred_at: string;
}

export interface Order {
  order_id: string;
  user_id: string;
  checkout_id: string;
  provider: PaymentProvider;
  amount_cents: number;
  currency: string;
  status: "paid" | "failed" | "refunded";
  items: CartItem[];
  created_at: string;
  /** Only one payment.succeeded ever fires per idempotency_key. */
  idempotency_key: string;
}

/** What the user actually owns — the entitlement read for gating UI. */
export interface Entitlement {
  product_id: string;
  kind: "course" | "lab" | "subscription";
  /** order_id that granted it (or null for granted-by-subscription). */
  order_id: string | null;
  granted_at: string;
  /** True if currently in effect (subscription active, order not refunded). */
  active: boolean;
}

export interface EntitlementsSnapshot {
  user_id: string;
  entitlements: Entitlement[];
  /** Convenience value derived by the demo service (the client never computes this). */
  product_ids: string[];
}

/** B2B subscription + seat management (frontend demo read model). */
export type SeatStatus = "invited" | "active" | "suspended";

export interface Plan {
  plan_id: string;
  name: string;
  /** Per-seat monthly price in minor units. */
  price_per_seat_cents: number;
  currency: string;
  billing_cycle: "monthly" | "annual";
}

export interface Seat {
  seat_id: string;
  email: string;
  display_name: string;
  status: SeatStatus;
  /** Seat's current course assignment, if any. */
  assigned_course_id: string | null;
}

export interface Subscription {
  subscription_id: string;
  org_name: string;
  plan: Plan;
  seats: Seat[];
  active: boolean;
  /** Next invoice amount (minor units). */
  next_invoice_cents: number;
  renews_at: string;
}
