import { MockApiError } from "@/lib/api/errors";
import { requireUser } from "@/lib/server/authorization";
import {
  addToCart,
  buyNow,
  createCheckout,
  getCatalogProduct,
  getCart,
  getCheckout,
  getEntitlements,
  getOrderForCheckout,
  getSubscription,
  hasEntitlement,
  listCatalogProducts,
  listPlans,
  removeFromCart,
  replayWebhook,
  simulatePaymentCompletion,
} from "@/lib/server/domains/commerce";
import { idSchema, parseBody, route } from "@/lib/server/http";
import { z } from "zod";

const cartItemSchema = z.object({
  product_id: idSchema,
  quantity: z.number().int().min(1).max(100),
});

function id(path: string[], index: number): string {
  return idSchema.parse(path[index]);
}

function expectPath(path: string[], expected: string[]): void {
  if (path.length !== expected.length) {
    throw new MockApiError("not_found", "Commerce route was not found.", 404);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== ":id" && path[index] !== expected[index]) {
      throw new MockApiError("not_found", "Commerce route was not found.", 404);
    }
  }
}

export async function handleCommerce(
  request: Request,
  path: string[],
): Promise<Response> {
  return route(async () => {
    if (request.method === "GET" && path[0] === "catalog") {
      if (path.length === 1) return Response.json(await listCatalogProducts());
      expectPath(path, ["catalog", ":id"]);
      return Response.json(await getCatalogProduct(id(path, 1)));
    }

    if (request.method === "GET" && path[0] === "plans") {
      expectPath(path, ["plans"]);
      return Response.json(await listPlans());
    }

    if (path[0] === "cart") {
      const actor = await requireUser(request);
      if (request.method === "GET") {
        expectPath(path, ["cart"]);
        return Response.json(await getCart(actor.id));
      }
      if (request.method === "POST" && path[1] === "items") {
        expectPath(path, ["cart", "items"]);
        const input = await parseBody(request, cartItemSchema);
        return Response.json(await addToCart(actor.id, input.product_id, input.quantity));
      }
      if (request.method === "DELETE" && path[1] === "items") {
        expectPath(path, ["cart", "items", ":id"]);
        return Response.json(await removeFromCart(actor.id, id(path, 2)));
      }
    }

    if (path[0] === "checkout" && path[1] === "buy-now") {
      expectPath(path, ["checkout", "buy-now"]);
      if (request.method !== "POST") throw new MockApiError("method_not_allowed", "Method not allowed.", 405);
      const actor = await requireUser(request);
      const input = await parseBody(request, cartItemSchema);
      return Response.json(await buyNow(actor.id, input.product_id, input.quantity), { status: 201 });
    }

    if (path[0] === "checkout" && path.length === 1) {
      expectPath(path, ["checkout"]);
      if (request.method !== "POST") throw new MockApiError("method_not_allowed", "Method not allowed.", 405);
      const actor = await requireUser(request);
      return Response.json(await createCheckout(actor.id), { status: 201 });
    }

    if (path[0] === "checkout" && path.length === 2) {
      const actor = await requireUser(request);
      const checkoutId = id(path, 1);
      if (request.method === "GET") {
        return Response.json(await getCheckout(checkoutId, actor.id));
      }
    }

    if (path[0] === "checkout" && path[2] === "pay") {
      expectPath(path, ["checkout", ":id", "pay"]);
      if (request.method !== "POST") throw new MockApiError("method_not_allowed", "Method not allowed.", 405);
      const actor = await requireUser(request);
      return Response.json(await simulatePaymentCompletion(id(path, 1), actor.id));
    }

    if (path[0] === "checkout" && path[2] === "replay") {
      expectPath(path, ["checkout", ":id", "replay"]);
      if (request.method !== "POST") throw new MockApiError("method_not_allowed", "Method not allowed.", 405);
      const actor = await requireUser(request);
      return Response.json(await replayWebhook(id(path, 1), actor.id));
    }

    if (path[0] === "checkout" && path[2] === "order") {
      expectPath(path, ["checkout", ":id", "order"]);
      if (request.method !== "GET") throw new MockApiError("method_not_allowed", "Method not allowed.", 405);
      const actor = await requireUser(request);
      return Response.json(await getOrderForCheckout(id(path, 1), actor.id));
    }

    if (path[0] === "entitlements" && path.length === 1) {
      expectPath(path, ["entitlements"]);
      const actor = await requireUser(request);
      return Response.json(await getEntitlements(actor.id));
    }

    if (path[0] === "entitlements" && path.length === 2) {
      expectPath(path, ["entitlements", ":id"]);
      const actor = await requireUser(request);
      return Response.json(await hasEntitlement(actor.id, id(path, 1)));
    }

    if (path[0] === "subscription") {
      expectPath(path, ["subscription"]);
      const actor = await requireUser(request);
      return Response.json(await getSubscription(actor.id));
    }

    throw new MockApiError("not_found", "Commerce route was not found.", 404);
  });
}
