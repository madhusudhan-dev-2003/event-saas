import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { seedSpaceRoles } from "@/lib/space-roles";

export const SPACE_COOKIE = "utsava-space";

export async function getShellContext(spaceQuery?: string) {
  const user = await currentUser();
  if (!user) {
    return {
      user: undefined,
      spaces: [] as { id: string; name: string; kind: string }[],
      spaceId: "",
      space: null,
      membership: null,
    };
  }
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { space: true, role: true },
    orderBy: { space: { createdAt: "asc" } },
  });
  const spaces = memberships.map((m) => m.space);
  const remembered = (await cookies()).get(SPACE_COOKIE)?.value;
  const space =
    spaces.find((s) => s.id === spaceQuery) ||
    spaces.find((s) => s.id === remembered) ||
    spaces[0] ||
    null;
  const membership = space
    ? (memberships.find((m) => m.spaceId === space.id) ?? null)
    : null;
  return {
    user,
    spaces,
    space,
    spaceId: space?.id ?? "",
    membership,
  };
}

export async function requireSpaceContext(spaceQuery?: string) {
  const ctx = await getShellContext(spaceQuery);
  if (!ctx.user) redirect("/login");
  if (!ctx.space || !ctx.membership) redirect("/spaces/new");
  await seedSpaceRoles(ctx.space.id);
  return {
    user: ctx.user,
    spaces: ctx.spaces,
    space: ctx.space,
    membership: ctx.membership,
  };
}
