/**
 * Mock Commerce layer — cart, checkout sessions, payment lifecycle,
 * entitlements, subscriptions.
 *
 * Mirrors the PaymentProvider Protocol (§4.1) and the payment lifecycle
 * (§8.2/§8.3): create_checkout returns a provider-shaped CheckoutSession
 * with a HOSTED embed URL (never a custom card form — PCI stays with the
 * providers), and a webhook delivery (`simulateWebhook`) is idempotent by
 * idempotency_key — replaying it twice produces exactly one
 * payment.succeeded event and one order, no double-fulfillment.
 *
 * Demo hooks (deterministic, demoable):
 *  - plan id "pl-boom"            → 503 on create_checkout (error state)
 *  - checkout id "cs-expired-demo" → expired session (expiry state)
 *  - checkout id "cs-fail-demo"    → provider declines on webhook (failed state)
 */

import type {
  Cart,
  CartItem,
  CatalogProduct,
  CheckoutSession,
  Entitlement,
  EntitlementsSnapshot,
  Order,
  PaymentEvent,
  PaymentProvider,
  Plan,
  Seat,
  Subscription,
} from "@/lib/contracts/commerce";

export const MOCK_DEMO_USER_ID = "4c1e0a9f-8c6e-4b2d-9f3a-2b8d1e5c7a91";

/* ------------------------------------------------------------------ */
/*  Catalog — courses/labs/plans that can be purchased                 */
/* ------------------------------------------------------------------ */

// CatalogProduct is defined in the contract layer (lib/contracts/commerce.ts)
// — it is a shared entity, not a mock-only shape.

/**
 * Catalog — the purchasable subset of the real Content catalog. product_ids
 * are the ACTUAL course/lab ids from lib/mocks/courses.ts / labs.ts so the
 * entitlement gate and checkout resolve against the real products.
 */
// Stock values are mock inventory so Buy Now can validate before checkout.
// "Offensive Web App Testing" has stock 0 → the out-of-stock demo path;
// "Race the Clock" has stock 3 → the low-stock display path.
export const MOCK_CATALOG: CatalogProduct[] = [
  { product_id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", kind: "course", title: "Offensive Web App Testing", price_cents: 149900, stock: 0 },
  { product_id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", kind: "course", title: "React & TypeScript Deep Dive", price_cents: 99900, stock: 25 },
  { product_id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b", kind: "course", title: "Cloud Security Essentials", price_cents: 129900, stock: 25 },
  { product_id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", kind: "course", title: "Data Structures & Algorithms in Go", price_cents: 89900, stock: 25 },
  { product_id: "lab-race-the-clock", kind: "lab", title: "Race the Clock (lab pass)", price_cents: 1200, stock: 3 },
  // Hidden demo product — only added to the cart via the "simulate provider
  // outage" demo, so the checkout 503 state is reachable on demand.
  { product_id: "course-boom", kind: "course", title: "Simulated outage product", price_cents: 4900, stock: 1 },
];

export function getCatalogProduct(productId: string): CatalogProduct | null {
  return MOCK_CATALOG.find((p) => p.product_id === productId) ?? null;
}

export const MOCK_PLANS: Plan[] = [
  {
    plan_id: "pl-team",
    name: "Team",
    price_per_seat_cents: 2500,
    currency: "usd",
    billing_cycle: "monthly",
  },
  {
    plan_id: "pl-org",
    name: "Organization",
    price_per_seat_cents: 2100,
    currency: "usd",
    billing_cycle: "annual",
  },
];

/* ------------------------------------------------------------------ */
/*  Stores                                                             */
/* ------------------------------------------------------------------ */

export const mockCarts = new Map<string, Cart>();
export const mockCheckoutSessions = new Map<string, CheckoutSession>();
export const mockOrders = new Map<string, Order>();
/** Entitlements are isolated by user first, then product. */
export const mockEntitlements = new Map<string, Map<string, Entitlement>>();

function entitlementsForStoredUser(userId: string): Map<string, Entitlement> {
  let entitlements = mockEntitlements.get(userId);
  if (!entitlements) {
    entitlements = new Map<string, Entitlement>();
    mockEntitlements.set(userId, entitlements);
  }
  return entitlements;
}

/* ------------------------------------------------------------------ */
/*  Cart persistence (Task 2)                                          */
/*                                                                    */
/*  The mock cart store is in-memory, but the demo user's cart is      */
/*  hydrated from / written to localStorage so the nav badge and the   */
/*  cart survive a full page refresh — mirroring the real Commerce     */
/*  backend's cart persistence. Guarded for SSR and node (tests).      */
/* ------------------------------------------------------------------ */

const CART_STORAGE_KEY = "zapsters.mock.cart";

function loadPersistedCart(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      user_id: string;
      items: CartItem[];
    };
    if (!parsed || !Array.isArray(parsed.items)) return;
    const cart = cartForUser(parsed.user_id || MOCK_DEMO_USER_ID);
    cart.items = parsed.items;
    cart.total_cents = recomputeTotal(cart.items);
    cart.updated_at = new Date().toISOString();
  } catch {
    // Corrupt storage is ignored — the in-memory store stands in.
  }
}

export function persistCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ user_id: cart.user_id, items: cart.items }),
    );
  } catch {
    // Storage may be unavailable (private mode) — mock keeps working.
  }
}

