import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { validStripeSignature } from "@/lib/security";
import {
  configuredPrices,
  stripeRequest,
  stripeSubscriptionSchema,
} from "@/lib/stripe";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  const body = await request.text();
  if (body.length > 1048576)
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  if (
    !validStripeSignature(
      body,
      request.headers.get("stripe-signature") || "",
      secret,
    )
  )
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  let event;
  try {
    event = z
      .object({
        id: z.string(),
        type: z.string(),
        data: z.object({ object: z.object({ id: z.string() }).passthrough() }),
      })
      .parse(JSON.parse(body));
  } catch {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }
  if (
    ![
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)
  )
    return NextResponse.json({ received: true });
  try {
    const identity = stripeSubscriptionSchema.parse(
      await stripeRequest(
        `subscriptions/${encodeURIComponent(event.data.object.id)}`,
      ),
    );
    await db.$transaction(
      async (tx) => {
        // Checkout and callbacks share one space lock, including replacement subscriptions.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing:${identity.metadata.spaceId}`}))`;
        if (await tx.webhookReceipt.findUnique({ where: { id: event.id } }))
          return;
        // Fetch current provider state after locking rather than applying stale event snapshots.
        const live = stripeSubscriptionSchema.parse(
          await stripeRequest(
            `subscriptions/${encodeURIComponent(event.data.object.id)}`,
          ),
        );
        const local = await tx.subscription.findUnique({
          where: { spaceId: live.metadata.spaceId },
        });
        if (!local || local.customerId !== live.customer)
          throw new Error("Customer mapping mismatch");
        if (live.metadata.spaceId !== identity.metadata.spaceId)
          throw new Error("Space mapping changed");
        if (
          local.subscriptionId &&
          local.subscriptionId !== live.id &&
          ["canceled", "incomplete_expired"].includes(live.status)
        ) {
          // A late callback for a retired subscription cannot downgrade its replacement.
          await tx.webhookReceipt.create({ data: { id: event.id } });
          return;
        }
        if (
          local.subscriptionId &&
          local.subscriptionId !== live.id &&
          !["canceled", "incomplete_expired"].includes(local.status)
        )
          throw new Error("Subscription mapping mismatch");
        const price = live.items.data[0]?.price.id;
        const allowed =
          !!price &&
          configuredPrices().includes(price) &&
          live.items.data.length === 1;
        await tx.subscription.update({
          where: { spaceId: local.spaceId },
          data: {
            subscriptionId: live.id,
            status: allowed ? live.status : "UNRECOGNIZED_PRICE",
            priceId: price || null,
          },
        });
        await tx.webhookReceipt.create({ data: { id: event.id } });
        await tx.audit.create({
          data: {
            actorId: "stripe",
            spaceId: local.spaceId,
            targetId: live.id,
            action: `SUBSCRIPTION_${live.status.toUpperCase()}`,
          },
        });
      },
      { timeout: 60000 },
    );
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Processing failed; retry required" },
      { status: 500 },
    );
  }
}
