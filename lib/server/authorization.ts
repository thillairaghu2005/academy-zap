import type { SessionUser } from "@/lib/contracts/session";
import { MockApiError } from "@/lib/api/errors";
import { findUserByEmail, findUserByUid } from "@/lib/server/accounts";
import {
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/server/session";

function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) return part.slice(separator + 1).trim();
  }
  return undefined;
}

/** Resolve the current account from the signed HttpOnly session cookie. */
export async function getAuthenticatedUser(
  request: Request,
): Promise<SessionUser | null> {
  const token = cookieValue(request.headers.get("cookie"), SESSION_COOKIE);
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user =
    (payload.email ? findUserByEmail(payload.email) : null) ??
    findUserByUid(payload.uid);

  // The account directory is authoritative for current identity and role.
  // This also rejects a stale token whose email and uid no longer agree.
  if (!user || user.id !== payload.uid) return null;
  return user;
}

export async function requireUser(request: Request): Promise<SessionUser> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new MockApiError("auth_required", "Sign in to continue.", 401);
  }
  return user;
}

export async function requireAdmin(request: Request): Promise<SessionUser> {
  const user = await requireUser(request);
  if (user.role !== "admin") {
    throw new MockApiError(
      "forbidden",
      "Administrator access is required.",
      403,
    );
  }
  return user;
}

export function assertOwner(
  ownerId: string,
  actor: SessionUser,
  notFoundMessage = "Resource was not found.",
): void {
  if (ownerId !== actor.id) {
    throw new MockApiError("resource_not_found", notFoundMessage, 404);
  }
}
