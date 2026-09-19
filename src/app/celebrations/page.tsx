import Link from "next/link";
import {
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Clock,
  CreditCard,
  Eye,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MoreHorizontal,
  Sparkles,
  Store,
  Users,
} from "@/components/icons";
import { Shell } from "@/components/shell";
import { DeleteEventButton } from "@/components/delete-event-button";
import { requireSpaceContext } from "@/lib/space-context";
import { db } from "@/lib/db";
import {
  formatEventStatus,
  formatPlanDate,
  occasions,
  planSchema,
} from "@/lib/planning";
import { can, parsePermissions } from "@/lib/permissions";
import {
  celebrationCover,
  celebrationKpis,
  type CelebrationRecord,
  daysUntil,
  guestCapacity,
  isUpcomingThisMonth,
  kpiDelta,
  nextCelebration,
  countdownProgress,
  sortCelebrations,
  taskProgress,
} from "@/lib/celebration-board";

function CelebrationItem({
  event,
  listView,
  canWrite,
  canDelete,
  today,
}: {
  event: CelebrationRecord;
  listView: boolean;
  canWrite: boolean;
  canDelete: boolean;
  today: string;
}) {
  const occasion = occasions.find((item) => item.key === event.templateKey);
  const progress = taskProgress(event.plan);
  const guests = guestCapacity(event.guestLinks);
  const cover = celebrationCover(event.templateKey, event.plan.coverUrl);
  const daysLeft = daysUntil(event.plan.date, today);
  const dateLabel = event.plan.date
    ? formatPlanDate(event.plan.date, "header")
    : "Date to be decided";
  const location = event.plan.location.trim() || "Location not set";
  const status = (
    <span className={`status-pill status-${event.plan.status.toLowerCase()}`}>
      {formatEventStatus(event.plan.status)}
    </span>
  );
  const menu = (
    <details className="celeb-card-menu">
      <summary aria-label={`More actions for ${event.name}`}>
        <MoreHorizontal size={16} />
      </summary>
      <div>
        <Link href={`/events/${event.id}`}>Open celebration</Link>
        {canWrite && <Link href={`/events/${event.id}`}>Edit details</Link>}
        {canDelete && <DeleteEventButton id={event.id} name={event.name} />}
      </div>
    </details>
  );

  const openHref = `/events/${event.id}`;
  const openLabel = `Open ${event.name}`;

  if (listView) {
    return (
      <article className="celeb-list-row">
        <Link className="celeb-card-hit" href={openHref} aria-label={openLabel} />
        <div className="celeb-list-thumb">
          <img src={cover} alt="" />
        </div>
        <div className="celeb-list-main">
          <div className="celeb-list-identity">
            <h3>{event.name}</h3>
            <small className="celeb-meta">
              <span className={`celeb-occ celeb-occ-${occasion?.color || "ivory"}`}>
                {occasion?.glyph || "✳"}
              </span>
              {occasion?.name || event.templateKey}
              {status}
            </small>
          </div>
          <div className="celeb-list-when">
            <p>
              <CalendarDays size={14} />
              {dateLabel}
            </p>
            <p>
              <MapPin size={14} />
              {location}
            </p>
            {daysLeft !== null && event.plan.status === "PLANNING" && (
              <small>
                <Clock size={13} />
                {daysLeft < 0
                  ? "Date passed"
                  : daysLeft === 0
                    ? "Today"
                    : `${daysLeft} days left`}
              </small>
            )}
          </div>
          <div className="celeb-list-track">
            <div className={`celeb-progress is-${progress.tone}`}>
              <b>
                <i style={{ width: `${progress.pct}%` }} />
              </b>
              <span>{progress.label}</span>
            </div>
            <div className="celeb-card-stats">
              <span>
                <Users size={14} /> {guests} guests
              </span>
              <span>
                <ListChecks size={14} />{" "}
                {event.plan.tasks.filter((task) => task.done).length}/
                {event.plan.tasks.length} tasks
              </span>
            </div>
          </div>
        </div>
        <div className="celeb-list-actions">
          <span className="celeb-action-view">
            <Eye size={15} />
            View
          </span>
          {menu}
        </div>
      </article>
    );
  }

  return (
    <article className="celeb-card">
      <Link className="celeb-card-hit" href={openHref} aria-label={openLabel} />
      <div className="celeb-card-cover">
        <img src={cover} alt="" />
        <small className="celeb-cover-occ">
          <span className={`celeb-occ celeb-occ-${occasion?.color || "ivory"}`}>
            {occasion?.glyph || "✳"}
          </span>
          {occasion?.name || event.templateKey}
        </small>
        {status}
      </div>
      <div className="celeb-card-body">
        <h3>{event.name}</h3>
        <div className="celeb-card-when">
          <p>
            <CalendarDays size={14} />
            {dateLabel}
          </p>
          <p>
            <MapPin size={14} />
            {location}
          </p>
        </div>
        <div className={`celeb-progress is-${progress.tone}`}>
          <b>
            <i style={{ width: `${progress.pct}%` }} />
          </b>
          <span>{progress.label}</span>
        </div>
        <div className="celeb-card-stats">
          <span>
            <Users size={14} /> {guests} guests
          </span>
          <span>
            <ListChecks size={14} />{" "}
            {event.plan.tasks.filter((task) => task.done).length}/
            {event.plan.tasks.length} tasks
          </span>
        </div>
      </div>
      <div className="celeb-card-actions">
        <span className="celeb-action-view">
          <Eye size={15} />
          View
        </span>
        {menu}
      </div>
    </article>
  );
}

