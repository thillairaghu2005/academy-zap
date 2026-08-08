import type {
  Cart,
  CatalogProduct,
  CheckoutSession,
  EntitlementsSnapshot,
  Order,
  PaymentEvent,
  Subscription,
} from "@/lib/contracts/commerce";
import {
  jsonBody,
  requestJson,
  segment,
} from "@/lib/api/client";

export async function getCart(userId: string): Promise<Cart> {
  void userId;
  return requestJson<Cart>("/api/commerce/cart");
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity = 1,
): Promise<Cart> {
  void userId;
  return requestJson<Cart>(
    "/api/commerce/cart/items",
    jsonBody({ product_id: productId, quantity }),
  );
}

export async function removeFromCart(
  userId: string,
  productId: string,
): Promise<Cart> {
  void userId;
  return requestJson<Cart>(
    `/api/commerce/cart/items/${segment(productId)}`,
    { method: "DELETE" },
  );
}

export async function createCheckout(userId: string): Promise<CheckoutSession> {
  void userId;
  return requestJson<CheckoutSession>(
    "/api/commerce/checkout",
    jsonBody({}),
  );
}

export async function getCheckout(checkoutId: string): Promise<CheckoutSession> {
  return requestJson<CheckoutSession>(
    `/api/commerce/checkout/${segment(checkoutId)}`,
  );
}

export async function simulatePaymentCompletion(
  checkoutId: string,
): Promise<{ event: PaymentEvent | null; order: Order | null; duplicated: boolean }> {
  return requestJson(
    `/api/commerce/checkout/${segment(checkoutId)}/pay`,
    jsonBody({}),
  );
}

export async function buyNow(
  userId: string,
  productId: string,
  quantity = 1,
): Promise<CheckoutSession> {
  void userId;
  return requestJson<CheckoutSession>(
    "/api/commerce/checkout/buy-now",
    jsonBody({ product_id: productId, quantity }),
  );
}

export async function listCatalogProducts(): Promise<CatalogProduct[]> {
  return requestJson<CatalogProduct[]>("/api/commerce/catalog");
}

export async function getOrderForCheckout(
  checkoutId: string,
): Promise<Order | null> {
  return requestJson<Order | null>(
    `/api/commerce/checkout/${segment(checkoutId)}/order`,
  );
}

export async function replayWebhook(checkoutId: string): Promise<{
  event: PaymentEvent | null;
  order: Order | null;
  duplicated: boolean;
}> {
  return requestJson(
    `/api/commerce/checkout/${segment(checkoutId)}/replay`,
    jsonBody({}),
  );
}

export async function getEntitlements(
  userId: string,
): Promise<EntitlementsSnapshot> {
  void userId;
  return requestJson<EntitlementsSnapshot>("/api/commerce/entitlements");
}

export async function getCatalogProduct(
  productId: string,
): Promise<CatalogProduct | null> {
  return requestJson<CatalogProduct | null>(
    `/api/commerce/catalog/${segment(productId)}`,
  );
}

export async function hasEntitlement(
  userId: string,
  productId: string,
): Promise<boolean> {
  void userId;
  return requestJson<boolean>(
    `/api/commerce/entitlements/${segment(productId)}`,
  );
}

export async function getSubscription(userId: string): Promise<Subscription> {
  void userId;
  return requestJson<Subscription>("/api/commerce/subscription");
}

export async function listPlans(): Promise<Subscription["plan"][]> {
  return requestJson<Subscription["plan"][]>("/api/commerce/plans");
}
