import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
export const PASSWORD_MIN_LENGTH = 6;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function token() {
  return randomBytes(32).toString("hex");
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function validStripeSignature(
  body: string,
  header: string,
  secret: string,
  now = Date.now(),
) {
  const entries = header.split(",").map((s) => s.split("="));
  const timestamp = entries.find((e) => e[0] === "t")?.[1];
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest();
  return entries
    .filter((e) => e[0] === "v1" && /^[a-f0-9]{64}$/.test(e[1] || ""))
    .some((e) => timingSafeEqual(Buffer.from(e[1], "hex"), expected));
}
