import { describe, expect, it } from "vitest";

import {
  ADMIN_PASSWORD,
  createAccount,
  ensureSeeded,
  findAccountByEmail,
  findUserByEmail,
  findUserByUid,
  LEARNER_EMAIL,
  LEARNER_PASSWORD,
  verifyPassword,
} from "./accounts";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-credentials";
import { MOCK_LEARNER } from "@/lib/mocks/users";

/**
 * Account store tests — the idempotent demo seed + REAL credential
 * validation behind the /api/auth/session route (lib/server/accounts.ts).
 */

describe("seeded accounts", () => {
  it("seeds the demo account exactly once on repeated ensureSeeded calls", () => {
    // ensureSeeded already ran during the module import; calling it again
    // must not create duplicates — the demo email resolves to one account.
    ensureSeeded();
    ensureSeeded();
    const first = findAccountByEmail(DEMO_EMAIL);
    const again = findAccountByEmail(DEMO_EMAIL);
    expect(first).not.toBeNull();
    expect(again).toBe(first); // same record, not a duplicate insert
  });

  it("validates the demo credentials (demo@company.com / Demo@123)", () => {
    const account = findAccountByEmail(DEMO_EMAIL);
    expect(account).not.toBeNull();
    expect(verifyPassword(DEMO_PASSWORD, account!)).toBe(true);
    expect(verifyPassword("WrongPassword1", account!)).toBe(false);
    expect(verifyPassword("", account!)).toBe(false);
  });

  it("shares the demo learner uid so mock data resolves, but keeps its own email", () => {
    const demo = findUserByEmail(DEMO_EMAIL)!;
    expect(demo.id).toBe(MOCK_LEARNER.id);
    expect(demo.email).toBe(DEMO_EMAIL);
    // The same uid under its canonical email is the mock learner.
    const aarav = findUserByUid(MOCK_LEARNER.id)!;
    expect(aarav.email).toBe(MOCK_LEARNER.email);
  });

  it("rejects unknown emails", () => {
    expect(findAccountByEmail("nobody@example.com")).toBeNull();
    expect(findUserByEmail("nobody@example.com")).toBeNull();
  });

  it("aliases priya@admin.zapsters.dev to the seeded admin account", () => {
    const account = findAccountByEmail("priya@admin.zapsters.dev");
    expect(account).not.toBeNull();
    expect(account!.user.role).toBe("admin");
    expect(account!.user.email).toBe("priya@zapsters.dev");
    expect(verifyPassword(ADMIN_PASSWORD, account!)).toBe(true);
  });

  it("validates the mock learner's own credentials", () => {
    const account = findAccountByEmail(LEARNER_EMAIL);
    expect(account).not.toBeNull();
    expect(account!.user.email).toBe(MOCK_LEARNER.email);
    expect(verifyPassword(LEARNER_PASSWORD, account!)).toBe(true);
  });

  it("treats a non-string password as a failed check, not a crash", () => {
    const account = findAccountByEmail(DEMO_EMAIL)!;
    // Deliberately passing a non-string (malformed body) — must not throw.
    expect(verifyPassword(123 as unknown as string, account)).toBe(false);
  });
});

describe("registration", () => {
  it("creates a new account with its own identity", () => {
    const result = createAccount({
      display_name: "Riya Test",
      email: "riya@example.com",
      password: "RiyaPass123",
    });
    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.user.email).toBe("riya@example.com");
    expect(result.user.role).toBe("learner");
    expect(result.user.id).not.toBe(MOCK_LEARNER.id);
    expect(verifyPassword("RiyaPass123", findAccountByEmail("riya@example.com")!)).toBe(true);
  });

  it("rejects a duplicate email with status 'exists'", () => {
    expect(
      createAccount({
        display_name: "Riya Test",
        email: "riya@example.com",
        password: "OtherPass123",
      }),
    ).toEqual({ status: "exists" });
  });

  it("canonicalizes the @admin.zapsters.dev alias on register too, so the account stays reachable", () => {
    const result = createAccount({
      display_name: "Alias Tester",
      email: "aliastest@admin.zapsters.dev",
      password: "AliasPass123",
    });
    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    // Registered under the aliased key; lookup with the same alias finds it.
    expect(result.user.email).toBe("aliastest@zapsters.dev");
    expect(findAccountByEmail("aliastest@admin.zapsters.dev")).not.toBeNull();
    expect(findAccountByEmail("aliastest@zapsters.dev")).not.toBeNull();
  });
});
