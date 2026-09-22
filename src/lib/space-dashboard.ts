import { daysUntil } from "./celebration-board";
import { budgetTotals } from "./budget-board";
import {
  formatEventStatus,
  formatPlanDate,
  isTaskOverdue,
  nextActions,
  occasions,
  todayIso,
  type Plan,
} from "./planning";
import { serviceStatusCounts } from "./vendor-board";

export type DashboardGuest = {
  response: string;
  attending: number;
  maxGuests: number;
  revokedAt: Date | null;
  checkedIn: boolean;
};

export type DashboardEvent = {
  id: string;
  name: string;
  templateKey: string;
  updatedAt: Date;
  plan: Plan;
  guestLinks: DashboardGuest[];
};

export type DashboardQuotes = {
  total: number;
  awaiting: number;
  replied: number;
};

export type DashboardAttention = {
  id: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
};

function occasionName(key: string) {
  return occasions.find((item) => item.key === key)?.name || key;
}

function isOpen(status: Plan["status"]) {
  return status === "DRAFT" || status === "PLANNING";
}

function liveGuests(links: DashboardGuest[]) {
  return links.filter((link) => !link.revokedAt);
}

export function buildSpaceDashboard(
  events: DashboardEvent[],
  extras: {
    members: number;
    pendingInvites: number;
    roles: number;
    providers: number;
    quotes: DashboardQuotes;
  },
  today = todayIso(),
) {
  const byStatus = {
    DRAFT: events.filter((e) => e.plan.status === "DRAFT").length,
    PLANNING: events.filter((e) => e.plan.status === "PLANNING").length,
    COMPLETED: events.filter((e) => e.plan.status === "COMPLETED").length,
    ARCHIVED: events.filter((e) => e.plan.status === "ARCHIVED").length,
  };
  const active = events.filter((e) => isOpen(e.plan.status));
  const dated = active
    .filter((e) => e.plan.date)
    .sort((a, b) => a.plan.date.localeCompare(b.plan.date));
  const upcomingEvents = dated
    .filter((e) => e.plan.date >= today)
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      name: e.name,
      date: e.plan.date,
      dateLabel: formatPlanDate(e.plan.date),
      location: e.plan.location,
      status: formatEventStatus(e.plan.status),
      days: daysUntil(e.plan.date, today),
      href: `/events/${e.id}`,
    }));
  const nextEvent =
    upcomingEvents[0] ||
    dated[0] ||
    active[0] ||
    null;
  const nextPlan = nextEvent
    ? events.find((e) => e.id === nextEvent.id)
    : null;
  const nextAction = nextPlan ? nextActions(nextPlan.plan, today)[0] : null;

  let rsvpYes = 0;
  let rsvpNo = 0;
  let rsvpMaybe = 0;
  let rsvpPending = 0;
  let attending = 0;
  let capacity = 0;
  let checkedIn = 0;
  let households = 0;
  let openTasks = 0;
  let doneTasks = 0;
  let overdueTasks = 0;
  let highPriority = 0;
  let services = 0;
  let functions = 0;
  let food = 0;
  let fittings = 0;
  const vendorCounts = {
    SHORTLISTED: 0,
    SELECTED: 0,
    CONFIRMED: 0,
    DELIVERED: 0,
    PAID: 0,
  };
  const allBudget: Plan["budget"] = [];
  const occasionMap: Record<string, number> = {};
  const categoryMap: Record<string, number> = {};
  const attention: DashboardAttention[] = [];

  for (const event of events) {
    occasionMap[event.templateKey] = (occasionMap[event.templateKey] || 0) + 1;
    const guests = liveGuests(event.guestLinks);
    households += guests.length;
    for (const guest of guests) {
      capacity += guest.maxGuests;
      if (guest.response === "YES") {
        rsvpYes += 1;
        attending += guest.attending;
      } else if (guest.response === "NO") rsvpNo += 1;
      else if (guest.response === "MAYBE") rsvpMaybe += 1;
      else rsvpPending += 1;
      if (guest.checkedIn) checkedIn += 1;
    }
    for (const task of event.plan.tasks) {
      if (task.done) doneTasks += 1;
      else {
        openTasks += 1;
        if (isTaskOverdue(task, today)) overdueTasks += 1;
        if (task.priority === "HIGH") highPriority += 1;
      }
    }
    allBudget.push(...event.plan.budget);
    for (const item of event.plan.budget) {
      const key = item.category.trim() || "Other";
      categoryMap[key] = (categoryMap[key] || 0) + item.planned;
    }
    const vendors = serviceStatusCounts(event.plan.services);
    services += vendors.all;
    vendorCounts.SHORTLISTED += vendors.SHORTLISTED;
    vendorCounts.SELECTED += vendors.SELECTED;
    vendorCounts.CONFIRMED += vendors.CONFIRMED;
    vendorCounts.DELIVERED += vendors.DELIVERED;
    vendorCounts.PAID += vendors.PAID;
    functions += event.plan.functions.length;
    food += event.plan.food.length;
    fittings += event.plan.preparation.length;

    if (isOpen(event.plan.status) && !event.plan.date) {
      attention.push({
        id: `date-${event.id}`,
        title: `${event.name} has no date`,
        detail: "Add a date so countdown and task deadlines can run.",
        href: `/events/${event.id}`,
        cta: "Set date",
      });
    }
    const overdue = event.plan.tasks.filter((task) =>
      isTaskOverdue(task, today),
    );
    if (overdue.length) {
      attention.push({
        id: `overdue-${event.id}`,
        title: `${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"}`,
        detail: `${event.name} · ${overdue[0].title}`,
        href: `/events/${event.id}`,
        cta: "Open plan",
      });
    }
    const waiting = guests.filter((g) => g.response === "PENDING").length;
    if (waiting && isOpen(event.plan.status)) {
      attention.push({
        id: `rsvp-${event.id}`,
        title: `${waiting} waiting RSVP${waiting === 1 ? "" : "s"}`,
        detail: event.name,
        href: `/events/${event.id}`,
        cta: "Guests",
      });
    }
    const selected = event.plan.services.filter((s) => s.status === "SELECTED")
      .length;
    if (selected) {
      attention.push({
        id: `vendor-${event.id}`,
        title: `${selected} vendor${selected === 1 ? "" : "s"} still unconfirmed`,
        detail: event.name,
        href: `/events/${event.id}`,
        cta: "Vendors",
      });
    }
  }

  const money = budgetTotals(allBudget);
  if (money.health === "over") {
    attention.unshift({
      id: "budget-over",
      title: "Committed spend is over the planned budget",
      detail: "Review budget lines before more bookings.",
      href: "/celebrations",
      cta: "Celebrations",
    });
  }

  const occasionBars = Object.entries(occasionMap)
    .map(([key, value]) => ({ label: occasionName(key), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const categoryBars = Object.entries(categoryMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const list = [...events]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((e) => {
      const guests = liveGuests(e.guestLinks);
      const yes = guests.filter((g) => g.response === "YES");
      return {
        id: e.id,
        name: e.name,
        templateKey: e.templateKey,
        coverUrl: e.plan.coverUrl,
        date: e.plan.date,
        dateLabel: e.plan.date ? formatPlanDate(e.plan.date) : "Date TBD",
        location: e.plan.location,
        status: formatEventStatus(e.plan.status),
        statusKey: e.plan.status.toLowerCase(),
        done: e.plan.tasks.filter((t) => t.done).length,
        total: e.plan.tasks.length,
        attending: yes.reduce((n, g) => n + g.attending, 0),
        guests: guests.reduce((n, g) => n + g.maxGuests, 0),
        href: `/events/${e.id}`,
      };
    });

  return {
    totals: {
      celebrations: events.length,
      active: active.length,
      completed: byStatus.COMPLETED,
      households,
      attending,
      capacity,
      checkedIn,
      openTasks,
      doneTasks,
      overdueTasks,
      highPriority,
      members: extras.members,
      pendingInvites: extras.pendingInvites,
      roles: extras.roles,
      providers: extras.providers,
      services,
      functions,
      food,
      fittings,
      quotesAwaiting: extras.quotes.awaiting,
      quotesReplied: extras.quotes.replied,
      quotesTotal: extras.quotes.total,
    },
    byStatus,
    rsvp: {
      yes: rsvpYes,
      no: rsvpNo,
      maybe: rsvpMaybe,
      pending: rsvpPending,
    },
    vendorCounts,
    money,
    currency: events[0]?.plan.currency || "USD",
    occasionBars,
    categoryBars,
    attention: attention.slice(0, 8),
    upcoming: upcomingEvents,
    next: nextPlan
      ? {
          id: nextPlan.id,
          name: nextPlan.name,
          href: `/events/${nextPlan.id}`,
          dateLabel: nextPlan.plan.date
            ? formatPlanDate(nextPlan.plan.date, "header")
            : "Date open",
          location: nextPlan.plan.location,
          days: nextPlan.plan.date
            ? daysUntil(nextPlan.plan.date, today)
            : null,
          actionTitle: nextAction?.title || nextPlan.name,
          actionReason:
            nextAction?.reason || "Continue planning this celebration.",
        }
      : null,
    recent: list.slice(0, 6),
    list,
  };
}
