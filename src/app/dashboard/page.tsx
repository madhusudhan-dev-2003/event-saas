import Link from "next/link";
import { ArrowRight, Plus } from "@/components/icons";
import { Shell } from "@/components/shell";
import { PieChart, BarChart } from "@/components/dashboard-charts";
import { requireSpaceContext } from "@/lib/space-context";
import { db } from "@/lib/db";
import { formatMoney, nextActions, planSchema } from "@/lib/planning";
import { can, parsePermissions } from "@/lib/permissions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const query = await searchParams;
  const { user, spaces, space, membership } = await requireSpaceContext(
    query.space,
  );
  const permissions = parsePermissions(membership.role.permissions);
  if (!can(permissions, "dashboard.view") && !can(permissions, "events.read")) {
    return (
      <Shell user={user} spaces={spaces} spaceId={space.id} active="dashboard">
        <h1>Dashboard</h1>
        <p>You do not have access to view this dashboard.</p>
      </Shell>
    );
  }

  const events = await db.event.findMany({
    where: { spaceId: space.id },
    include: { guestLinks: true },
    orderBy: { updatedAt: "desc" },
  });
  const records = events.map((e) => ({
    ...e,
    plan: planSchema.parse(e.plan),
  }));
  const byStatus = {
    DRAFT: records.filter((e) => e.plan.status === "DRAFT").length,
    PLANNING: records.filter((e) => e.plan.status === "PLANNING").length,
    COMPLETED: records.filter((e) => e.plan.status === "COMPLETED").length,
    ARCHIVED: records.filter((e) => e.plan.status === "ARCHIVED").length,
  };
  const active = records.filter(
    (e) => !["COMPLETED", "ARCHIVED"].includes(e.plan.status),
  );
  const next = active[0];
  const action = next ? nextActions(next.plan)[0] : null;
  const guestCount = records.reduce((n, e) => n + e.guestLinks.length, 0);
  const attending = records.reduce(
    (n, e) =>
      n +
      e.guestLinks
        .filter((g) => g.response === "YES")
        .reduce((s, g) => s + g.attending, 0),
    0,
  );
  const openTasks = records.reduce(
    (n, e) => n + e.plan.tasks.filter((t) => !t.done).length,
    0,
  );
  const doneTasks = records.reduce(
    (n, e) => n + e.plan.tasks.filter((t) => t.done).length,
    0,
  );
  const budgetPlanned = records.reduce(
    (n, e) => n + e.plan.budget.reduce((s, b) => s + b.planned, 0),
    0,
  );
  const budgetPaid = records.reduce(
    (n, e) => n + e.plan.budget.reduce((s, b) => s + b.paid, 0),
    0,
  );
  const currency = records[0]?.plan.currency || "USD";

  const rsvpYes = records.reduce(
    (n, e) => n + e.guestLinks.filter((g) => g.response === "YES").length,
    0,
  );
  const rsvpNo = records.reduce(
    (n, e) => n + e.guestLinks.filter((g) => g.response === "NO").length,
    0,
  );
  const rsvpMaybe = records.reduce(
    (n, e) => n + e.guestLinks.filter((g) => g.response === "MAYBE").length,
    0,
  );
  const rsvpPending = records.reduce(
    (n, e) => n + e.guestLinks.filter((g) => g.response === "PENDING").length,
    0,
  );

  const occasionBars = Object.entries(
    records.reduce<Record<string, number>>((acc, e) => {
      acc[e.templateKey] = (acc[e.templateKey] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <Shell user={user} spaces={spaces} spaceId={space.id} active="dashboard">
      <header className="page-header-bar">
        <div>
          <h1>Hello, {user.name.split(" ")[0]}.</h1>
          <p>Live overview for this space. Charts update as you plan.</p>
        </div>
        <Link className="btn-add" href={`/new?space=${space.id}`}>
          <Plus size={16} /> New event
        </Link>
      </header>

      <div className="kpi-grid">
        <div className="kpi-card">
          <strong>{records.length}</strong>
          <span>Celebrations</span>
        </div>
        <div className="kpi-card">
          <strong>{active.length}</strong>
          <span>In progress</span>
        </div>
        <div className="kpi-card">
          <strong>{guestCount}</strong>
          <span>Households</span>
        </div>
        <div className="kpi-card">
          <strong>{attending}</strong>
          <span>Guests attending</span>
        </div>
        <div className="kpi-card">
          <strong>{openTasks}</strong>
          <span>Open tasks</span>
        </div>
        <div className="kpi-card">
          <strong>{formatMoney(budgetPlanned, currency)}</strong>
          <span>Budget planned</span>
        </div>
      </div>

      <div className="charts-grid">
        <PieChart
          title="Celebration status"
          slices={[
            { label: "Planning", value: byStatus.PLANNING, color: "#702d48" },
            { label: "Draft", value: byStatus.DRAFT, color: "#b18a45" },
            { label: "Completed", value: byStatus.COMPLETED, color: "#4a7c59" },
            { label: "Archived", value: byStatus.ARCHIVED, color: "#9a8f96" },
          ]}
        />
        <PieChart
          title="RSVP responses"
          slices={[
            { label: "Attending", value: rsvpYes, color: "#4a7c59" },
            { label: "Declined", value: rsvpNo, color: "#c0392b" },
            { label: "Maybe", value: rsvpMaybe, color: "#e67e22" },
            { label: "Pending", value: rsvpPending, color: "#c4b5a5" },
          ]}
        />
        <BarChart
          title="Tasks progress"
          bars={[
            { label: "Done", value: doneTasks },
            { label: "Open", value: openTasks },
          ]}
        />
        <BarChart
          title="Occasions"
          bars={
            occasionBars.length
              ? occasionBars
              : [{ label: "None yet", value: 0 }]
          }
        />
      </div>

      <div className="budget-meter panel">
        <div className="budget-meter-head">
          <h3>Budget spend</h3>
          <span>
            {formatMoney(budgetPaid, currency)} of{" "}
            {formatMoney(budgetPlanned || 1, currency)}
          </span>
        </div>
        <div className="budget-meter-track">
          <div
            className="budget-meter-fill"
            style={{
              width: `${
                budgetPlanned
                  ? Math.min(100, (budgetPaid / budgetPlanned) * 100)
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      <section className="welcome-banner">
        <div className="banner-copy">
          <span className="pill">YOUR NEXT STEP</span>
          <h2>
            {next
              ? action?.title || next.name
              : "Start a celebration in this space"}
          </h2>
          <p>
            {next
              ? action?.reason || "Continue planning this event."
              : "Events you create here stay private to this space."}
          </p>
          <Link
            className="primary"
            href={next ? `/events/${next.id}` : `/new?space=${space.id}`}
          >
            {next ? "Continue" : "New event"}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <div className="section-title">
        <div>
          <p className="eyebrow">RECENT</p>
          <h2>Latest celebrations</h2>
        </div>
        <Link href={`/celebrations?space=${space.id}`}>
          View all <ArrowRight size={15} />
        </Link>
      </div>

      {records.length ? (
        <div className="celeb-card-grid">
          {records.slice(0, 4).map((e) => {
            const done = e.plan.tasks.filter((t) => t.done).length;
            const total = e.plan.tasks.length;
            return (
              <Link
                className="celeb-card"
                href={`/events/${e.id}`}
                key={e.id}
              >
                <div className="celeb-card-top">
                  <span className={`status-pill status-${e.plan.status.toLowerCase()}`}>
                    {e.plan.status.toLowerCase()}
                  </span>
                </div>
                <h3>{e.name}</h3>
                <p>{e.plan.date || "Date TBD"}</p>
                <div className="progress">
                  <span
                    style={{
                      width: `${total ? (done / total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <small>
                  {done} of {total} preparations
                </small>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No celebrations in this space yet</h3>
          <p>Create an event to start planning.</p>
          <Link className="btn-add" href={`/new?space=${space.id}`}>
            <Plus size={16} /> New event
          </Link>
        </div>
      )}
    </Shell>
  );
}
