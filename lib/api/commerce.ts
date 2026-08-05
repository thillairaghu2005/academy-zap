/**
 * Mock Commerce API.
 *
 * Mirrors the PaymentProvider Protocol (§4.1) and the payment lifecycle:
 *   create_checkout(cart) -> CheckoutSession
 *   verify_webhook(raw_payload, signature) -> PaymentEvent
 *
 * Discipline rules that carry over from the docs:
 *  - Hosted checkout embeds ONLY — no custom card-number input anywhere
 *    (PCI stays with Razorpay/Stripe; §2.2, §2.3 do-not-use).
 *  - Webhook delivery is idempotent by idempotency_key (§8.2) — a replayed
 *    webhook yields one payment.succeeded and one order, never double
 *    fulfillment. The client can only trigger/observe; it never fakes a
 *    payment success — the mock "webhook" does that, like the real one.
 *  - Entitlement reads are server-derived; gating UI never guesses.
 *
 * Mock rules (deterministic, demoable):
 *  - course id "course-boom"        → 503 on create_checkout (error state)
 *  - checkout id "cs-expired-demo"  → session already expired (expiry state)
 *  - checkout id "cs-fail-demo"     → provider declines at webhook (failed)
 */

import type {
  Cart,
  CartItem,
  CheckoutSession,
  EntitlementsSnapshot,
  Order,
  PaymentEvent,
  Subscription,
} from "@/lib/contracts/commerce";
import {
  cartForUser,
  createCheckoutSession,
  deliverWebhook,
  entitlementsForUser,
  getCatalogProduct as mockGetCatalogProduct,
  getCheckoutSession,
  getOrderByCheckoutId,
  MOCK_CATALOG,
  MOCK_DEMO_USER_ID,
  MOCK_PLANS,
  MOCK_SUBSCRIPTION,
  recomputeTotal,
  seedDemoCart,
  seedDemoSession,
} from "@/lib/mocks/commerce";
import { MockApiError } from "@/lib/api/errors";
import { delay, jitter } from "@/lib/api/helpers";

/* ------------------------------------------------------------------ */
/*  Cart                                                               */
/* ------------------------------------------------------------------ */

export async function getCart(userId: string): Promise<Cart> {
  await delay(jitter(160));
  if (userId === MOCK_DEMO_USER_ID) seedDemoCart();
  return cartForUser(userId);
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity = 1,
): Promise<Cart> {
  await delay(jitter(160));
  if (userId === MOCK_DEMO_USER_ID) seedDemoCart();
  const cart = cartForUser(userId);
  const product = MOCK_CATALOG.find((p) => p.product_id === productId);
  if (!product) {
    throw new MockApiError("product_not_found", "Unknown product.", 404);
  }
  const existing = cart.items.find((i) => i.product_id === productId);
  if (existing) existing.quantity += quantity;
  else
    cart.items.push({
      product_id: product.product_id,
      kind: product.kind,
      title: product.title,
      unit_price_cents: product.price_cents,
      quantity,
    } satisfies CartItem);
  cart.total_cents = recomputeTotal(cart.items);
  cart.updated_at = new Date().toISOString();
  return cart;
}

export async function removeFromCart(
  userId: string,
  productId: string,
): Promise<Cart> {
  await delay(jitter(140));
  const cart = cartForUser(userId);
  cart.items = cart.items.filter((i) => i.product_id !== productId);
  cart.total_cents = recomputeTotal(cart.items);
  cart.updated_at = new Date().toISOString();
  return cart;
}

/* ------------------------------------------------------------------ */
/*  Checkout — the Protocol surface                                    */
/* ------------------------------------------------------------------ */

/** create_checkout(cart) -> CheckoutSession (hosted embed URL). */
export async function createCheckout(userId: string): Promise<CheckoutSession> {
  await delay(jitter(300));
  if (userId === MOCK_DEMO_USER_ID) seedDemoCart();
  const cart = cartForUser(userId);
  if (cart.items.length === 0) {
    throw new MockApiError("cart_empty", "Add something to your cart first.", 400);
  }
  try {
    return createCheckoutSession(cart);
  } catch {
    throw new MockApiError(
      "checkout_down",
      "Payment provider unreachable (simulated).",
      503,
    );
  }
}