loadPersistedCart();

export function cartForUser(userId: string): Cart {
  let cart = mockCarts.get(userId);
  if (!cart) {
    cart = {
      cart_id: `cart-${userId.slice(0, 8)}`,
      user_id: userId,
      items: [],
      total_cents: 0,
      updated_at: new Date().toISOString(),
    };
    mockCarts.set(userId, cart);
  }
  if (cart.user_id === MOCK_DEMO_USER_ID) persistCart(cart);
  return cart;
}

export function recomputeTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
}

/**
 * Seed the demo user's cart exactly ONCE per browser session. A per-session
 * guard (rather than "seed when empty") is deliberate: after the user removes
 * items or completes a purchase, the cart stays empty so the empty state is
 * actually reachable — it doesn't silently refill on the next query.
 */
export const demoCartSeeded = new Set<string>();

export function seedDemoCart(): Cart {
  const cart = cartForUser(MOCK_DEMO_USER_ID);
  if (!demoCartSeeded.has(MOCK_DEMO_USER_ID)) {
    demoCartSeeded.add(MOCK_DEMO_USER_ID);
    // Cloud Security Essentials — a real paid course, so the checkout demo
    // is the real product flow.
    const cloud = getCatalogProduct("e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b")!;
    cart.items.push({
      product_id: cloud.product_id,
      kind: cloud.kind,
      title: cloud.title,
      unit_price_cents: cloud.price_cents,
      quantity: 1,
    });
    cart.total_cents = recomputeTotal(cart.items);
    cart.updated_at = new Date().toISOString();
    persistCart(cart);
  }
  return cart;
}

/* ------------------------------------------------------------------ */
/*  create_checkout — the PaymentProvider Protocol method              */
/* ------------------------------------------------------------------ */

function uuid(): string {
  return globalThis.crypto.randomUUID();
}

export function createCheckoutSession(cart: Cart): CheckoutSession {
  if (cart.items.some((i) => i.product_id === "course-boom")) {
    const err = new Error("checkout_down") as Error & { code?: string };
    err.code = "checkout_down";
    throw err;
  }
  const id = `cs-${uuid()}`;
  const now = new Date();
  // SNAPSHOT the cart at creation — the session must be immune to later
  // edits of the live user cart (removes, new items) until it resolves.
  const snapshot: Cart = { ...cart, items: cart.items.map((i) => ({ ...i })) };
  const session: CheckoutSession = {
    checkout_id: id,
    provider: "razorpay" as PaymentProvider,
    status: "pending",
    // Hosted checkout embed — provider-hosted, never our own card form.
    checkout_url: `/checkout/embed/${id}`,
    cart: snapshot,
    amount_cents: snapshot.total_cents,
    currency: "usd",
    idempotency_key: `idem-${uuid()}`,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 30 * 60_000).toISOString(),
  };
  mockCheckoutSessions.set(id, session);
  return session;
}

export function getCheckoutSession(
  checkoutId: string,
): CheckoutSession | null {
  return mockCheckoutSessions.get(checkoutId) ?? null;
}

export function getOrderByCheckoutId(
  checkoutId: string,
): Order | null {
  for (const order of mockOrders.values()) {
    if (order.checkout_id === checkoutId) return order;
  }
  return null;
}

/**
 * Demo sessions with deterministic ids, so the checkout page can deep-link
 * into every payment lifecycle state: `cs-expired-demo` (expired),
 * `cs-fail-demo` (declined) and `cs-paid-demo` (already paid, pre-fulfilled
 * with an order + entitlements so the success panel and the webhook-replay
 * idempotency demo are reachable on refresh).
 */
