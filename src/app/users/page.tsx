import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { UsersHub } from "@/components/users-hub";
import { requireSpaceContext } from "@/lib/space-context";
import { db } from "@/lib/db";
import { can, parsePermissions } from "@/lib/permissions";
import Link from "next/link";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const query = await searchParams;
  const { user, spaces, space, membership } = await requireSpaceContext(
    query.space,
  );
  const myPermissions = parsePermissions(membership.role.permissions);
  const manage = can(myPermissions, "users.manage");

  const [roles, members, invites] = await Promise.all([
    db.spaceRole.findMany({
      where: { spaceId: space.id },
      include: { _count: { select: { members: true } } },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    db.membership.findMany({
      where: { spaceId: space.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: true,
      },
      orderBy: { user: { name: "asc" } },
    }),
    manage
      ? db.invitation.findMany({
          where: {
            spaceId: space.id,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          include: { role: true },
          orderBy: { expiresAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={space.id}
      active="users"
      title="Users"
      description="People, roles, and module access for this space only."
    >
      <Suspense>
      <UsersHub
        spaceId={space.id}
        manage={manage}
        isOwner={membership.role.systemKey === "OWNER"}
        members={members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          email:
            manage || m.userId === user.id ? m.user.email : "",
          roleId: m.roleId,
          roleName: m.role.name,
          systemKey: m.role.systemKey,
          permissions: parsePermissions(m.role.permissions),
          isYou: m.userId === user.id,
        }))}
        roles={roles.map((r) => {
          const perms = parsePermissions(r.permissions);
          return {
            id: r.id,
            name: r.name,
            systemKey: r.systemKey,
            isSystem: r.isSystem,
            memberCount: r._count.members,
            permissions: perms,
          };
        })}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          roleId: i.roleId,
          roleName: i.role.name,
          expiresAt: i.expiresAt.toISOString(),
        }))}
        assignableRoles={roles
          .filter((r) => r.systemKey !== "OWNER")
          .map((r) => ({
            id: r.id,
            name: r.name,
            systemKey: r.systemKey,
            isSystem: r.isSystem,
            memberCount: r._count.members,
            permissions: parsePermissions(r.permissions),
          }))}
      />
      </Suspense>
      {!manage && (
        <p className="empty-inline" style={{ marginTop: 16 }}>
          Ask a space admin if you need to invite people or change roles.{" "}
          <Link href={`/settings?space=${space.id}`}>Settings</Link>
        </p>
      )}
    </Shell>
  );
}
