import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

/**
 * Session token tests — sign/verify/expiry/tamper for the HMAC-SHA256
 * cookie token (lib/server/session.ts). A fixed test secret is pinned
 * BEFORE the module is imported so the tests are hermetic and do not
 * depend on the machine's SESSION_SECRET (or lack of one).
 */
const TEST_SECRET = "test-secret-for-session-tests";
process.env.SESSION_SECRET = TEST_SECRET;

const { createSessionToken, verifySessionToken } = await import("./session");

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return Buffer.from(binary, "binary").toString("base64url");
}

/** Replicate the module's signing scheme to forge tokens for expiry tests. */
function sign(data: string): string {
  return createHmac("sha256", TEST_SECRET).update(data).digest("base64url");
}

function forgeToken(payload: { uid: string; role: string; exp: number }): string {
  const encoded = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${sign(encoded)}`;
}

describe("session tokens", () => {
  it("round-trips a valid token with uid/role and a future expiry", async () => {
    const token = await createSessionToken({ id: "u-1", role: "learner" });
    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.uid).toBe("u-1");
    expect(payload!.role).toBe("learner");
    expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects a tampered payload (signature no longer matches)", async () => {
    const token = await createSessionToken({ id: "u-1", role: "learner" });
    const [encoded, signature] = token.split(".");
    const flip = encoded![0] === "A" ? "B" : "A";
    const tampered = `${flip}${encoded!.slice(1)}`;
    expect(await verifySessionToken(`${tampered}.${signature}`)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const token = await createSessionToken({ id: "u-1", role: "learner" });
    const [encoded, signature] = token.split(".");
    const flip = signature![0] === "A" ? "B" : "A";
    const badSignature = `${flip}${signature!.slice(1)}`;
    expect(await verifySessionToken(`${encoded}.${badSignature}`)).toBeNull();
  });

  it("rejects a correctly-signed but expired token", async () => {
    const token = forgeToken({
      uid: "u-1",
      role: "learner",
      exp: Math.floor(Date.now() / 1000) - 60, // expired a minute ago
    });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("accepts a correctly-signed token at the boundary of validity", async () => {
    const token = forgeToken({
      uid: "u-1",
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const payload = await verifySessionToken(token);
    expect(payload?.role).toBe("admin");
  });

  it("rejects malformed and empty tokens", async () => {
    expect(await verifySessionToken("not-a-token")).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken(null)).toBeNull();
    expect(await verifySessionToken("onlyonecomponent")).toBeNull();
  });

  it("produces distinct tokens for different users (uid is bound by signature)", async () => {
    const a = await createSessionToken({ id: "u-1", role: "learner" });
    const b = await createSessionToken({ id: "u-2", role: "learner" });
    expect(a).not.toBe(b);
  });
});
