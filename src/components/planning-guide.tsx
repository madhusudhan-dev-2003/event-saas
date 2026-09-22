import Link from "next/link";
import {
  CalendarDays,
  CircleCheck,
  ClipboardList,
  CreditCard,
  Link2,
  Sparkles,
  Store,
  Users,
} from "@/components/icons";
import { occasions } from "@/lib/planning";

function href(path: string, spaceId: string) {
  if (!spaceId) return path;
  return `${path}${path.includes("?") ? "&" : "?"}space=${spaceId}`;
}

const STEPS = [
  {
    n: "01",
    title: "Choose a space",
    body: "Each family, personal, or company space has its own people and celebrations. Access does not carry across spaces.",
    href: "/settings",
    cta: "Open settings",
  },
  {
    n: "02",
    title: "Start from an occasion",
    body: "Pick a starter or a blank plan. You only need a name. Tasks, budget lines, and services can be edited later.",
    href: "/templates",
    cta: "Occasion starters",
  },
  {
    n: "03",
    title: "Work the celebration",
    body: "Plan, Guests, Budget, Vendors, and Settings live on the event. The overview flags overdue work and unconfirmed bookings.",
    href: "/celebrations",
    cta: "Open celebrations",
  },
  {
    n: "04",
    title: "Bring people in",
    body: "Invite collaborators to the space, or send a household a private RSVP link. Share the link yourself; there is no public event page.",
    href: "/users",
    cta: "Manage people",
  },
  {
    n: "05",
    title: "Compare, then confirm",
    body: "Shortlisting a provider is a preference. Record confirmation, delivery, and payment only after they actually happen.",
    href: "/providers",
    cta: "Provider directory",
  },
  {
    n: "06",
    title: "Reuse what worked",
    body: "Copy a checklist into a new celebration. Private notes, guests, and payments stay behind.",
    href: "/new",
    cta: "New event",
  },
] as const;

const EVENT_AREAS = [
  {
    title: "Plan",
    icon: CalendarDays,
    body: "Date, venue notes, tasks, functions, and the running order.",
  },
  {
    title: "Guests",
    icon: Users,
    body: "Households, private RSVP links, dietary needs, and check-in.",
  },
  {
    title: "Budget",
    icon: CreditCard,
    body: "Planned, committed, and paid amounts. Visible only with budget access.",
  },
  {
    title: "Vendors",
    icon: Store,
    body: "Services, quotes, and booking status. Directory listings can be shortlisted here.",
  },
] as const;

export function PlanningGuide({
  spaceId,
  query = "",
}: {
  spaceId: string;
  query?: string;
}) {
  const q = query.trim().toLowerCase();
  const steps = STEPS.filter(
    (step) =>
      !q ||
      step.title.toLowerCase().includes(q) ||
      step.body.toLowerCase().includes(q) ||
      step.cta.toLowerCase().includes(q),
  );
  const areas = EVENT_AREAS.filter(
    (area) =>
      !q ||
      area.title.toLowerCase().includes(q) ||
      area.body.toLowerCase().includes(q),
  );
  return (
    <div className="guide-hub">
      <div className="celeb-kpi-grid users-kpi-grid">
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-rose">
            <ClipboardList size={18} />
          </span>
          <b>Guided steps</b>
          <strong>{STEPS.length}</strong>
        </div>
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-peach">
            <Sparkles size={18} />
          </span>
          <b>Occasion starters</b>
          <strong>{occasions.filter((item) => item.key !== "blank").length}</strong>
        </div>
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-sage">
            <CircleCheck size={18} />
          </span>
          <b>Event areas</b>
          <strong>{EVENT_AREAS.length}</strong>
        </div>
        <div className="celeb-kpi">
          <span className="celeb-kpi-icon is-sky">
            <Link2 size={18} />
          </span>
          <b>Public event pages</b>
          <strong>0</strong>
        </div>
      </div>

      <div className="guide-jump">
        <Link href={href("/dashboard", spaceId)}>Dashboard</Link>
        <Link href={href("/celebrations", spaceId)}>Celebrations</Link>
        <Link href={href("/templates", spaceId)}>Occasion starters</Link>
        <Link href={href("/users", spaceId)}>Users</Link>
        <Link href={href("/providers", spaceId)}>Providers</Link>
        <Link href={href("/settings", spaceId)}>Settings</Link>
      </div>

      <section>
        <h2 className="guide-section-title">Work through it in order</h2>
        <div className="guide-step-grid">
          {steps.map((step) => (
            <article className="guide-step" key={step.n}>
              <span className="guide-step-n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <Link href={href(step.href, spaceId)}>{step.cta}</Link>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="guide-section-title">Inside a celebration</h2>
        <div className="guide-area-grid">
          {areas.map((area) => (
            <article className="guide-area" key={area.title}>
              <span className="celeb-kpi-icon is-blush">
                <area.icon size={18} />
              </span>
              <h3>{area.title}</h3>
              <p>{area.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="guide-split">
        <section className="panel">
          <h2>Spaces and access</h2>
          <p>
            Membership is per space. An editor in one family space is not
            automatically an editor in a company space. Roles decide which
            modules a person can open.
          </p>
          <ul className="guide-list">
            <li>Owner — billing and every module</li>
            <li>Administrator — people, roles, and settings, not billing</li>
            <li>Editor — plans, guests, budget, and vendors</li>
            <li>Viewer — read the plan and budget they are allowed to see</li>
          </ul>
          <Link className="secondary" href={href("/settings", spaceId)}>
            Manage access
          </Link>
        </section>
        <section className="panel">
          <h2>Private by default</h2>
          <p>
            Celebrations are not published to the web. Guests and providers only
            see the specific brief or RSVP you put on a private link.
          </p>
          <ul className="guide-list">
            <li>RSVP links are for one household</li>
            <li>Quote links share only the brief you wrote</li>
            <li>Invitation links join a space, not an event page</li>
            <li>Reusing a plan clears guests, notes, and payments</li>
          </ul>
          <Link className="secondary" href={href("/providers", spaceId)}>
            Provider directory
          </Link>
        </section>
      </div>
    </div>
  );
}
