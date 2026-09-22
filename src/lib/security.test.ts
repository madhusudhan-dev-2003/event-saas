import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  passwordHash,
  verifyPassword,
  token,
  hashToken,
  validStripeSignature,
} from "./security";
describe("authentication secrets", () => {
  it("salts passwords and rejects incorrect input", () => {
    const a = passwordHash("a long private password");
    expect(a).not.toBe(passwordHash("a long private password"));
    expect(verifyPassword("a long private password", a)).toBe(true);
    expect(verifyPassword("wrong password", a)).toBe(false);
    expect(verifyPassword("x", "invalid")).toBe(false);
  });
  it("generates random invitation tokens and hashes them", () => {
    const a = token();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(token());
    expect(hashToken(a)).not.toBe(a);
  });
});
describe("Stripe signature verification", () => {
  const body = '{"type":"customer.subscription.updated"}';
  const secret = "test-secret";
  const timestamp = 1800000000;
  const sign = (b: string, t = timestamp) =>
    createHmac("sha256", secret).update(`${t}.${b}`).digest("hex");
  it("accepts authentic recent payloads", () =>
    expect(
      validStripeSignature(
        body,
        `t=${timestamp},v1=${sign(body)}`,
        secret,
        timestamp * 1000,
      ),
    ).toBe(true));
  it("rejects tampered bytes", () =>
    expect(
      validStripeSignature(
        body + " ",
        `t=${timestamp},v1=${sign(body)}`,
        secret,
        timestamp * 1000,
      ),
    ).toBe(false));
  it("rejects replayed expired signatures", () =>
    expect(
      validStripeSignature(
        body,
        `t=${timestamp},v1=${sign(body)}`,
        secret,
        (timestamp + 301) * 1000,
      ),
    ).toBe(false));
  it("rejects malformed and future signatures", () => {
    expect(validStripeSignature(body, "v1=no", secret)).toBe(false);
    expect(
      validStripeSignature(
        body,
        `t=${timestamp},v1=${sign(body)}`,
        secret,
        (timestamp - 301) * 1000,
      ),
    ).toBe(false);
  });
});
