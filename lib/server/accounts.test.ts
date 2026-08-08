import { describe, expect, it } from "vitest";

import { MOCK_LEARNER } from "@/lib/mocks/users";
import {
  createAccount,
  ensureSeeded,
  findAccountByEmail,
  findUserByEmail,
  findUserByUid,
  verifyPassword,
} from "./accounts";

function accountOrThrow(email: string) {
  const account = findAccountByEmail(email);
  if (!account) throw new Error(`Expected account ${email}`);
  return account;
}

describe("account store", () => {
  it("does not seed demo, admin, or reviewer accounts by default", () => {
    ensureSeeded();
    ensureSeeded();

    expect(findUserByEmail(MOCK_LEARNER.email)).toBeNull();
    expect(findUserByEmail("priya@zapsters.dev")).toBeNull();
    expect(findUserByEmail("meera@zapsters.dev")).toBeNull();
    expect(findUserByEmail("diego@zapsters.dev")).toBeNull();
  });

  it("hashes and validates a registered password without exposing it", () => {
    const result = createAccount({
      display_name: "Riya Test",
      email: "riya@example.com",
      password: "RiyaPass123",
    });
    expect(result.status).toBe("created");
    if (result.status !== "created") return;

    const account = accountOrThrow("riya@example.com");
    expect(result.user.email).toBe("riya@example.com");
    expect(result.user.role).toBe("learner");
    expect(result.user.id).not.toBe(MOCK_LEARNER.id);
    expect(verifyPassword("RiyaPass123", account)).toBe(true);
    expect(verifyPassword("WrongPassword1", account)).toBe(false);
    expect(verifyPassword("", account)).toBe(false);
  });

  it("rejects a duplicate email and resolves the created user by email and uid", () => {
    const duplicate = createAccount({
      display_name: "Other Name",
      email: "riya@example.com",
      password: "OtherPass123",
    });
    expect(duplicate).toEqual({ status: "exists" });

    const user = findUserByEmail("riya@example.com");
    expect(user).not.toBeNull();
    if (!user) return;
    expect(findUserByUid(user.id)).toEqual(user);
  });

  it("rejects unknown emails and malformed passwords without throwing", () => {
    expect(findAccountByEmail("nobody@example.com")).toBeNull();
    expect(findUserByEmail("nobody@example.com")).toBeNull();
    expect(verifyPassword(123, accountOrThrow("riya@example.com"))).toBe(false);
  });

  it("canonicalizes registration and lookup consistently", () => {
    const result = createAccount({
      display_name: "Alias Tester",
      email: "  AliasTest@Example.com ",
      password: "AliasPass123",
    });
    expect(result.status).toBe("created");
    if (result.status !== "created") return;

    expect(result.user.email).toBe("aliastest@example.com");
    expect(findAccountByEmail("ALIASTEST@EXAMPLE.COM")).not.toBeNull();
  });
});