function hrefFor(
  spaceId: string,
  query: Record<string, string | undefined>,
  patch: Record<string, string>,
) {
  const params = new URLSearchParams();
  params.set("space", spaceId);
  for (const [key, value] of Object.entries({ ...query, ...patch })) {
    if (key === "space") continue;
    if (value) params.set(key, value);
  }
  return `/celebrations?${params.toString()}`;
}

export default async function CelebrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    space?: string;
    q?: string;
    status?: string;
    occasion?: string;
    dated?: string;
    upcoming?: string;
    sort?: string;
    view?: string;
  }>;
}) {
  const query = await searchParams;
  const { user, spaces, space, membership } = await requireSpaceContext(
    query.space,
  );
  const permissions = parsePermissions(membership.role.permissions);
  const canWrite = can(permissions, "events.write");
  const canDelete = can(permissions, "events.delete");

  if (!can(permissions, "events.read")) {
    return (
      <Shell
        user={user}
        spaces={spaces}
        spaceId={space.id}
        active="celebrations"
        title="Celebrations"
        description="You do not have access to view celebrations in this space."
      >
        <p>Ask an administrator if you need this list.</p>
      </Shell>
    );
  }

  const events = await db.event.findMany({
    where: {
      spaceId: space.id,
      ...(query.q
        ? { name: { contains: query.q.slice(0, 120), mode: "insensitive" } }
        : {}),
    },
    include: { guestLinks: true },
    orderBy: { updatedAt: "desc" },
  });
  const allRecords = events.map((event) => ({
    ...event,
    plan: planSchema.parse(event.plan),
  }));
  const kpi = celebrationKpis(allRecords);
  const records = sortCelebrations(
    allRecords.filter((event) => {
      if (query.status && event.plan.status !== query.status) return false;
      if (query.occasion && event.templateKey !== query.occasion) return false;
      if (query.upcoming === "1") {
        if (!isUpcomingThisMonth(event.plan.date, event.plan.status)) return false;
      }
      if (query.dated === "yes" && !event.plan.date) return false;
      if (query.dated === "no" && event.plan.date) return false;
      return true;
    }),
    query.sort || "latest",
  );
  const occasionOptions = occasions.filter((occasion) =>
    allRecords.some((event) => event.templateKey === occasion.key),
  );
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = nextCelebration(allRecords, today);
  const daysLeft = upcoming ? daysUntil(upcoming.plan.date, today) : null;
  const listView = query.view === "list";

  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={space.id}
      active="celebrations"
      title="Celebrations"
      description="Plan and keep every gathering for this space in one place."
    >
      <div className="celeb-kpi-grid">
        <Link
          href={hrefFor(space.id, query, { status: "", upcoming: "", dated: "" })}
          className={`celeb-kpi${ !query.status && query.upcoming !== "1" ? " is-active" : ""}`}
        >
          <span className="celeb-kpi-icon is-rose">
            <CalendarDays size={18} />
          </span>
          <strong>{kpi.all}</strong>
          <b>Total Celebrations</b>
          <small className={kpi.createdThisMonth ? "is-up" : ""}>
            {kpiDelta(kpi.createdThisMonth)}
          </small>
        </Link>
        <Link
          href={hrefFor(space.id, query, { status: "PLANNING", upcoming: "" })}
          className={`celeb-kpi${query.status === "PLANNING" ? " is-active" : ""}`}
        >
          <span className="celeb-kpi-icon is-peach">
            <Clock size={18} />
          </span>
          <strong>{kpi.planning}</strong>
          <b>Planning</b>
          <small>{kpiDelta(kpi.planningThisMonth)}</small>
        </Link>
        <Link
          href={hrefFor(space.id, query, { upcoming: "1", status: "", dated: "" })}
          className={`celeb-kpi${query.upcoming === "1" ? " is-active" : ""}`}
        >
          <span className="celeb-kpi-icon is-mint">
            <CalendarDays size={18} />
          </span>
          <strong>{kpi.upcomingThisMonth}</strong>
          <b>Upcoming This Month</b>
          <small>
            {kpi.upcomingThisMonth
              ? `+${kpi.upcomingThisMonth} this month`
              : "No upcoming dates"}
          </small>
        </Link>
        <Link
          href={hrefFor(space.id, query, { status: "COMPLETED", upcoming: "" })}
          className={`celeb-kpi${query.status === "COMPLETED" ? " is-active" : ""}`}
        >
          <span className="celeb-kpi-icon is-sage">
            <CircleCheck size={18} />
          </span>
          <strong>{kpi.completed}</strong>
          <b>Completed</b>
          <small className={kpi.completedThisMonth ? "is-up" : ""}>
            {kpiDelta(kpi.completedThisMonth)}
          </small>
        </Link>
        <Link
          href={hrefFor(space.id, query, { status: "ARCHIVED", upcoming: "" })}
          className={`celeb-kpi${query.status === "ARCHIVED" ? " is-active" : ""}`}
        >
          <span className="celeb-kpi-icon is-blush">
            <ClipboardList size={18} />
          </span>
          <strong>{kpi.archived}</strong>
          <b>Archived</b>
          <small>{kpiDelta(kpi.archivedThisMonth)}</small>
        </Link>
        <Link
          href={hrefFor(space.id, query, { status: "DRAFT", upcoming: "" })}
          className={`celeb-kpi${query.status === "DRAFT" ? " is-active" : ""}`}
        >
          <span className="celeb-kpi-icon is-sky">
            <ClipboardList size={18} />
          </span>
          <strong>{kpi.draft}</strong>
          <b>Drafts</b>
          <small>Unpublished plans</small>
        </Link>
      </div>

      <div className="page-actions">
        <Link className="secondary" href={`/templates?space=${space.id}`}>
          <Sparkles size={16} /> Create from template
        </Link>
      </div>

      {upcoming && (
        <section className="celeb-next">
          <div>
            <small>Your next celebration</small>
            <strong>{upcoming.name}</strong>
            <span>
              {upcoming.plan.date
                ? formatPlanDate(upcoming.plan.date, "header")
                : "Date to be decided"}
              {upcoming.plan.location ? ` · ${upcoming.plan.location}` : ""}
            </span>
          </div>
          {daysLeft !== null && (
            <div className="celeb-next-count">
              <b>
                {daysLeft < 0
                  ? "Event date passed"
                  : daysLeft === 0
                    ? "Today"
                    : `${daysLeft} days to go`}
              </b>
              <span
                className="celeb-next-bar"
                style={{
                  ["--celeb-next" as string]: `${countdownProgress(daysLeft)}%`,
                }}
              />
            </div>
          )}
          <div className="celeb-next-links">
            <Link href={`/events/${upcoming.id}`}>
              <Sparkles size={15} /> Plan with AI
            </Link>
            <Link href={`/events/${upcoming.id}`}>
              <Store size={15} /> Find vendors
            </Link>
            <Link href={`/events/${upcoming.id}`}>
              <Users size={15} /> Manage guests
            </Link>
            <Link href={`/events/${upcoming.id}`}>
              <CreditCard size={15} /> Track budget
            </Link>
          </div>
        </section>
      )}

      <form className="filters celeb-board-filters">
        <input type="hidden" name="space" value={space.id} />
        {query.view ? <input type="hidden" name="view" value={query.view} /> : null}
        {query.upcoming ? (
          <input type="hidden" name="upcoming" value={query.upcoming} />
        ) : null}
        {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
        <select name="status" defaultValue={query.status || ""} aria-label="Status">
          <option value="">All statuses</option>
          <option value="DRAFT">Drafts</option>
          <option value="PLANNING">Planning</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          name="occasion"
          defaultValue={query.occasion || ""}
          aria-label="Occasion"
        >
          <option value="">All occasions</option>
          {occasionOptions.map((occasion) => (
            <option key={occasion.key} value={occasion.key}>
              {occasion.name}
            </option>
          ))}
        </select>
        <select name="dated" defaultValue={query.dated || ""} aria-label="Date set">
          <option value="">Any date</option>
          <option value="yes">Date set</option>
          <option value="no">Date TBD</option>
        </select>
        <select name="sort" defaultValue={query.sort || "latest"} aria-label="Sort">
          <option value="latest">Latest first</option>
          <option value="soonest">Soonest date</option>
          <option value="name">Name</option>
        </select>
        <button type="submit" className="secondary">
          Apply
        </button>
        <div className="celeb-view-toggle" role="group" aria-label="Layout">
          <Link
            href={hrefFor(space.id, query, { view: "grid" })}
            className={!listView ? "is-active" : ""}
            aria-current={!listView ? "page" : undefined}
          >
            <LayoutDashboard size={16} />
          </Link>
          <Link
            href={hrefFor(space.id, query, { view: "list" })}
            className={listView ? "is-active" : ""}
            aria-current={listView ? "page" : undefined}
          >
            <ListChecks size={16} />
          </Link>
        </div>
      </form>

      {records.length ? (
        <div className={listView ? "celeb-list" : "celeb-card-grid"}>
          {records.map((event) => (
            <CelebrationItem
              key={event.id}
              event={event}
              listView={listView}
              canWrite={canWrite}
              canDelete={canDelete}
              today={today}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>
            {query.q || query.status || query.occasion || query.dated
              ? "No celebrations match yet"
              : "Your next memory starts here"}
          </h3>
          <p>
            {query.q || query.status || query.occasion || query.dated
              ? "Try clearing filters or choose all celebrations."
              : "Use New event in the header to create one for this space."}
          </p>
        </div>
      )}
    </Shell>
  );
}
