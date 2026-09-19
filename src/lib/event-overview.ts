import { daysUntil } from "./celebration-board";
import { guestSummary, type GuestRecord } from "./guest-board";
import { budgetHealth, budgetTotals } from "./budget-board";
import {
  formatEventStatus,
  formatPlanDate,
  isTaskOverdue,
  planningProgress,
  todayIso,
  type Plan,
} from "./planning";
import { serviceStatusCounts, vendorTotals } from "./vendor-board";

export type OverviewSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export function rsvpSlices(guests: GuestRecord[]): OverviewSlice[] {
  const active = guests.filter((g) => !g.revoked);
  const count = (response: string) =>
    active.filter((g) => g.response === response).length;
  return [
    { key: "yes", label: "Attending", value: count("YES"), color: "#5d7a4c" },
    { key: "maybe", label: "Maybe", value: count("MAYBE"), color: "#c4a36a" },
    { key: "pending", label: "Waiting", value: count("PENDING"), color: "#b0786a" },
    { key: "no", label: "Declined", value: count("NO"), color: "#8a7378" },
  ];
}

export function taskSlices(plan: Plan): OverviewSlice[] {
  const progress = planningProgress(plan.tasks);
  return [
    {
      key: "done",
      label: "Done",
      value: progress.completedTasks,
      color: "#5d7a4c",
    },
    {
      key: "moving",
      label: "In motion",
      value: progress.inProgressTasks + progress.openTasks,
      color: "#c4a36a",
    },
    {
      key: "left",
      label: "Not started",
      value: progress.notStartedTasks,
      color: "#d8c6c0",
    },
  ];
}

export function moneySlices(plan: Plan): OverviewSlice[] {
  const totals = budgetTotals(plan.budget);
  const remaining = Math.max(0, totals.planned - totals.committed);
  return [
    { key: "paid", label: "Paid", value: totals.paid, color: "#5d7a4c" },
    {
      key: "held",
      label: "Committed",
      value: Math.max(0, totals.committed - totals.paid),
      color: "#c4a36a",
    },
    {
      key: "open",
      label: "Still open",
      value: remaining,
      color: "#eadfd8",
    },
  ];
}

export function eventOverview(
  plan: Plan,
  guests: GuestRecord[],
  today = todayIso(),
) {
  const progress = planningProgress(plan.tasks);
  const guestsView = guestSummary(guests);
  const money = budgetTotals(plan.budget);
  const vendors = serviceStatusCounts(plan.services);
  const vendorMoney = vendorTotals(plan.services);
  const days = daysUntil(plan.date, today);
  const overdueTasks = plan.tasks.filter((task) => isTaskOverdue(task, today));
  const upcoming = [...plan.tasks]
    .filter((task) => !task.done)
    .sort((a, b) => {
      const aOver = isTaskOverdue(a, today) ? 0 : 1;
      const bOver = isTaskOverdue(b, today) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return (a.due || "9999").localeCompare(b.due || "9999");
    })
    .slice(0, 6);

  const categories = Object.values(
    plan.budget.reduce<
      Record<string, { category: string; planned: number; paid: number }>
    >((acc, item) => {
      const key = item.category.trim() || "Other";
      acc[key] ??= { category: key, planned: 0, paid: 0 };
      acc[key].planned += item.planned;
      acc[key].paid += item.paid;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.planned - a.planned)
    .slice(0, 5);

  const vendorReady =
    plan.services.length === 0
      ? 0
      : Math.round(
          ((vendors.CONFIRMED + vendors.DELIVERED + vendors.PAID) /
            plan.services.length) *
            100,
        );
  const moneyReady =
    money.planned === 0
      ? 0
      : Math.min(100, Math.round((money.paid / money.planned) * 100));
  const readiness = Math.round(
    (progress.progressPercent +
      guestsView.responseRate +
      moneyReady +
      vendorReady) /
      4,
  );

  let clockLabel = "Pick a date to start the countdown";
  let clockValue = "—";
  if (days === 0) {
    clockValue = "Today";
    clockLabel = "The celebration is today";
  } else if (days === 1) {
    clockValue = "1 day";
    clockLabel = "Tomorrow";
  } else if (days !== null && days > 1) {
    clockValue = `${days}`;
    clockLabel = "days until the celebration";
  } else if (days !== null && days < 0) {
    clockValue = `${Math.abs(days)}`;
    clockLabel =
      days === -1 ? "day since the celebration" : "days since the celebration";
  }

  return {
    progress,
    guests: guestsView,
    rsvp: rsvpSlices(guests),
    tasks: taskSlices(plan),
    moneySlices: moneySlices(plan),
    money,
    moneyHealth: budgetHealth(money.planned, money.committed),
    vendors,
    vendorMoney,
    vendorReady,
    days,
    clockValue,
    clockLabel,
    dateLabel: plan.date ? formatPlanDate(plan.date, "header") : "Date open",
    statusLabel: formatEventStatus(plan.status),
    overdueCount: overdueTasks.length,
    upcoming,
    categories,
    readiness,
    confirmedGuests: guestsView.confirmed,
  };
}

export function sliceTotal(slices: OverviewSlice[]) {
  return slices.reduce((n, slice) => n + slice.value, 0);
}
