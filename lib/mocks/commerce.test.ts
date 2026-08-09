import { beforeEach, describe, expect, it } from "vitest";

import {
  applyDemoCoupon,
  clearDemoCoupon,
  DEMO_COUPONS,
  mockCarts,
  persistCart,
  recomputeTotalCents,
  refreshCouponDiscount,
} from "@/lib/mocks/commerce";
import type { Cart } from "@/lib/contracts/commerce";

const values = new Map<string, string>();

const localStorageStub = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
  clear: () => values.clear(),
  key: (index: number) => [...values.keys()][index] ?? null,
  get length() {
    return values.size;
  },
} as Storage;

const windowStub = {
  localStorage: localStorageStub,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => true,
} as unknown as Window & typeof globalThis;

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: windowStub,
});

function makeCart(): Cart {
  return {
    cart_id: "cart-test",
    user_id: "user-1",
    items: [
      {
        product_id: "p1",
        kind: "course",
        title: "Course One",
        unit_price_cents: 10_000,
        quantity: 2,
      },
      {
        product_id: "p2",
        kind: "lab",
        title: "Lab Pass",
        unit_price_cents: 1_200,
        quantity: 1,
      },
    ],
    total_cents: 21_200,
    updated_at: new Date().toISOString(),
  };
}

describe("commerce cart + demo coupons", () => {
  beforeEach(() => {
    values.clear();
    mockCarts.clear();
  });

  it("persists the cart to localStorage on persistCart", () => {
    const cart = makeCart();
    persistCart(cart);
    expect(values.has("zapsters.mock.cart")).toBe(true);
    const parsed = JSON.parse(values.get("zapsters.mock.cart")!) as {
      user_id: string;
      items: unknown[];
    };
    expect(parsed.user_id).toBe("user-1");
    expect(parsed.items).toHaveLength(2);
  });

  it("applies a known coupon percentage to the subtotal", () => {
    const cart = makeCart();
    expect(DEMO_COUPONS.ZAP10).toBeDefined();

    const result = applyDemoCoupon(cart, "zap10");
    expect(result.applied).toBe(true);
    expect(result.code).toBe("ZAP10");
    // 10% of 21200 = 2120
    expect(result.discount_cents).toBe(2120);
    expect(cart.total_cents).toBe(21_200 - 2120);
    expect(recomputeTotalCents(cart)).toBe(21_200 - 2120);
  });

  it("rejects unknown codes without changing the total", () => {
    const cart = makeCart();
    const result = applyDemoCoupon(cart, "NOT-A-CODE");
    expect(result.applied).toBe(false);
    expect(result.code).toBeNull();
    expect(cart.total_cents).toBe(21_200);
  });

  it("clearDemoCoupon restores the full subtotal", () => {
    const cart = makeCart();
    applyDemoCoupon(cart, "HUNT");
    clearDemoCoupon(cart);
    expect(cart.total_cents).toBe(21_200);
    expect(recomputeTotalCents(cart)).toBe(21_200);
  });

  it("refreshCouponDiscount keeps the discount at the current percent after mutations", () => {
    const cart = makeCart() as ReturnType<typeof makeCart> & {
      coupon_code?: string | null;
      discount_cents?: number;
    };
    applyDemoCoupon(cart, "ZAP10");
    expect(cart.discount_cents).toBe(2120);

    // Add a new item: subtotal 21200 → 31200, discount must follow to 3120.
    cart.items.push({
      product_id: "p3",
      kind: "course",
      title: "Course Three",
      unit_price_cents: 10_000,
      quantity: 1,
    });
    refreshCouponDiscount(cart);
    expect(cart.discount_cents).toBe(3120);
    expect(cart.total_cents).toBe(31_200 - 3120);
  });
});
