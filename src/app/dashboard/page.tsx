import { Shell } from "@/components/shell";
import { SpaceDashboard } from "@/components/space-dashboard";
import { requireSpaceContext } from "@/lib/space-context";
import { db } from "@/lib/db";
import { can, parsePermissions } from "@/lib/permissions";
import { planSchema } from "@/lib/planning";
import { buildSpaceDashboard } from "@/lib/space-dashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ space?: string; q?: string }>;
}) {
  const query = await searchParams;
  const { user, spaces, space, membership } = await requireSpaceContext(
    query.space,
  );
  const permissions = parsePermissions(membership.role.permissions);
  if (!can(permissions, "dashboard.view") && !can(permissions, "events.read")) {
    return (
      <Shell
        user={user}
        spaces={spaces}
        spaceId={space.id}
        active="dashboard"
        title="Dashboard"
        description="You do not have access to view this dashboard."
      >
        <p>Ask an administrator if you need this overview.</p>
      </Shell>
    );
  }

  const now = new Date();
  const [events, members, pendingInvites, roles, providers, quoteRows] =
    await Promise.all([
      db.event.findMany({
        where: { spaceId: space.id },
        include: { guestLinks: true },
        orderBy: { updatedAt: "desc" },
      }),
      db.membership.count({ where: { spaceId: space.id } }),
      db.invitation.count({
        where: {
          spaceId: space.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
      }),
      db.spaceRole.count({ where: { spaceId: space.id } }),
      db.provider.count({ where: { published: true } }),
      db.serviceRequest.findMany({
        where: { event: { spaceId: space.id }, revokedAt: null },
        select: { quote: true, importedAt: true },
      }),
    ]);

  const records = events.map((e) => ({
    ...e,
    plan: planSchema.parse(e.plan),
  }));
  const view = buildSpaceDashboard(records, {
    members,
    pendingInvites,
    roles,
    providers,
    quotes: {
      total: quoteRows.length,
      awaiting: quoteRows.filter((row) => row.quote == null).length,
      replied: quoteRows.filter((row) => row.quote != null).length,
    },
  });

  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={space.id}
      active="dashboard"
      title={`Hello, ${user.name.split(" ")[0]}.`}
      description="Everything in this space — celebrations, guests, money, vendors, and people."
    >
      <SpaceDashboard
        spaceId={space.id}
        view={view}
        search={(query.q || "").trim().toLowerCase()}
        canWrite={can(permissions, "events.write")}
        canBudget={can(permissions, "budget.view")}
        canUsers={
          can(permissions, "users.manage") || can(permissions, "users.invite")
        }
        canProviders={can(permissions, "providers.browse")}
        canSettings={can(permissions, "settings.manage")}
      />
    </Shell>
  );
}
