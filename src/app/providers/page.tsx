import { db } from "@/lib/db";
import { Shell } from "@/components/shell";
import { getShellContext } from "@/lib/space-context";
import { ProviderDirectory } from "@/components/provider-directory";
import { can, parsePermissions } from "@/lib/permissions";
import { planSchema } from "@/lib/planning";

export const dynamic = "force-dynamic";

export default async function Providers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; space?: string; manage?: string }>;
}) {
  const params = await searchParams;
  const { user, spaces, spaceId, membership } = await getShellContext(
    params.space,
  );
  const providers = process.env.DATABASE_URL
    ? await db.provider.findMany({
        where: { published: true },
        select: {
          id: true,
          name: true,
          category: true,
          location: true,
          description: true,
          contact: true,
        },
        take: 200,
        orderBy: { name: "asc" },
      })
    : [];

  const own =
    user && process.env.DATABASE_URL
      ? await db.provider.findUnique({ where: { userId: user.id } })
      : null;
  const emailVerified = user
    ? Boolean(
        (
          await db.user.findUnique({
            where: { id: user.id },
            select: { emailVerifiedAt: true },
          })
        )?.emailVerifiedAt,
      )
    : false;

  const canAddVendors = Boolean(
    membership &&
      can(parsePermissions(membership.role.permissions), "vendors.manage"),
  );

  const events =
    spaceId && canAddVendors && process.env.DATABASE_URL
      ? (
          await db.event.findMany({
            where: { spaceId },
            select: { id: true, name: true, plan: true },
            orderBy: { updatedAt: "desc" },
            take: 50,
          })
        )
          .map((event) => {
            const plan = planSchema.safeParse(event.plan);
            return {
              id: event.id,
              name: event.name,
              services: plan.success
                ? plan.data.services.map((service) => ({
                    id: service.id,
                    category: service.category,
                  }))
                : [],
            };
          })
          .filter((event) => event.services.length)
      : [];

  const loginHref = `/login`;

  return (
    <Shell user={user} spaces={spaces} spaceId={spaceId} active="providers">
      <ProviderDirectory
        providers={providers}
        own={
          own
            ? {
                name: own.name,
                category: own.category,
                location: own.location,
                description: own.description,
                contact: own.contact,
                published: own.published,
              }
            : null
        }
        emailVerified={emailVerified}
        signedIn={Boolean(user)}
        loginHref={loginHref}
        canAddVendors={canAddVendors}
        events={events}
        openManage={params.manage === "1" && Boolean(user)}
        initialQuery={params.q?.slice(0, 120) || ""}
      />
    </Shell>
  );
}