export async function getCheckout(
  checkoutId: string,
): Promise<CheckoutSession> {
  await delay(jitter(200));
  // Deterministic demo sessions are seeded on read so the UI can deep-link
  // into every payment lifecycle state (expired / declined / paid).
  if (
    checkoutId === "cs-expired-demo" ||
    checkoutId === "cs-fail-demo" ||
    checkoutId === "cs-paid-demo"
  ) {
    seedDemoSession(checkoutId);
  }
  const session = getCheckoutSession(checkoutId);
  if (!session) {
    throw new MockApiError("checkout_not_found", "Checkout session not found.", 404);
  }
  return session;
}

/**
 * Mock stand-in for the provider webhook. `deliver` is true when the user
 * clicks the hosted embed's "pay" — in mock mode that's the async hop that
 * produces the payment event, exactly like a real provider callback.
 */
export async function simulatePaymentCompletion(
  checkoutId: string,
): Promise<{ event: PaymentEvent | null; order: Order | null; duplicated: boolean }> {
  await delay(jitter(420));
  const session = getCheckoutSession(checkoutId);
  if (!session) {
    throw new MockApiError("checkout_not_found", "Checkout session not found.", 404);
  }
  if (session.status === "expired") {
    throw new MockApiError(
      "checkout_expired",
      "This checkout session expired. Create a new one.",
      410,
    );
  }
  return deliverWebhook(checkoutId, "succeeded");
}

/** Order read from the `orders` table by its checkout session. */
export async function getOrderForCheckout(
  checkoutId: string,
): Promise<Order | null> {
  await delay(jitter(120));
  return getOrderByCheckoutId(checkoutId);
}

/** Idempotency proof: replaying the same session's webhook is a no-op. */
export async function replayWebhook(checkoutId: string): Promise<{
  event: PaymentEvent | null;
  order: Order | null;
  duplicated: boolean;
}> {
  await delay(jitter(120));
  return deliverWebhook(checkoutId, "succeeded");
}

/* ------------------------------------------------------------------ */
/*  Entitlements (server-derived reads for gating UI)                  */
/* ------------------------------------------------------------------ */

export async function getEntitlements(
  userId: string,
): Promise<EntitlementsSnapshot> {
  await delay(jitter(180));
  if (userId === "boom") {
    throw new MockApiError("entitlements_down", "Entitlement service unreachable.", 503);
  }
  if (userId === "missing-user") {
    return { user_id: userId, entitlements: [], product_ids: [] };
  }
  return entitlementsForUser(userId);
}

/** Catalog lookup used by gating UI to price a locked course/lab. */
export async function getCatalogProduct(
  productId: string,
): Promise<typeof MOCK_CATALOG[number] | null> {
  await delay(jitter(60));
  return mockGetCatalogProduct(productId);
}

/** Single-product ownership check used by course/lab gating buttons. */
export async function hasEntitlement(
  userId: string,
  productId: string,
): Promise<boolean> {
  await delay(jitter(80));
  if (userId === "boom") {
    throw new MockApiError("entitlements_down", "Entitlement service unreachable.", 503);
  }
  const snap = entitlementsForUser(userId);
  return snap.product_ids.includes(productId);
}

/* ------------------------------------------------------------------ */
/*  Subscriptions / B2B seats (mock-only)                              */
/* ------------------------------------------------------------------ */

export async function getSubscription(userId: string): Promise<Subscription> {
  await delay(jitter(220));
  if (userId === "boom") {
    throw new MockApiError("subscription_down", "Subscription service unreachable.", 503);
  }
  if (userId === "missing-user") {
    throw new MockApiError("no_subscription", "No org subscription for this user.", 404);
  }
  return MOCK_SUBSCRIPTION;
}

export async function listPlans(): Promise<typeof MOCK_PLANS> {
  await delay(jitter(120));
  return MOCK_PLANS;
}
