import { z } from "zod";
export function appUrl() {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("A secure APP_URL must be configured.");
  return url.origin;
}
export async function stripeRequest(
  path: string,
  values?: Record<string, string>,
  idempotencyKey?: string,
) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured yet.");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: values ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(values
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: values ? new URLSearchParams(values) : undefined,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Stripe is unavailable. Please try again.");
  return res.json();
}
export const stripeSubscriptionSchema = z.object({
  id: z.string(),
  customer: z.string(),
  status: z.string(),
  metadata: z.object({ spaceId: z.string() }),
  items: z.object({
    data: z.array(z.object({ price: z.object({ id: z.string() }) })),
  }),
});
export function configuredPrices() {
  return [
    process.env.STRIPE_FAMILY_PRICE_ID,
    process.env.STRIPE_COMPANY_PRICE_ID,
  ].filter((s): s is string => !!s);
}
