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
import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  writeDemoStorage,
} from "@/lib/demo/storage";

export const MOCK_DEMO_USER_ID = "demo-user-001";

/* ------------------------------------------------------------------ */
/*  Demo coupons (Task 4 — local commerce simulation)                  */
/*                                                                    */
/*  Deterministic codes a visitor can type at checkout. Discounts are  */
/*  stored on the persisted cart and flow through to the checkout      */
/*  session amount like a real promo line.                            */
/* ------------------------------------------------------------------ */

export const DEMO_COUPONS: Record<string, { percent: number; label: string }> = {
  ZAP10: { percent: 10, label: "Zapster 10% off" },
  ZAP25: { percent: 25, label: "Zapster 25% off" },
  HUNT: { percent: 15, label: "Launch-week 15% off" },
};

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
// Courses are digital — they always have stock; only the timed lab pass is
// capacity-limited ("Race the Clock" has stock 3 → the low-stock display path).
export const MOCK_CATALOG: CatalogProduct[] = [
  { product_id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", kind: "course", title: "Offensive Web App Testing", price_cents: 149900, stock: 25 },
  { product_id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", kind: "course", title: "React & TypeScript Deep Dive", price_cents: 99900, stock: 25 },
  { product_id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b", kind: "course", title: "Cloud Security Essentials", price_cents: 129900, stock: 25 },
  { product_id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", kind: "course", title: "Data Structures & Algorithms in Go", price_cents: 89900, stock: 25 },
  { product_id: "soc-analyst-fundamentals", kind: "course", title: "SOC Analyst Fundamentals", price_cents: 129900, stock: 25 },
  { product_id: "network-traffic-analysis", kind: "course", title: "Network Traffic Analysis", price_cents: 99900, stock: 25 },
  { product_id: "malware-analysis-basics", kind: "course", title: "Malware Analysis Basics", price_cents: 149900, stock: 25 },
  { product_id: "full-stack-nextjs", kind: "course", title: "Full Stack Next.js Development", price_cents: 199900, stock: 25 },
  { product_id: "nodejs-backend-engineering", kind: "course", title: "Node.js Backend Engineering", price_cents: 149900, stock: 25 },
  { product_id: "web-performance-engineering", kind: "course", title: "Web Performance Engineering", price_cents: 99900, stock: 25 },
  { product_id: "accessibility-first-frontend", kind: "course", title: "Accessibility-First Frontend", price_cents: 79900, stock: 25 },
  { product_id: "advanced-java-oop", kind: "course", title: "Advanced Java & OOP", price_cents: 99900, stock: 25 },
  { product_id: "python-programming-masterclass", kind: "course", title: "Python Programming Masterclass", price_cents: 129900, stock: 25 },
  { product_id: "clean-code-software-architecture", kind: "course", title: "Clean Code & Software Architecture", price_cents: 179900, stock: 25 },
  { product_id: "go-concurrency-in-practice", kind: "course", title: "Go Concurrency in Practice", price_cents: 119900, stock: 25 },
  { product_id: "docker-and-kubernetes", kind: "course", title: "Docker & Kubernetes", price_cents: 149900, stock: 25 },
  { product_id: "aws-cloud-foundations", kind: "course", title: "AWS Cloud Foundations", price_cents: 99900, stock: 25 },
  { product_id: "cicd-engineering", kind: "course", title: "CI/CD Engineering", price_cents: 129900, stock: 25 },
  { product_id: "terraform-infrastructure-as-code", kind: "course", title: "Terraform Infrastructure as Code", price_cents: 149900, stock: 25 },
  { product_id: "machine-learning-foundations", kind: "course", title: "Machine Learning Foundations", price_cents: 129900, stock: 25 },
  { product_id: "deep-learning-pytorch", kind: "course", title: "Deep Learning with PyTorch", price_cents: 179900, stock: 25 },
  { product_id: "computer-vision", kind: "course", title: "Computer Vision", price_cents: 149900, stock: 25 },
  { product_id: "generative-ai-engineering", kind: "course", title: "Generative AI Engineering", price_cents: 199900, stock: 25 },
  { product_id: "ai-agents-automation", kind: "course", title: "AI Agents & Automation", price_cents: 149900, stock: 25 },
  { product_id: "tcp-ip-deep-dive", kind: "course", title: "TCP/IP Deep Dive", price_cents: 99900, stock: 25 },
  { product_id: "network-automation-python", kind: "course", title: "Network Automation with Python", price_cents: 129900, stock: 25 },
  { product_id: "operating-systems-internals", kind: "course", title: "Operating Systems Internals", price_cents: 149900, stock: 25 },
  { product_id: "system-design-interview-prep", kind: "course", title: "System Design Interview Prep", price_cents: 199900, stock: 25 },
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
    currency: "inr",
    billing_cycle: "monthly",
  },
  {
    plan_id: "pl-org",
    name: "Organization",
    price_per_seat_cents: 2100,
    currency: "inr",
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

/* ------------------------------------------------------------------ */
/*  Order history persistence (Task 4)                                 */
/*                                                                    */
/*  mockOrders is the `orders` table stand-in. The demo persists paid   */
/*  orders so the purchase history survives page loads; seed rows are   */
/*  hydrated first and user-created orders merge on top.               */
/* ------------------------------------------------------------------ */

function hydrateOrders(): void {
  if (typeof window === "undefined") return;
  const persisted = readDemoStorage<Order[] | null>(
    DEMO_STORAGE_KEYS.commerce,
    null,
  );
  if (!Array.isArray(persisted)) return;
  for (const order of persisted) {
    if (order && typeof order === "object" && order.order_id) {
      mockOrders.set(order.order_id, order);
    }
  }
}

/** Persist every order (called after any order write). */
export function persistOrders(): void {
  if (typeof window === "undefined") return;
  writeDemoStorage(DEMO_STORAGE_KEYS.commerce, [...mockOrders.values()]);
}

hydrateOrders();

/** The demo user's orders, newest first (the learner-facing order history). */
export function listOrdersForUser(userId: string): Order[] {
  return [...mockOrders.values()]
    .filter((order) => order.user_id === userId && order.status === "paid")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

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
/*  browser persistence. Guarded for SSR and node (tests).             */
/* ------------------------------------------------------------------ */

const CART_STORAGE_KEY = "zapsters.mock.cart";
const CART_UPDATED_EVENT = "zapsters:cart-updated";
export const demoCartSeeded = new Set<string>();

/** DemoCart extends Cart with the local promo fields (never in the contract). */
export interface DemoCart extends Cart {
  coupon_code?: string | null;
  discount_cents?: number;
}

function loadPersistedCart(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      user_id?: unknown;
      items?: unknown;
      coupon_code?: unknown;
      discount_cents?: unknown;
    };
    if (
      !parsed ||
      typeof parsed.user_id !== "string" ||
      !Array.isArray(parsed.items)
    ) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }
    const cart = cartForUser(parsed.user_id) as DemoCart;
    cart.items = parsed.items.filter(isPersistedCartItem);
    if (typeof parsed.coupon_code === "string") cart.coupon_code = parsed.coupon_code;
    if (typeof parsed.discount_cents === "number" && Number.isFinite(parsed.discount_cents)) {
      cart.discount_cents = Math.max(0, parsed.discount_cents);
    }
    cart.total_cents = recomputeTotalCents(cart);
    cart.updated_at = new Date().toISOString();
    if (cart.user_id === MOCK_DEMO_USER_ID) demoCartSeeded.add(MOCK_DEMO_USER_ID);
  } catch {
    // Corrupt storage is ignored — the in-memory store stands in.
  }
}

function isPersistedCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.product_id === "string" &&
    (item.kind === "course" || item.kind === "lab" || item.kind === "subscription") &&
    typeof item.title === "string" &&
    Number.isFinite(item.unit_price_cents) &&
    Number.isInteger(item.quantity) &&
    (item.quantity ?? 0) > 0
  );
}

export function persistCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  try {
    const demo = cart as DemoCart;
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        user_id: cart.user_id,
        items: cart.items,
        coupon_code: demo.coupon_code ?? null,
        discount_cents: demo.discount_cents ?? 0,
      }),
    );
    window.dispatchEvent(
      new CustomEvent(CART_UPDATED_EVENT, {
        detail: { userId: cart.user_id },
      }),
    );
  } catch {
    // Storage may be unavailable (private mode) — mock keeps working.
  }
}