export function seedDemoSession(
  id: "cs-expired-demo" | "cs-fail-demo" | "cs-paid-demo",
): CheckoutSession {
  const existing = mockCheckoutSessions.get(id);
  if (existing) return existing;
  const now = Date.now();
  const expired = id === "cs-expired-demo";
  const paid = id === "cs-paid-demo";
  if (paid) seedDemoCart();
  // Snapshot so the session is immune to later edits of the live cart.
  const liveCart = cartForUser(MOCK_DEMO_USER_ID);
  const snapshot: Cart = {
    ...liveCart,
    items: liveCart.items.map((i) => ({ ...i })),
  };
  const session: CheckoutSession = {
    checkout_id: id,
    provider: "razorpay",
    status: expired ? "expired" : paid ? "paid" : "pending",
    checkout_url: `/checkout/embed/${id}`,
    cart: snapshot,
    amount_cents: snapshot.total_cents,
    currency: "usd",
    idempotency_key: `idem-${id}`,
    created_at: new Date(now - 45 * 60_000).toISOString(),
    expires_at: expired
      ? new Date(now - 15 * 60_000).toISOString()
      : new Date(now + 15 * 60_000).toISOString(),
  };
  mockCheckoutSessions.set(id, session);

  if (paid) {
    // Pre-grant fulfillment: one paid order + entitlements for the cart
    // items, so the success panel and a replay (idempotency hit) work.
    const order: Order = {
      order_id: "ord-demo-paid",
      user_id: MOCK_DEMO_USER_ID,
      checkout_id: id,
      provider: "razorpay",
      amount_cents: session.amount_cents,
      currency: "usd",
      status: "paid",
      items: snapshot.items,
      created_at: session.created_at,
      idempotency_key: session.idempotency_key,
    };
    mockOrders.set(order.order_id, order);
    const entitlements = entitlementsForStoredUser(MOCK_DEMO_USER_ID);
    for (const item of snapshot.items) {
      entitlements.set(item.product_id, {
        product_id: item.product_id,
        kind: item.kind,
        order_id: order.order_id,
        granted_at: session.created_at,
        active: true,
      });
    }
  }
  return session;
}

/* ------------------------------------------------------------------ */
/*  verify_webhook — idempotent by idempotency_key (§8.2/§8.3)         */
/* ------------------------------------------------------------------ */

export interface WebhookDeliveryResult {
  /** Exactly one success per idempotency_key — replays are no-ops. */
  event: PaymentEvent | null;
  order: Order | null;
  duplicated: boolean;
}

export function deliverWebhook(
  checkoutId: string,
  outcome: "succeeded" | "failed" = "succeeded",
): WebhookDeliveryResult {
  const session = mockCheckoutSessions.get(checkoutId);
  if (!session) {
    const err = new Error("checkout_not_found") as Error & { code?: string };
    err.code = "checkout_not_found";
    throw err;
  }
  if (session.status === "expired") {
    const err = new Error("checkout_expired") as Error & { code?: string };
    err.code = "checkout_expired";
    throw err;
  }

  // Idempotency: an existing order for this idempotency key is a replay.
  const existing = [...mockOrders.values()].find(
    (o) => o.idempotency_key === session.idempotency_key,
  );
  if (existing) {
    return { event: null, order: existing, duplicated: true };
  }

  const isFailure = checkoutId === "cs-fail-demo" || outcome === "failed";
  const now = new Date().toISOString();
  const orderId = `ord-${uuid()}`;

  const order: Order = {
    order_id: orderId,
    user_id: session.cart.user_id,
    checkout_id: checkoutId,
    provider: session.provider,
    amount_cents: session.amount_cents,
    currency: session.currency,
    status: isFailure ? "failed" : "paid",
    items: session.cart.items,
    created_at: now,
    idempotency_key: session.idempotency_key,
  };
  mockOrders.set(orderId, order);

  const event: PaymentEvent = {
    event_type: isFailure ? "payment.failed" : "payment.succeeded",
    checkout_id: checkoutId,
    order_id: orderId,
    amount_cents: session.amount_cents,
    currency: session.currency,
    provider: session.provider,
    idempotency_key: session.idempotency_key,
    occurred_at: now,
  };

  if (!isFailure) {
    // Fulfillment: grant entitlements exactly once, then clear the purchased
    // items from the user's cart (real checkout behavior).
    const entitlements = entitlementsForStoredUser(session.cart.user_id);
    for (const item of session.cart.items) {
      entitlements.set(item.product_id, {
        product_id: item.product_id,
        kind: item.kind,
        order_id: orderId,
        granted_at: now,
        active: true,
      });
    }
    const cart = cartForUser(session.cart.user_id);
    const purchased = new Set(session.cart.items.map((i) => i.product_id));
    cart.items = cart.items.filter((i) => !purchased.has(i.product_id));
    cart.total_cents = recomputeTotal(cart.items);
    cart.updated_at = now;
  }

  session.status = isFailure ? "failed" : "paid";
  return { event, order, duplicated: false };
}

