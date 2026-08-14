import { afterEach, describe, expect, it, vi } from "vitest";

import { clearAccessToken, getCurrentUser, login } from "@/lib/api/client";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.com",
  display_name: "Ada Learner",
  role: "user",
  org_id: null,
  is_active: true,
  created_at: "2026-08-14T00:00:00Z",
};

describe("backend API client", () => {
  afterEach(() => {
    clearAccessToken();
    vi.restoreAllMocks();
  });

  it("keeps the access token in memory and sends it to current-user", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ user, tokens: { access_token: "access-1", token_type: "bearer" } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(user), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await login({ email: user.email, password: "correct-horse-1" });
    await getCurrentUser();

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://127.0.0.1:8000/api/v1/auth/me",
    );
    const firstRequest = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(firstRequest?.credentials).toBe("include");
    expect(new Headers(firstRequest?.headers).get("authorization")).toBe("Bearer access-1");
  });

  it("refreshes once after an expired access token and retries the request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ user, tokens: { access_token: "access-1", token_type: "bearer" } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Token expired" }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "access-2", token_type: "bearer" }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(user), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await login({ email: user.email, password: "correct-horse-1" });
    await getCurrentUser();

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const retryRequest = fetchMock.mock.calls[3]?.[1] as RequestInit | undefined;
    expect(new Headers(retryRequest?.headers).get("authorization")).toBe("Bearer access-2");
  });
});
