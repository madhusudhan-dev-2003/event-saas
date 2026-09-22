import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { newPlan } from "./planning";
import { hashToken, token } from "./security";
const context = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({ id: context.userId }),
  limit: async () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirect");
  },
}));
const enabled = process.env.TEST_DATABASE_URL?.startsWith(
  "postgresql://celebration_local@127.0.0.1:55439/",
);
describe.skipIf(!enabled)("restricted RSVP and provider proposals", () => {
  let db: PrismaClient;
  let spaceId: string;
  let eventId: string;
  let raw: string;
  let guestId: string;
  let requestId: string;
  let quoteToken: string;
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
    context.userId = (
      await db.user.create({
        data: {
          email: `quote-${crypto.randomUUID()}@example.test`,
          name: "QA owner",
          passwordHash: "not-a-login",
        },
      })
    ).id;
    spaceId = (
      await db.space.create({
        data: {
          name: "QA requests",
          kind: "FAMILY",
        },
      })
    ).id;
    const ownerRole = await db.spaceRole.create({
      data: {
        spaceId,
        name: "Owner",
        systemKey: "OWNER",
        isSystem: true,
        permissions: [
          "dashboard.view",
          "events.read",
          "events.write",
          "events.delete",
          "guests.manage",
          "budget.manage",
          "vendors.manage",
          "settings.manage",
          "users.manage",
          "billing.manage",
        ],
      },
    });
    await db.membership.create({
      data: { userId: context.userId, spaceId, roleId: ownerRole.id },
    });
    const plan = newPlan("birthday");
    eventId = (
      await db.event.create({
        data: {
          spaceId,
          name: "QA event",
          templateKey: "birthday",
          createKey: crypto.randomUUID(),
          plan,
        },
      })
    ).id;
    raw = token();
    guestId = (
      await db.guestLink.create({
        data: {
          eventId,
          household: "QA household",
          maxGuests: 2,
          tokenHash: hashToken(raw),
          expiresAt: new Date(Date.now() + 60000),
        },
      })
    ).id;
    quoteToken = token();
    requestId = (
      await db.serviceRequest.create({
        data: {
          eventId,
          serviceId: plan.services[0].id,
          providerName: "QA provider",
          category: "Cake",
          brief: "A test brief",
          currency: "USD",
          tokenHash: hashToken(quoteToken),
          expiresAt: new Date(Date.now() + 60000),
        },
      })
    ).id;
  });
  afterAll(async () => {
    await db.space.delete({ where: { id: spaceId } });
    await db.user.delete({ where: { id: context.userId } });
    await db.$disconnect();
  });
  const form = (values: Record<string, string>) => {
    const f = new FormData();
    Object.entries(values).forEach(([k, v]) => f.set(k, v));
    return f;
  };
  it("rejects RSVP counts above the invitation allowance", async () => {
    const { rsvp } = await import("@/app/actions");
    expect(
      (
        await rsvp(
          {},
          form({ token: raw, response: "YES", attending: "3", dietary: "" }),
        )
      ).error,
    ).toBeTruthy();
    expect(
      (await db.guestLink.findUniqueOrThrow({ where: { id: guestId } }))
        .attending,
    ).toBe(0);
  });
  it("persists a valid household response", async () => {
    const { rsvp } = await import("@/app/actions");
    expect(
      (
        await rsvp(
          {},
          form({
            token: raw,
            response: "YES",
            attending: "2",
            dietary: "Vegetarian",
          }),
        )
      ).success,
    ).toBeTruthy();
    expect(
      await db.guestLink.findUniqueOrThrow({ where: { id: guestId } }),
    ).toMatchObject({ attending: 2, response: "YES", dietary: "Vegetarian" });
  });
  it("revoked links cannot submit responses", async () => {
    await db.guestLink.update({
      where: { id: guestId },
      data: { revokedAt: new Date() },
    });
    const { rsvp } = await import("@/app/actions");
    expect(
      (
        await rsvp(
          {},
          form({ token: raw, response: "NO", attending: "0", dietary: "" }),
        )
      ).error,
    ).toBeTruthy();
  });
  it("provider reply becomes an option, never a booking", async () => {
    const { replyQuote, manageQuote } = await import("@/app/provider-actions");
    expect(
      (
        await replyQuote(
          {},
          form({
            token: quoteToken,
            version: "0",
            quote: "120.50",
            availability: "AVAILABLE",
            reply: "Cake and delivery",
          }),
        )
      ).success,
    ).toBeTruthy();
    expect(
      (await manageQuote({}, form({ id: requestId, action: "import" })))
        .success,
    ).toBeTruthy();
    const plan = (await db.event.findUniqueOrThrow({ where: { id: eventId } }))
      .plan as ReturnType<typeof newPlan>;
    expect(plan.services[0].vendors[0].quote).toBe(12050);
    expect(plan.services[0].selectedId).toBe("");
    expect(plan.services[0].status).toBe("SHORTLISTED");
    expect(
      (await manageQuote({}, form({ id: requestId, action: "import" }))).error,
    ).toBeTruthy();
  });
  it("imported provider quotes cannot be changed behind the organizer", async () => {
    const { replyQuote } = await import("@/app/provider-actions");
    expect(
      (
        await replyQuote(
          {},
          form({
            token: quoteToken,
            version: "2",
            quote: "999.99",
            availability: "AVAILABLE",
            reply: "Changed",
          }),
        )
      ).error,
    ).toBeTruthy();
  });
});
