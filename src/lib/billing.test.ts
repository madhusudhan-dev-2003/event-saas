import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
const enabled = process.env.TEST_DATABASE_URL?.startsWith(
  "postgresql://celebration_local@127.0.0.1:55439/",
);
describe.skipIf(!enabled)("Stripe callback persistence", () => {
  let db: PrismaClient;
  let spaceId: string;
  const prefix = `qa-webhook-${crypto.randomUUID()}`;
  const secret = "local-unit-test-secret";
  let live: {
    id: string;
    customer: string;
    status: string;
    metadata: { spaceId: string };
    items: { data: { price: { id: string } }[] };
  };
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    process.env.STRIPE_FAMILY_PRICE_ID = "price_approved";
    db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
    spaceId = (
      await db.space.create({ data: { name: "QA billing", kind: "FAMILY" } })
    ).id;
    await db.subscription.create({
      data: { spaceId, customerId: `cus_${prefix}` },
    });
    live = {
      id: `sub_${prefix}`,
      customer: `cus_${prefix}`,
      status: "active",
      metadata: { spaceId },
      items: { data: [{ price: { id: "price_approved" } }] },
    };
  });
  afterEach(() => vi.unstubAllGlobals());
  afterAll(async () => {
    await db.audit.deleteMany({ where: { spaceId } });
    await db.webhookReceipt.deleteMany({
      where: { id: { startsWith: prefix } },
    });
    await db.space.delete({ where: { id: spaceId } });
    await db.$disconnect();
  });
  async function call(suffix: string, valid = true) {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(live), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const body = JSON.stringify({
      id: `${prefix}-${suffix}`,
      type: "customer.subscription.updated",
      data: { object: { id: live.id, status: "outdated-payload" } },
    });
    const t = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", secret)
      .update(`${t}.${body}`)
      .digest("hex");
    return POST(
      new NextRequest("http://localhost/api/stripe/webhook", {
        method: "POST",
        body,
        headers: {
          "stripe-signature": valid ? `t=${t},v1=${signature}` : "invalid",
        },
      }),
    );
  }
  it("rejects unsigned callbacks without changing subscription state", async () => {
    expect((await call("invalid", false)).status).toBe(400);
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { spaceId } })).status,
    ).toBe("INACTIVE");
  });
  it("activates only from fresh provider state and approved price", async () => {
    expect((await call("active")).status).toBe(200);
    expect(
      await db.subscription.findUniqueOrThrow({ where: { spaceId } }),
    ).toMatchObject({
      status: "active",
      subscriptionId: live.id,
      priceId: "price_approved",
    });
  });
  it("deduplicates retries", async () => {
    expect((await call("active")).status).toBe(200);
    expect(await db.audit.count({ where: { spaceId } })).toBe(1);
  });
  it("marks unsupported prices without granting an active status", async () => {
    live.items.data[0].price.id = "price_unknown";
    expect((await call("unknown-price")).status).toBe(200);
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { spaceId } })).status,
    ).toBe("UNRECOGNIZED_PRICE");
    live.items.data[0].price.id = "price_approved";
  });
  it("cancellation retains space and event data", async () => {
    live.status = "canceled";
    expect((await call("cancel")).status).toBe(200);
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { spaceId } })).status,
    ).toBe("canceled");
    expect(
      await db.space.findUnique({ where: { id: spaceId } }),
    ).not.toBeNull();
  });
  it("does not downgrade a replacement subscription from an old cancellation", async () => {
    await db.subscription.update({
      where: { spaceId },
      data: { subscriptionId: "sub_replacement", status: "active" },
    });
    expect((await call("old-cancel")).status).toBe(200);
    expect(
      (await db.subscription.findUniqueOrThrow({ where: { spaceId } })).status,
    ).toBe("active");
  });
});
