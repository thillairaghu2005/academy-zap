import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

const TEST_SECRET = "test-secret-for-session-tests";
process.env.SESSION_SECRET = TEST_SECRET;

const {
  createSessionToken,
  revokeSessionToken,
  verifySessionToken,
} = await import("./session");

interface TestEnvelope {
  sid: string;
  exp: number;
}

function encode(value: TestEnvelope): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", TEST_SECRET).update(data).digest("base64url");
}

function forgeToken(payload: TestEnvelope): string {
  const encoded = encode(payload);
  return `${encoded}.${sign(encoded)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function envelopeFromToken(token: string): TestEnvelope {
  const encoded = token.split(".")[0];
  if (!encoded) throw new Error("Expected a session envelope");
  const parsed: unknown = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  );
  if (
    !isRecord(parsed) ||
    typeof parsed.sid !== "string" ||
    typeof parsed.exp !== "number"
  ) {
    throw new Error("Invalid session envelope");
  }
  return { sid: parsed.sid, exp: parsed.exp };
}

describe("session tokens", () => {
  it("round-trips a valid token with a revocable session ID", async () => {
    const token = await createSessionToken({ id: "u-1", role: "learner" });
    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    if (!payload) return;
    expect(payload.uid).toBe("u-1");
    expect(payload.role).toBe("learner");
    expect(payload.sid).toBe(envelopeFromToken(token).sid);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects a tampered payload because the signature no longer matches", async () => {
    const token = await createSessionToken({ id: "u-1", role: "learner" });
    const parts = token.split(".");
    const encoded = parts[0];
    const signature = parts[1];
    if (!encoded || !signature) throw new Error("Expected a signed token");
    const flip = encoded[0] === "A" ? "B" : "A";
    const tampered = `${flip}${encoded.slice(1)}`;
    expect(await verifySessionToken(`${tampered}.${signature}`)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const token = await createSessionToken({ id: "u-1", role: "learner" });
    const parts = token.split(".");
    const encoded = parts[0];
    const signature = parts[1];
    if (!encoded || !signature) throw new Error("Expected a signed token");
    const flip = signature[0] === "A" ? "B" : "A";
    const badSignature = `${flip}${signature.slice(1)}`;
    expect(await verifySessionToken(`${encoded}.${badSignature}`)).toBeNull();
  });

  it("rejects a correctly-signed but expired token", async () => {
    const liveToken = await createSessionToken({ id: "u-1", role: "learner" });
    const envelope = envelopeFromToken(liveToken);
    const expired = forgeToken({
      sid: envelope.sid,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    expect(await verifySessionToken(expired)).toBeNull();
  });

  it("accepts a correctly-signed token within its validity window", async () => {
    const token = await createSessionToken({ id: "u-1", role: "admin" });
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

  it("revokes a previously valid session ID", async () => {
    const token = await createSessionToken({ id: "u-1", role: "learner" });
    expect(await verifySessionToken(token)).not.toBeNull();
    await revokeSessionToken(token);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("produces distinct tokens for different users", async () => {
    const a = await createSessionToken({ id: "u-1", role: "learner" });
    const b = await createSessionToken({ id: "u-2", role: "learner" });
    expect(a).not.toBe(b);
  });

  it("requires SESSION_SECRET in production-like runtimes", async () => {
    // Next.js types declare NODE_ENV as readonly on NodeJS.ProcessEnv, so
    // the mutation goes through a plain mutable record (the runtime allows
    // it — this is only a typing constraint).
    const env = process.env as Record<string, string | undefined>;
    const originalNodeEnv = env.NODE_ENV;
    const originalSecret = env.SESSION_SECRET;
    env.NODE_ENV = "production";
    delete env.SESSION_SECRET;

    await expect(
      createSessionToken({ id: "u-1", role: "learner" }),
    ).rejects.toThrow("SESSION_SECRET");

    if (originalNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete env.SESSION_SECRET;
    else env.SESSION_SECRET = originalSecret;
  });
});
