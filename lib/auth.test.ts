import { beforeEach, describe, expect, it } from "vitest";

import {
  authenticateMockUser,
  clearMockSession,
  getMockSession,
  MOCK_SESSION_STORAGE_KEY,
  unavailableRegistration,
} from "./auth";

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

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: localStorageStub },
});

describe("frontend demo auth", () => {
  beforeEach(() => values.clear());

  it("authenticates the learner account and persists no password", () => {
    const state = authenticateMockUser({
      email: "DEMO@ZAPSTERS.DEV",
      password: "Demo@12345",
    });

    expect(state).toMatchObject({
      status: "authenticated",
      user: { email: "demo@zapsters.dev", role: "user" },
    });
    const stored = values.get(MOCK_SESSION_STORAGE_KEY) ?? "";
    expect(stored).toContain("demo@zapsters.dev");
    expect(stored).not.toContain("Demo@12345");
    expect(getMockSession()).toEqual(state);
  });

  it("authenticates the admin account with the admin role", () => {
    const state = authenticateMockUser({
      email: "admin@zapsters.dev",
      password: "Admin@12345",
    });

    expect(state.user?.role).toBe("admin");
    expect(JSON.parse(values.get(MOCK_SESSION_STORAGE_KEY) ?? "{}")).toEqual({
      authenticated: true,
      email: "admin@zapsters.dev",
      role: "admin",
    });
  });

  it("rejects invalid credentials without creating a session", () => {
    expect(() =>
      authenticateMockUser({
        email: "demo@zapsters.dev",
        password: "wrong-password",
      }),
    ).toThrow("Incorrect email or password.");
    expect(getMockSession().status).toBe("anonymous");
  });

  it("clears the session on logout and rejects registration", () => {
    authenticateMockUser({ email: "demo@zapsters.dev", password: "Demo@12345" });
    clearMockSession();
    expect(getMockSession().status).toBe("anonymous");
    expect(() =>
      unavailableRegistration({
        display_name: "New User",
        email: "new@example.com",
        password: "Password123",
      }),
    ).toThrow("Account creation is coming soon");
  });
});
