"use server";
import { getMembershipAccess, isOwnerAccess } from "@/lib/space-roles";
import { can } from "@/lib/permissions";
import { requireUser, limit } from "@/lib/auth";
import { db } from "@/lib/db";
import { appUrl, stripeRequest } from "@/lib/stripe";
import { redirect } from "next/navigation";
import { z } from "zod";
type State = { error?: string };
export async function checkout(_: State, form: FormData): Promise<State> {
  const user = await requireUser();
  let destination: string;
  try {
    const spaceId = z.string().min(1).parse(form.get("spaceId"));
    const access = await getMembershipAccess(spaceId, user.id);
    const member = await db.membership.findUnique({
      where: { spaceId_userId: { spaceId, userId: user.id } },
      include: { space: true },
    });
    if (!member || !access || !can(access.permissions, "billing.manage"))
      return { error: "Only the space owner can manage the subscription." };
    await limit(`checkout:${spaceId}`, 5, 600);
    const price =
      member.space.kind === "COMPANY"
        ? process.env.STRIPE_COMPANY_PRICE_ID
        : process.env.STRIPE_FAMILY_PRICE_ID;
    if (!price || !process.env.STRIPE_WEBHOOK_SECRET)
      return {
        error:
          "Subscriptions are not configured yet. Approved Stripe prices and webhooks are required.",
      };
    destination = await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing:${spaceId}`}))`;
        let sub = await tx.subscription.upsert({
          where: { spaceId },
          create: { spaceId },
          update: {},
        });
        if (sub.subscriptionId) {
          const live = await stripeRequest(
            `subscriptions/${encodeURIComponent(sub.subscriptionId)}`,
          );
          if (!["canceled", "incomplete_expired"].includes(live.status))
            throw new Error(
              "This space already has a subscription. Use Manage subscription.",
            );
        }
        if (sub.checkoutSessionId) {
          const session = await stripeRequest(
            `checkout/sessions/${encodeURIComponent(sub.checkoutSessionId)}`,
          );
          if (session.status === "open" && session.url)
            return z.url().parse(session.url);
          if (session.status === "complete")
            throw new Error(
              "Checkout is complete. Please wait for payment confirmation before trying again.",
            );
        }
        if (!sub.customerId) {
          const customer = await stripeRequest(
            "customers",
            { email: user.email, "metadata[spaceId]": spaceId },
            `space-customer-${spaceId}`,
          );
          sub = await tx.subscription.update({
            where: { spaceId },
            data: { customerId: z.string().parse(customer.id) },
          });
        }
        const result = await stripeRequest(
          "checkout/sessions",
          {
            mode: "subscription",
            customer: sub.customerId!,
            "line_items[0][price]": price,
            "line_items[0][quantity]": "1",
            "subscription_data[metadata][spaceId]": spaceId,
            client_reference_id: spaceId,
            success_url: `${appUrl()}/spaces/${spaceId}?checkout=returned`,
            cancel_url: `${appUrl()}/spaces/${spaceId}`,
          },
          `checkout-${spaceId}-${Math.floor(Date.now() / 300000)}`,
        );
        await tx.subscription.update({
          where: { spaceId },
          data: { checkoutSessionId: z.string().parse(result.id) },
        });
        return z.url().parse(result.url);
      },
      { timeout: 60000 },
    );
  } catch (e) {
    return {
      error:
        e instanceof Error &&
        /already|complete|configured|unavailable|Too many/.test(e.message)
          ? e.message
          : "Could not start checkout. No subscription has been activated locally.",
    };
  }
  const url = new URL(destination);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
    return { error: "Stripe returned an unexpected checkout address." };
  redirect(destination);
}
export async function portal(_: State, form: FormData): Promise<State> {
  const user = await requireUser();
  let destination: string;
  try {
    const spaceId = String(form.get("spaceId"));
    const access = await getMembershipAccess(spaceId, user.id);
    if (!access || !can(access.permissions, "billing.manage") || !isOwnerAccess(access))
      return { error: "Only the owner can manage billing." };
    const sub = await db.subscription.findUnique({ where: { spaceId } });
    if (!sub?.customerId)
      return { error: "No Stripe customer is configured for this space yet." };
    const result = await stripeRequest("billing_portal/sessions", {
      customer: sub.customerId,
      return_url: `${appUrl()}/spaces/${spaceId}`,
    });
    destination = z.url().parse(result.url);
  } catch {
    return { error: "The billing portal is unavailable. Please try again." };
  }
  const url = new URL(destination);
  if (url.protocol !== "https:" || url.hostname !== "billing.stripe.com")
    return { error: "Stripe returned an unexpected portal address." };
  redirect(destination);
}
