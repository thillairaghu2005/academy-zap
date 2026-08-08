import { MockApiError } from "@/lib/api/errors";
import { z } from "zod";

export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new MockApiError("validation_error", "Request body must be valid JSON.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new MockApiError("validation_error", "Request payload is invalid.", 400);
  }
  return parsed.data;
}

export function parseQuery<T>(
  request: Request,
  schema: z.ZodType<T>,
): T {
  const url = new URL(request.url);
  const values: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) values[key] = value;
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    throw new MockApiError("validation_error", "Query parameters are invalid.", 400);
  }
  return parsed.data;
}

export function routeError(error: unknown): Response {
  if (error instanceof MockApiError) {
    return Response.json(
      { code: error.code, message: error.message },
      { status: error.status },
    );
  }
  if (error instanceof z.ZodError) {
    return Response.json(
      { code: "validation_error", message: "Request payload is invalid." },
      { status: 400 },
    );
  }
  return Response.json(
    { code: "internal_error", message: "The service could not complete that request." },
    { status: 500 },
  );
}

export async function route(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return routeError(error);
  }
}

export const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_.:-]+$/);

export const positiveIntSchema = z.number().int().min(1).max(100);
