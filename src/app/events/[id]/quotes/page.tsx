import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { planSchema, formatMoney } from "@/lib/planning";
import { can, parsePermissions } from "@/lib/permissions";
import { Shell } from "@/components/shell";
import { getShellContext } from "@/lib/space-context";
import { QuoteRequestForm, QuoteManageForm } from "@/components/provider-forms";
export default async function Quotes({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const event = await db.event.findFirst({
    where: {
      id,
      space: {
        members: { some: { userId: user.id } },
      },
    },
    include: {
      space: true,
      serviceRequests: true,
    },
  });
  if (!event) notFound();
  const membership = await db.membership.findUnique({
    where: {
      spaceId_userId: { spaceId: event.spaceId, userId: user.id },
    },
    include: { role: true },
  });
  if (
    !membership ||
    !can(parsePermissions(membership.role.permissions), "vendors.quotes")
  )
    notFound();
  const plan = planSchema.parse(event.plan);
  const { spaces } = await getShellContext(event.spaceId);
  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={event.spaceId}
      active="celebrations"
    >
      <Link className="breadcrumb" href={`/events/${id}`}>
        Back to {event.name}
      </Link>
      <h1>Good options. Clear decisions.</h1>
      <p>
        Share a specific brief with each provider. Their link never opens your
        full plan.
      </p>
      {plan.services.length ? (
        <section className="panel narrow">
          <QuoteRequestForm eventId={id} services={plan.services} />
        </section>
      ) : (
        <p>Add services on the Vendors tab first.</p>
      )}
      <section className="panel">
        <h2>Open quote links</h2>
        {event.serviceRequests.map((r) => (
          <div className="member-row" key={r.id}>
            <div>
              <strong>{r.providerName}</strong>
              <p>
                {r.category} |{" "}
                {r.quote != null
                  ? formatMoney(r.quote, r.currency)
                  : "Awaiting reply"}
              </p>
            </div>
            <div className="cell-actions">
              {!r.importedAt && !r.revokedAt && r.quote != null && (
                <QuoteManageForm id={r.id} action="import" />
              )}
              {!r.revokedAt && (
                <QuoteManageForm id={r.id} action="revoke" />
              )}
            </div>
          </div>
        ))}
      </section>
    </Shell>
  );
}
