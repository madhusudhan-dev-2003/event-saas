import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Eye,
  ListChecks,
  MapPin,
  Plus,
  Settings2,
  Store,
  Users,
} from "@/components/icons";
import { BarChart, PieChart, StackedMeter } from "@/components/dashboard-charts";
import { celebrationCover } from "@/lib/celebration-board";
import { formatMoney, occasions } from "@/lib/planning";
import { budgetHealthLabel } from "@/lib/budget-board";
import type { buildSpaceDashboard } from "@/lib/space-dashboard";

type View = ReturnType<typeof buildSpaceDashboard>;

function href(path: string, spaceId: string) {
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}space=${spaceId}`;
}

export function SpaceDashboard({
  spaceId,
  view,
  search,
  canWrite,
  canBudget,
  canUsers,
  canProviders,
  canSettings,
}: {
  spaceId: string;
  view: View;
  search: string;
  canWrite: boolean;
  canBudget: boolean;
  canUsers: boolean;
  canProviders: boolean;
  canSettings: boolean;
}) {
  const { totals } = view;
  const source = search ? view.list : view.recent;
  const filtered = search
    ? source.filter(
        (row) =>
          row.name.toLowerCase().includes(search) ||
          row.status.toLowerCase().includes(search) ||
          row.location.toLowerCase().includes(search),
      )
    : source;

  const kpis = [
    {
      value: totals.celebrations,
      label: "Celebrations",
      hint: `${totals.active} in progress`,
      to: href("/celebrations", spaceId),
    },
    {
      value: totals.active,
      label: "In progress",
      hint: `${totals.completed} completed`,
      to: href("/celebrations?status=PLANNING", spaceId),
    },
    {
      value: totals.openTasks,
      label: "Open tasks",
      hint:
        totals.overdueTasks > 0
          ? `${totals.overdueTasks} overdue`
          : `${totals.doneTasks} done`,
      to: href("/celebrations", spaceId),
    },
    {
      value: totals.attending,
      label: "Guests attending",
      hint: `${totals.households} households`,
      to: href("/celebrations", spaceId),
    },
    {
      value: view.rsvp.pending,
      label: "Waiting RSVP",
      hint: `${totals.checkedIn} checked in`,
      to: href("/celebrations", spaceId),
    },
    canBudget
      ? {
          value: formatMoney(view.money.planned, view.currency),
          label: "Budget planned",
          hint: budgetHealthLabel(view.money.health),
          to: href("/celebrations", spaceId),
        }
      : {
          value: totals.members,
          label: "People",
          hint: `${totals.pendingInvites} invites`,
          to: canUsers ? href("/users", spaceId) : href("/celebrations", spaceId),
        },
  ];

  return (
    <div className="dash">
      <div className="dash-top">
        <div className="dash-kpis">
          {kpis.map((kpi) => (
            <Link className="kpi-card" href={kpi.to} key={kpi.label}>
              <strong>{kpi.value}</strong>
              <span className="kpi-copy">
                <span className="kpi-label">{kpi.label}</span>
                <span className="kpi-hint">{kpi.hint}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="dash-actions">
          {canWrite ? (
            <Link className="primary" href={href("/new", spaceId)}>
              <Plus size={16} />
              New event
            </Link>
          ) : null}
          <Link className="secondary" href={href("/celebrations", spaceId)}>
            <ClipboardList size={16} />
            Celebrations
          </Link>
          {canUsers ? (
            <Link className="secondary" href={href("/users", spaceId)}>
              <Users size={16} />
              People
            </Link>
          ) : null}
          {canProviders ? (
            <Link className="secondary" href={href("/providers", spaceId)}>
              <Store size={16} />
              Providers
            </Link>
          ) : null}
          {canSettings ? (
            <Link className="secondary" href={href("/settings", spaceId)}>
              <Settings2 size={16} />
              Settings
            </Link>
          ) : null}
        </div>
      </div>

      <section className="dash-next">
        <div>
          <p className="dash-kicker">Next to do</p>
          <h2>{view.next ? view.next.actionTitle : "Start a celebration"}</h2>
          <p>
            {view.next
              ? view.next.actionReason
              : "Events you create here stay private to this space."}
          </p>
          {view.next ? (
            <p className="dash-next-meta">
              <CalendarDays size={14} />
              {view.next.dateLabel}
              {view.next.location ? (
                <>
                  <MapPin size={14} />
                  {view.next.location}
                </>
              ) : null}
              {view.next.days !== null && view.next.days >= 0
                ? ` · ${view.next.days} day${view.next.days === 1 ? "" : "s"}`
                : null}
            </p>
          ) : null}
        </div>
        <div className="dash-next-actions">
          <Link
            className="primary"
            href={
              view.next ? href(view.next.href, spaceId) : href("/new", spaceId)
            }
          >
            {view.next ? "Continue" : "New event"}
            <ArrowRight size={16} />
          </Link>
          {view.next ? (
            <Link className="secondary" href={href("/celebrations", spaceId)}>
              All celebrations
            </Link>
          ) : null}
        </div>
      </section>

      <div className="charts-grid">
        <PieChart
          title="Celebration status"
          slices={[
            { label: "Planning", value: view.byStatus.PLANNING, color: "#702d48" },
            { label: "Draft", value: view.byStatus.DRAFT, color: "#b18a45" },
            { label: "Completed", value: view.byStatus.COMPLETED, color: "#4a7c59" },
            { label: "Archived", value: view.byStatus.ARCHIVED, color: "#9a8f96" },
          ]}
        />
        <PieChart
          title="RSVP responses"
          slices={[
            { label: "Attending", value: view.rsvp.yes, color: "#4a7c59" },
            { label: "Declined", value: view.rsvp.no, color: "#c0392b" },
            { label: "Maybe", value: view.rsvp.maybe, color: "#e67e22" },
            { label: "Pending", value: view.rsvp.pending, color: "#c4b5a5" },
          ]}
        />
        <BarChart
          title="Tasks"
          bars={[
            { label: "Done", value: totals.doneTasks },
            { label: "Open", value: totals.openTasks },
            { label: "Overdue", value: totals.overdueTasks },
            { label: "High", value: totals.highPriority },
          ]}
        />
        <PieChart
          title="Vendor pipeline"
          slices={[
            {
              label: "Shortlist",
              value: view.vendorCounts.SHORTLISTED,
              color: "#c4b5a5",
            },
            {
              label: "Selected",
              value: view.vendorCounts.SELECTED,
              color: "#b18a45",
            },
            {
              label: "Confirmed",
              value: view.vendorCounts.CONFIRMED,
              color: "#702d48",
            },
            {
              label: "Delivered",
              value: view.vendorCounts.DELIVERED,
              color: "#6b8f71",
            },
            { label: "Paid", value: view.vendorCounts.PAID, color: "#4a7c59" },
          ]}
        />
        {canBudget ? (
          <StackedMeter
            title="Budget"
            caption={`${formatMoney(view.money.paid, view.currency)} paid of ${formatMoney(view.money.planned || 0, view.currency)} · ${budgetHealthLabel(view.money.health)}`}
            segments={[
              { label: "Paid", value: view.money.paid, color: "#4a7c59" },
              {
                label: "Committed",
                value: view.money.committedUnpaid,
                color: "#b18a45",
              },
              {
                label: "Open",
                value: view.money.remaining,
                color: "#eadfd8",
              },
            ]}
          />
        ) : null}
        <BarChart
          title="Occasions"
          wide
          bars={
            view.occasionBars.length
              ? view.occasionBars
              : [{ label: "None yet", value: 0 }]
          }
        />
        {canBudget ? (
          <BarChart
            title="Budget by category"
            wide
            currency={view.currency}
            bars={
              view.categoryBars.length
                ? view.categoryBars
                : [{ label: "None yet", value: 0 }]
            }
          />
        ) : null}
      </div>

      <div className="dash-split">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h3>Needs attention</h3>
            <span>{view.attention.length}</span>
          </div>
          {view.attention.length ? (
            <ul className="dash-attention">
              {view.attention.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                  <Link className="secondary" href={href(item.href, spaceId)}>
                    {item.cta}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-empty">Nothing overdue or waiting right now.</p>
          )}
        </section>
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h3>Coming up</h3>
            <Link href={href("/celebrations", spaceId)}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {view.upcoming.length ? (
            <ul className="dash-upcoming">
              {view.upcoming.map((item) => (
                <li key={item.id}>
                  <Link href={href(item.href, spaceId)}>
                    <strong>{item.name}</strong>
                    <small>
                      {item.dateLabel}
                      {item.location ? ` · ${item.location}` : ""}
                      {item.days !== null ? ` · ${item.days}d` : ""}
                    </small>
                  </Link>
                  <span className="dash-chip">{item.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-empty">No dated celebrations ahead.</p>
          )}
        </section>
      </div>

      <div className="dash-modules">
        <Link className="dash-module" href={href("/celebrations", spaceId)}>
          <strong>{totals.functions}</strong>
          <span>Functions</span>
        </Link>
        <Link className="dash-module" href={href("/celebrations", spaceId)}>
          <strong>{totals.food}</strong>
          <span>Food items</span>
        </Link>
        <Link className="dash-module" href={href("/celebrations", spaceId)}>
          <strong>{totals.fittings}</strong>
          <span>Fittings</span>
        </Link>
        <Link className="dash-module" href={href("/celebrations", spaceId)}>
          <strong>{totals.services}</strong>
          <span>Vendor services</span>
        </Link>
        <Link
          className="dash-module"
          href={
            canProviders
              ? href("/providers", spaceId)
              : href("/celebrations", spaceId)
          }
        >
          <strong>{totals.quotesAwaiting}</strong>
          <span>Quotes waiting</span>
        </Link>
        <Link
          className="dash-module"
          href={
            canUsers ? href("/users", spaceId) : href("/celebrations", spaceId)
          }
        >
          <strong>{totals.members}</strong>
          <span>People in space</span>
        </Link>
        <Link
          className="dash-module"
          href={
            canUsers ? href("/users", spaceId) : href("/celebrations", spaceId)
          }
        >
          <strong>{totals.pendingInvites}</strong>
          <span>Pending invites</span>
        </Link>
        <Link
          className="dash-module"
          href={
            canProviders
              ? href("/providers", spaceId)
              : href("/celebrations", spaceId)
          }
        >
          <strong>{totals.providers}</strong>
          <span>Directory</span>
        </Link>
      </div>

      <div className="section-title">
        <div>
          <h2>Latest celebrations</h2>
        </div>
        <Link href={href("/celebrations", spaceId)}>
          View all <ArrowRight size={15} />
        </Link>
      </div>
      {filtered.length ? (
        <div className="celeb-card-grid">
          {filtered.map((e) => {
            const occasion = occasions.find((item) => item.key === e.templateKey);
            const pct = e.total ? Math.round((e.done / e.total) * 100) : 0;
            return (
              <article className="celeb-card" key={e.id}>
                <Link
                  className="celeb-card-hit"
                  href={href(e.href, spaceId)}
                  aria-label={`Open ${e.name}`}
                />
                <div className="celeb-card-cover">
                  <img
                    src={celebrationCover(e.templateKey, e.coverUrl)}
                    alt=""
                  />
                  <small className="celeb-cover-occ">
                    {occasion?.name || e.templateKey}
                  </small>
                  <span className={`status-pill status-${e.statusKey}`}>
                    {e.status}
                  </span>
                </div>
                <div className="celeb-card-body">
                  <h3>{e.name}</h3>
                  <div className="celeb-card-when">
                    <p>
                      <CalendarDays size={14} />
                      {e.dateLabel}
                    </p>
                    <p>
                      <MapPin size={14} />
                      {e.location.trim() || "Location not set"}
                    </p>
                  </div>
                  <div className="celeb-progress">
                    <b>
                      <i style={{ width: `${pct}%` }} />
                    </b>
                    <span>
                      {e.done} of {e.total} tasks
                    </span>
                  </div>
                  <div className="celeb-card-stats">
                    <span>
                      <Users size={14} /> {e.attending} attending
                    </span>
                    <span>
                      <ListChecks size={14} /> {e.guests} invited
                    </span>
                  </div>
                </div>
                <div className="celeb-card-actions">
                  <span className="celeb-action-view">
                    <Eye size={15} />
                    View
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>
            {search
              ? "No celebrations match this search"
              : "No celebrations in this space yet"}
          </h3>
          <p>
            {search
              ? "Try another name or status."
              : "Use New event to start planning."}
          </p>
          {canWrite && !search ? (
            <Link className="primary" href={href("/new", spaceId)}>
              New event
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
