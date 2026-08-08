import { beforeEach, describe, expect, it } from "vitest";

import {
  authenticateDemoUser,
  clearDemoSession,
  DEMO_CREDENTIALS,
  DEMO_SESSION_STORAGE_KEY,
  getDemoSession,
  registerDemo,
} from "@/src/lib/demoAuth";

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

  it("authenticates the requested demo user and persists no password", () => {
    const state = authenticateDemoUser({
      email: DEMO_CREDENTIALS.email.toUpperCase(),
      password: DEMO_CREDENTIALS.password,
    });

    expect(state).toMatchObject({
      status: "authenticated",
      user: {
        id: "demo-user-001",
        display_name: "Raghunandhan",
        email: "demo@zapsters.dev",
        role: "student",
        isDemo: true,
      },
    });
    const stored = values.get(DEMO_SESSION_STORAGE_KEY) ?? "";
    expect(stored).toContain("demo@zapsters.dev");
    expect(stored).not.toContain(DEMO_CREDENTIALS.password);
    expect(getDemoSession()).toEqual(state);
  });

  it("rejects invalid credentials without creating a session", () => {
    expect(() =>
      authenticateDemoUser({
        email: DEMO_CREDENTIALS.email,
        password: "wrong-password",
      }),
    ).toThrow("Incorrect email or password.");
    expect(getDemoSession().status).toBe("anonymous");
  });

  it("clears the session and keeps registration unavailable", () => {
    authenticateDemoUser(DEMO_CREDENTIALS);
    clearDemoSession();
    expect(getDemoSession().status).toBe("anonymous");
    expect(() =>
      registerDemo({
        display_name: "New User",
        email: "new@example.com",
        password: "Password123",
      }),
    ).toThrow("Account creation is coming soon");
  });
});