/** Subtotal minus the applied coupon discount. */
export function recomputeTotalCents(cart: Cart): number {
  const subtotal = recomputeTotal(cart.items);
  const discount = (cart as DemoCart).discount_cents ?? 0;
  return Math.max(0, subtotal - discount);
}

/** Apply a demo coupon to the cart (unknown code → null, no-op). */
export function applyDemoCoupon(cart: Cart, code: string): {
  applied: boolean;
  code: string | null;
  discount_cents: number;
  label?: string;
} {
  const demo = cart as DemoCart;
  const normalized = code.trim().toUpperCase();
  const coupon = DEMO_COUPONS[normalized];
  if (!coupon) {
    demo.coupon_code = null;
    demo.discount_cents = 0;
    demo.total_cents = recomputeTotalCents(demo);
    return { applied: false, code: null, discount_cents: 0 };
  }
  const subtotal = recomputeTotal(cart.items);
  demo.coupon_code = normalized;
  demo.discount_cents = Math.round((subtotal * coupon.percent) / 100);
  demo.total_cents = recomputeTotalCents(demo);
  return {
    applied: true,
    code: normalized,
    discount_cents: demo.discount_cents,
    label: coupon.label,
  };
}

/** Remove any applied coupon from the cart. */
export function clearDemoCoupon(cart: Cart): void {
  const demo = cart as DemoCart;
  demo.coupon_code = null;
  demo.discount_cents = 0;
  demo.total_cents = recomputeTotalCents(demo);
}

