import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { planSchema } from "@/lib/planning";
import { can, parsePermissions } from "@/lib/permissions";
import { Shell } from "@/components/shell";
import { EventEditor } from "@/components/event-editor";
export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const event = await db.event.findFirst({
    where: { id, space: { members: { some: { userId: user.id } } } },
    include: { space: true, guestLinks: { orderBy: { household: "asc" } } },
  });
  if (!event) notFound();
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { space: true, role: true },
  });
  const membership = memberships.find((m) => m.spaceId === event.spaceId);
  const permissions = parsePermissions(membership?.role.permissions);
  const editable = can(permissions, "events.write");
  const spaceMembers = await db.membership.findMany({
    where: { spaceId: event.spaceId },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return (
    <Shell
      user={user}
      spaces={memberships.map((m) => m.space)}
      spaceId={event.spaceId}
      active="celebrations"
    >
      <EventEditor
        id={id}
        initialName={event.name}
        initialPlan={planSchema.parse(event.plan)}
        initialVersion={event.version}
        spaceId={event.spaceId}
        spaceName={event.space.name}
        templateKey={event.templateKey}
        editable={editable}
        canDelete={can(permissions, "events.delete")}
        canManageGuests={can(permissions, "guests.manage")}
        canCheckinGuests={can(permissions, "guests.checkin")}
        canViewBudget={can(permissions, "budget.view")}
        canManageBudget={can(permissions, "budget.manage")}
        canManageVendors={can(permissions, "vendors.manage")}
        canQuotesVendors={can(permissions, "vendors.quotes")}
        canBrowseProviders={can(permissions, "providers.browse")}
        members={spaceMembers.map((m) => ({ name: m.user.name }))}
        guests={event.guestLinks.map((g) => ({
          id: g.id,
          household: g.household,
          maxGuests: g.maxGuests,
          attending: g.attending,
          response: g.response,
          dietary: g.dietary,
          contact: g.contact,
          notes: g.notes,
          side: g.side,
          checkedIn: g.checkedIn,
          revoked: !!g.revokedAt,
        }))}
      />
    </Shell>
  );
}
