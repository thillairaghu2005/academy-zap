import { MockApiError } from "@/lib/api/errors";

function errorBody(value: unknown): { code?: string; message?: string } {
  if (typeof value !== "object" || value === null) return {};
  const record = value as Record<string, unknown>;
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
  };
}

/** Same-origin JSON transport used by every browser-facing domain adapter. */
export async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
    });
  } catch {
    throw new MockApiError(
      "network_error",
      "Could not reach the service. Please try again later.",
      503,
    );
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Keep the generic error for non-JSON responses.
    }
    const parsed = errorBody(body);
    throw new MockApiError(
      parsed.code ?? "http_error",
      parsed.message ?? "The service could not complete that request.",
      response.status,
    );
  }

  return (await response.json()) as T;
}

export async function requestVoid(
  path: string,
  init?: RequestInit,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
    });
  } catch {
    throw new MockApiError(
      "network_error",
      "Could not reach the service. Please try again later.",
      503,
    );
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Keep the generic error for non-JSON responses.
    }
    const parsed = errorBody(body);
    throw new MockApiError(
      parsed.code ?? "http_error",
      parsed.message ?? "The service could not complete that request.",
      response.status,
    );
  }
}

export function jsonBody(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function withQuery(
  path: string,
  values: Record<string, string | number | boolean | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
}

export function segment(value: string): string {
  return encodeURIComponent(value);
}
