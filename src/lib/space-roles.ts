import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import {
  SYSTEM_ROLE_DEFS,
  parsePermissions,
  type Permission,
  type SystemRoleKey,
} from "@/lib/permissions";

type DbLike = Pick<
  PrismaClient,
  "spaceRole" | "membership" | "space" | "event"
>;

export type MembershipAccess = {
  spaceId: string;
  userId: string;
  roleId: string;
  roleName: string;
  isSystem: boolean;
  systemKey: string | null;
  permissions: Permission[];
};

export async function seedSpaceRoles(spaceId: string, client: DbLike = db) {
  const map: Record<string, string> = {};
  for (const def of SYSTEM_ROLE_DEFS) {
    const role = await client.spaceRole.upsert({
      where: { spaceId_name: { spaceId, name: def.name } },
      create: {
        spaceId,
        name: def.name,
        systemKey: def.key,
        isSystem: true,
        permissions: [...def.permissions],
      },
      update: {
        systemKey: def.key,
        isSystem: true,
      },
    });
    map[def.key] = role.id;
  }
  return map;
}

export async function getMembershipAccess(
  spaceId: string,
  userId: string,
): Promise<MembershipAccess | null> {
  const m = await db.membership.findUnique({
    where: { spaceId_userId: { spaceId, userId } },
    include: { role: true },
  });
  if (!m?.role) return null;
  return {
    spaceId: m.spaceId,
    userId: m.userId,
    roleId: m.roleId,
    roleName: m.role.name,
    isSystem: m.role.isSystem,
    systemKey: m.role.systemKey,
    permissions: parsePermissions(m.role.permissions),
  };
}

export async function getEventMembershipAccess(
  eventId: string,
  userId: string,
): Promise<(MembershipAccess & { eventId: string; spaceId: string }) | null> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, spaceId: true },
  });
  if (!event) return null;
  const access = await getMembershipAccess(event.spaceId, userId);
  if (!access) return null;
  return { ...access, eventId: event.id };
}

export function isOwnerAccess(access: MembershipAccess | null | undefined) {
  return access?.systemKey === "OWNER";
}

export function isAdminOrOwner(access: MembershipAccess | null | undefined) {
  return access?.systemKey === "OWNER" || access?.systemKey === "ADMIN";
}

export async function createSpaceWithOwner(input: {
  name: string;
  kind: string;
  userId: string;
}) {
  return db.$transaction(async (tx) => {
    const space = await tx.space.create({
      data: { name: input.name, kind: input.kind },
    });
    const roles = await seedSpaceRoles(space.id, tx);
    await tx.membership.create({
      data: {
        spaceId: space.id,
        userId: input.userId,
        roleId: roles.OWNER,
      },
    });
    return space;
  });
}

export function systemKeyFromRole(role: {
  systemKey: string | null;
  name: string;
}): SystemRoleKey | null {
  if (
    role.systemKey === "OWNER" ||
    role.systemKey === "ADMIN" ||
    role.systemKey === "EDITOR" ||
    role.systemKey === "VIEWER"
  ) {
    return role.systemKey;
  }
  return null;
}