/**
 * Re-derive the discount from the stored coupon code. Called after ANY cart
 * mutation (add/remove/quantity) so the promo stays at the correct percent
 * of the CURRENT subtotal — a stale discount would silently over/under-apply.
 */
export function refreshCouponDiscount(cart: Cart): void {
  const demo = cart as DemoCart;
  if (!demo.coupon_code) return;
  const coupon = DEMO_COUPONS[demo.coupon_code];
  if (!coupon) {
    clearDemoCoupon(cart);
    return;
  }
  const subtotal = recomputeTotal(cart.items);
  demo.discount_cents = Math.round((subtotal * coupon.percent) / 100);
  demo.total_cents = recomputeTotalCents(demo);
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
  return cart;
}

export function recomputeTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
}

/**
 * Paid checkout fixtures can explicitly seed the demo user's cart once. Normal
 * cart reads and mutations never add demo products behind the user's back.
 */
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
    refreshCouponDiscount(cart);
    cart.total_cents = recomputeTotalCents(cart);
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
    currency: "inr",
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
    currency: "inr",
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
      currency: "inr",
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
  persistOrders();

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
    clearDemoCoupon(cart); // a completed order consumes the promo line
    cart.total_cents = recomputeTotalCents(cart);
    cart.updated_at = now;
    persistCart(cart);
  }

  session.status = isFailure ? "failed" : "paid";
  return { event, order, duplicated: false };
}

/* ------------------------------------------------------------------ */
/*  Entitlement reads (demo-service-derived — the client never guesses)  */
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
    currency: "inr",
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

const DEMO_ORDER_FIXTURE_IDS = [
  "ord-demo-1",
  "ord-demo-2",
  "ord-demo-3",
  "ord-demo-4",
  "ord-demo-5",
] as const;

/**
 * Seed the admin order fixtures exactly once per browser session. Guarded by
 * fixture ids (not total size) so persisted user purchases from hydrateOrders
 * never suppress — or mix with — the demo rows.
 */
export function seedDemoOrders(): void {
  const alreadySeeded = DEMO_ORDER_FIXTURE_IDS.every((id) =>
    mockOrders.has(id),
  );
  if (alreadySeeded) return;
  seedOrder("ord-demo-1", MOCK_DEMO_USER_ID, 129900, "paid", "Cloud Security Essentials", 3);
  seedOrder("ord-demo-2", MOCK_DEMO_USER_ID, 99900, "paid", "React & TypeScript Deep Dive", 12);
  seedOrder("ord-demo-3", "7f3b2c4d-1a9e-4f6b-8c0d-5e2a9f3b7c81", 89900, "refunded", "Data Structures & Algorithms in Go", 20);
  seedOrder("ord-demo-4", "0a2f9e3b-5c6d-4a7b-9e0f-1b3c5d7e9f01", 149900, "failed", "Offensive Web App Testing", 1);
  seedOrder("ord-demo-5", "5f1a9e3b-2c4d-4f6b-8c0d-7e2a9f3b1c81", 1200, "paid", "Race the Clock (lab pass)", 0, "stripe");
  persistOrders();
}

/* ------------------------------------------------------------------ */
/*  B2B subscription + seats (frontend demo read model)                */
/* ------------------------------------------------------------------ */

export const MOCK_SUBSCRIPTION: Subscription = {
  subscription_id: "sub-acme-01",
  org_name: "Acme Security Co.",
  plan: MOCK_PLANS[0]!,
  seats: [
    { seat_id: "seat-1", email: "demo@zapsters.dev", display_name: "Raghunandhan", status: "active", assigned_course_id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f" },
    { seat_id: "seat-2", email: "zara@acme.dev", display_name: "Zara Khan", status: "active", assigned_course_id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c" },
    { seat_id: "seat-3", email: "kenji@acme.dev", display_name: "Kenji Tanaka", status: "invited", assigned_course_id: null },
    { seat_id: "seat-4", email: "sofia@acme.dev", display_name: "Sofia Rossi", status: "suspended", assigned_course_id: null },
  ] as Seat[],
  active: true,
  next_invoice_cents: 2500 * 4,
  renews_at: new Date(Date.now() + 21 * 86400_000).toISOString(),
};
