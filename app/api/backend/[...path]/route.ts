import "server-only";

import { BACKEND_API_URL } from "@/lib/server/backend-url";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  if (!BACKEND_API_URL) {
    return Response.json({ detail: "Backend is not configured." }, { status: 503 });
  }

  const { path } = await context.params;
  const target = new URL(`/api/v1/${path.map((segment) => encodeURIComponent(segment)).join("/")}`, BACKEND_API_URL);
  target.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  const body = request.method === "GET" ? undefined : await request.arrayBuffer();

  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });
  } catch (error) {
    console.error("[backend-proxy] upstream request failed", {
      method: request.method,
      path: path.join("/"),
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ detail: "Backend unavailable." }, { status: 503 });
  }

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  const setCookie = responseHeaders.get("set-cookie");
  if (setCookie) {
    responseHeaders.set(
      "set-cookie",
      setCookie.replace(/Path=\/api\/v1\/auth/gi, "Path=/api/backend/auth"),
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
