import { occasions, type Plan } from "@/lib/planning";

const DEFAULT_COVERS = new Set(occasions.map((item) => item.key));

export type CelebrationRecord = {
  id: string;
  name: string;
  templateKey: string;
  createdAt: Date;
  updatedAt: Date;
  plan: Plan;
  guestLinks: { maxGuests: number; attending: number }[];
};

const COVER_REV = "3";

export function celebrationCover(templateKey: string, coverUrl = "") {
  const custom = coverUrl.trim();
  if (custom) return custom;
  const file = DEFAULT_COVERS.has(templateKey) ? templateKey : "blank";
  return `/covers/${file}.png?v=${COVER_REV}`;
}

export function guestCapacity(links: CelebrationRecord["guestLinks"]) {
  return links.reduce((sum, link) => sum + link.maxGuests, 0);
}

export function taskProgress(plan: Plan) {
  const total = plan.tasks.length;
  const done = plan.tasks.filter((task) => task.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  if (plan.status === "ARCHIVED") {
    return { label: "Event archived", pct, tone: "archived" as const };
  }
  if (plan.status === "COMPLETED" || (total > 0 && done === total)) {
    return { label: "All tasks completed!", pct: 100, tone: "done" as const };
  }
  if (!total || done === 0) {
    return { label: "Not started yet", pct: 0, tone: "idle" as const };
  }
  return { label: `${pct}% complete`, pct, tone: "progress" as const };
}

function sameMonth(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  );
}

function isoInMonth(iso: string, now: Date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month] = iso.split("-").map(Number);
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

export function isUpcomingThisMonth(
  date: string,
  status: Plan["status"],
  now = new Date(),
) {
  const today = now.toISOString().slice(0, 10);
  return (
    isoInMonth(date, now) &&
    date >= today &&
    status !== "COMPLETED" &&
    status !== "ARCHIVED"
  );
}

export function celebrationKpis(
  records: CelebrationRecord[],
  now = new Date(),
) {
  const createdThisMonth = records.filter((event) =>
    sameMonth(event.createdAt, now),
  ).length;
  const upcomingThisMonth = records.filter((event) =>
    isUpcomingThisMonth(event.plan.date, event.plan.status, now),
  ).length;
  const completedThisMonth = records.filter(
    (event) =>
      event.plan.status === "COMPLETED" && sameMonth(event.updatedAt, now),
  ).length;
  const archivedThisMonth = records.filter(
    (event) =>
      event.plan.status === "ARCHIVED" && sameMonth(event.updatedAt, now),
  ).length;
  const planningThisMonth = records.filter(
    (event) =>
      event.plan.status === "PLANNING" && sameMonth(event.createdAt, now),
  ).length;
  return {
    all: records.length,
    planning: records.filter((event) => event.plan.status === "PLANNING").length,
    completed: records.filter((event) => event.plan.status === "COMPLETED")
      .length,
    archived: records.filter((event) => event.plan.status === "ARCHIVED").length,
    draft: records.filter((event) => event.plan.status === "DRAFT").length,
    upcomingThisMonth,
    createdThisMonth,
    planningThisMonth,
    completedThisMonth,
    archivedThisMonth,
  };
}

export function kpiDelta(count: number) {
  if (count > 0) return `+${count} this month`;
  return "No change";
}

export function nextCelebration(
  records: CelebrationRecord[],
  today = new Date().toISOString().slice(0, 10),
) {
  const open = records.filter(
    (event) => event.plan.status === "DRAFT" || event.plan.status === "PLANNING",
  );
  const upcoming = open
    .filter((event) => event.plan.date && event.plan.date >= today)
    .sort((a, b) => a.plan.date.localeCompare(b.plan.date));
  return upcoming[0] ?? open.find((event) => !event.plan.date) ?? null;
}

export function daysUntil(
  iso: string,
  today = new Date().toISOString().slice(0, 10),
) {
  if (!iso) return null;
  const start = Date.parse(`${today}T00:00:00`);
  const end = Date.parse(`${iso}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 86400000);
}

export function countdownProgress(days: number | null) {
  if (days === null) return 0;
  if (days <= 0) return 100;
  return Math.max(8, Math.min(92, 100 - Math.min(days, 120) * (80 / 120)));
}

export function sortCelebrations(
  records: CelebrationRecord[],
  sort: string,
) {
  const copy = [...records];
  if (sort === "name") {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sort === "soonest") {
    return copy.sort((a, b) => {
      if (!a.plan.date && !b.plan.date) return 0;
      if (!a.plan.date) return 1;
      if (!b.plan.date) return -1;
      return a.plan.date.localeCompare(b.plan.date);
    });
  }
  return copy.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
