import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { newPlan } from "./planning";
const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({
    id: session.userId,
    email: "qa-integration@example.test",
    name: "QA",
  }),
  limit: async () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
// Explicit opt-in. This suite only uses a dedicated localhost test database.
const enabled = process.env.TEST_DATABASE_URL?.startsWith(
  "postgresql://celebration_local@127.0.0.1:55439/",
);
describe.skipIf(!enabled)(
  "real PostgreSQL space isolation and concurrency",
  () => {
    let db: PrismaClient;
    let owner: string;
    let viewer: string;
    let outsider: string;
    let spaceId: string;
    let eventId: string;
    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
      const suffix = crypto.randomUUID();
      owner = (
        await db.user.create({
          data: {
            name: "QA owner",
            email: `owner-${suffix}@example.test`,
            passwordHash: "not-a-login",
          },
        })
      ).id;
      viewer = (
        await db.user.create({
          data: {
            name: "QA viewer",
            email: `viewer-${suffix}@example.test`,
            passwordHash: "not-a-login",
          },
        })
      ).id;
      outsider = (
        await db.user.create({
          data: {
            name: "QA outsider",
            email: `outsider-${suffix}@example.test`,
            passwordHash: "not-a-login",
          },
        })
      ).id;
      spaceId = (
        await db.space.create({
          data: {
            name: "QA isolated space",
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
      const viewerRole = await db.spaceRole.create({
        data: {
          spaceId,
          name: "Viewer",
          systemKey: "VIEWER",
          isSystem: true,
          permissions: ["dashboard.view", "events.read"],
        },
      });
      await db.membership.createMany({
        data: [
          { userId: owner, spaceId, roleId: ownerRole.id },
          { userId: viewer, spaceId, roleId: viewerRole.id },
        ],
      });
      eventId = (
        await db.event.create({
          data: {
            name: "QA name-only birthday",
            spaceId,
            templateKey: "birthday",
            plan: newPlan("birthday"),
            createKey: suffix,
          },
        })
      ).id;
    });
    afterAll(async () => {
      if (db) {
        await db.audit.deleteMany({ where: { spaceId } });
        await db.space.delete({ where: { id: spaceId } });
        await db.user.deleteMany({
          where: { id: { in: [owner, viewer, outsider] } },
        });
        await db.$disconnect();
      }
    });
    it("persists a draft without date or venue", async () => {
      const event = await db.event.findUniqueOrThrow({
        where: { id: eventId },
      });
      expect(event.name).toBe("QA name-only birthday");
      expect(event.plan).toMatchObject({ date: "", location: "" });
    });
    it("denies outsider writes even with a valid event ID", async () => {
      session.userId = outsider;
      const { saveEvent } = await import("@/app/actions");
      const result = await saveEvent({
        id: eventId,
        name: "Attack",
        version: 0,
        plan: newPlan("birthday"),
      });
      expect(result.error).toBeTruthy();
      expect(
        (await db.event.findUniqueOrThrow({ where: { id: eventId } })).name,
      ).toBe("QA name-only birthday");
    });
    it("denies viewer writes", async () => {
      session.userId = viewer;
      const { saveEvent } = await import("@/app/actions");
      expect(
        (
          await saveEvent({
            id: eventId,
            name: "Attack",
            version: 0,
            plan: newPlan("birthday"),
          })
        ).error,
      ).toBeTruthy();
    });
    it("accepts exactly one concurrent edit and preserves the winner", async () => {
      session.userId = owner;
      const { saveEvent } = await import("@/app/actions");
      const results = await Promise.all([
        saveEvent({
          id: eventId,
          name: "First",
          version: 0,
          plan: newPlan("birthday"),
        }),
        saveEvent({
          id: eventId,
          name: "Second",
          version: 0,
          plan: newPlan("birthday"),
        }),
      ]);
      expect(results.filter((r) => r.version === 1)).toHaveLength(1);
      expect(results.filter((r) => r.error)).toHaveLength(1);
      expect(
        (await db.event.findUniqueOrThrow({ where: { id: eventId } })).version,
      ).toBe(1);
    });
    it("rejects malformed data before updating the database", async () => {
      session.userId = owner;
      const { saveEvent } = await import("@/app/actions");
      expect(
        (
          await saveEvent({
            id: eventId,
            name: "Invalid",
            version: 1,
            plan: { ...newPlan("birthday"), date: "2026-02-31" },
          })
        ).error,
      ).toBeTruthy();
      expect(
        (await db.event.findUniqueOrThrow({ where: { id: eventId } })).version,
      ).toBe(1);
    });
    it("revoked membership immediately loses edit rights", async () => {
      await db.membership.delete({
        where: { spaceId_userId: { spaceId, userId: owner } },
      });
      session.userId = owner;
      const { saveEvent } = await import("@/app/actions");
      expect(
        (
          await saveEvent({
            id: eventId,
            name: "Revoked",
            version: 1,
            plan: newPlan("birthday"),
          })
        ).error,
      ).toBeTruthy();
    });
  },
);