/* ------------------------------------------------------------------ */
/*  Entitlement reads (server-derived — the client never guesses)      */
/* ------------------------------------------------------------------ */

export function entitlementsForUser(userId: string): EntitlementsSnapshot {
  // Seeded with REAL product ids: the demo user owns two paid courses from
  // earlier orders, so the gating UI demos both the owned and unowned states.
  const seeded = [
    { product_id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", kind: "course", order_id: "ord-seed-1", granted_at: new Date(Date.now() - 12 * 86400_000).toISOString(), active: true },
    { product_id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", kind: "course", order_id: "ord-seed-2", granted_at: new Date(Date.now() - 3 * 86400_000).toISOString(), active: true },
  ] as Entitlement[];
  const fromOrders = [
    ...(mockEntitlements.get(userId)?.values() ?? []),
  ];
  const seededForDemo = userId === MOCK_DEMO_USER_ID ? seeded : [];
  const all = [...seededForDemo, ...fromOrders];
  return {
    user_id: userId,
    entitlements: all,
    product_ids: all.map((e) => e.product_id),
  };
}

/* ------------------------------------------------------------------ */
/*  Admin order fixtures — a few realistic rows for the Orders screen   */
/* ------------------------------------------------------------------ */

function seedOrder(
  id: string,
  userId: string,
  amountCents: number,
  status: Order["status"],
  productTitle: string,
  daysAgo: number,
  provider: PaymentProvider = "razorpay",
): void {
  mockOrders.set(id, {
    order_id: id,
    user_id: userId,
    checkout_id: `cs-${id.replace("ord-", "")}`,
    provider,
    amount_cents: amountCents,
    currency: "usd",
    status,
    items: [
      {
        product_id: "seed",
        kind: "course",
        title: productTitle,
        unit_price_cents: amountCents,
        quantity: 1,
      },
    ],
    created_at: new Date(Date.now() - daysAgo * 86400_000).toISOString(),
    idempotency_key: `idem-${id}`,
  });
}

export function seedDemoOrders(): void {
  if (mockOrders.size >= 5) return;
  seedOrder("ord-demo-1", MOCK_DEMO_USER_ID, 129900, "paid", "Cloud Security Essentials", 3);
  seedOrder("ord-demo-2", MOCK_DEMO_USER_ID, 99900, "paid", "React & TypeScript Deep Dive", 12);
  seedOrder("ord-demo-3", "7f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81", 89900, "refunded", "Data Structures & Algorithms in Go", 20);
  seedOrder("ord-demo-4", "0a2f9e3b-5c6d-4a7b-9e0f-1b3c5d7e9f01", 149900, "failed", "Offensive Web App Testing", 1);
  seedOrder("ord-demo-5", "5f1a9e3b-2c4d-4f6b-8c0d-7e2a9f3b1c81", 1200, "paid", "Race the Clock (lab pass)", 0, "stripe");
}

/* ------------------------------------------------------------------ */
/*  B2B subscription + seats (mock-only until Commerce backend)        */
/* ------------------------------------------------------------------ */

export const MOCK_SUBSCRIPTION: Subscription = {
  subscription_id: "sub-acme-01",
  org_name: "Acme Security Co.",
  plan: MOCK_PLANS[0]!,
  seats: [
    { seat_id: "seat-1", email: "aarav@acme.dev", display_name: "Aarav Mehta", status: "active", assigned_course_id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f" },
    { seat_id: "seat-2", email: "zara@acme.dev", display_name: "Zara Khan", status: "active", assigned_course_id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c" },
    { seat_id: "seat-3", email: "kenji@acme.dev", display_name: "Kenji Tanaka", status: "invited", assigned_course_id: null },
    { seat_id: "seat-4", email: "sofia@acme.dev", display_name: "Sofia Rossi", status: "suspended", assigned_course_id: null },
  ] as Seat[],
  active: true,
  next_invoice_cents: 2500 * 4,
  renews_at: new Date(Date.now() + 21 * 86400_000).toISOString(),
};
