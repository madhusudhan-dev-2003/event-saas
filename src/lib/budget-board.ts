import type { Plan } from "./planning";

export type BudgetItem = Plan["budget"][number];
export type BudgetSpendStatus =
  | "planned"
  | "committed"
  | "partial"
  | "paid"
  | "over";
export type BudgetSort = "category" | "planned" | "spend" | "due" | "recent";
export type BudgetHealth = "on_track" | "near_limit" | "over";

export type BudgetFilters = {
  query: string;
  spend: "all" | BudgetSpendStatus;
  priority: "all" | "HIGH" | "NORMAL" | "LOW";
  sort: BudgetSort;
};

export function budgetRowStatus(item: BudgetItem): BudgetSpendStatus {
  if (item.committed > item.planned) return "over";
  if (item.paid >= item.committed && item.committed > 0) return "paid";
  if (item.paid > 0 && item.paid < item.committed) return "partial";
  if (item.committed > 0 && item.paid === 0) return "committed";
  return "planned";
}

export function budgetStatusLabel(status: BudgetSpendStatus) {
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partial";
  if (status === "committed") return "Committed";
  if (status === "over") return "Over budget";
  return "Planned";
}

export function budgetHealth(planned: number, committed: number): BudgetHealth {
  if (committed > planned) return "over";
  if (planned > 0 && committed / planned >= 0.9) return "near_limit";
  return "on_track";
}

export function budgetHealthLabel(health: BudgetHealth) {
  if (health === "over") return "Over budget";
  if (health === "near_limit") return "Near limit";
  return "On track";
}

export function budgetTotals(items: BudgetItem[]) {
  const planned = items.reduce((n, b) => n + b.planned, 0);
  const committed = items.reduce((n, b) => n + b.committed, 0);
  const paid = items.reduce((n, b) => n + b.paid, 0);
  const remaining = Math.max(planned - committed, 0);
  const committedUnpaid = Math.max(committed - paid, 0);
  const paidPercent = planned > 0 ? (paid / planned) * 100 : 0;
  const committedUnpaidPercent =
    planned > 0 ? (committedUnpaid / planned) * 100 : 0;
  const remainingPercent = Math.max(
    100 - paidPercent - committedUnpaidPercent,
    0,
  );
  return {
    planned,
    committed,
    paid,
    remaining,
    committedUnpaid,
    paidPercent,
    committedUnpaidPercent,
    remainingPercent,
    health: budgetHealth(planned, committed),
  };
}

export function formatBudgetDue(due: string) {
  if (!due.trim()) return "";
  const parsed = new Date(`${due}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return due;
  return parsed.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function filterAndSortBudget(
  items: BudgetItem[],
  filters: BudgetFilters,
) {
  const q = filters.query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesQuery =
      !q ||
      item.category.toLowerCase().includes(q) ||
      item.vendor.toLowerCase().includes(q) ||
      item.notes.toLowerCase().includes(q);
    const status = budgetRowStatus(item);
    const matchesSpend = filters.spend === "all" || status === filters.spend;
    const matchesPriority =
      filters.priority === "all" || item.priority === filters.priority;
    return matchesQuery && matchesSpend && matchesPriority;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === "planned") return b.planned - a.planned;
    if (filters.sort === "spend") return b.committed - a.committed;
    if (filters.sort === "due") {
      if (!a.dueDate && !b.dueDate) return a.category.localeCompare(b.category);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (filters.sort === "recent") return b.id.localeCompare(a.id);
    return a.category.localeCompare(b.category);
  });
}

export function budgetInsights(items: BudgetItem[], today = "") {
  const totals = budgetTotals(items);
  const top = [...items].sort((a, b) => b.planned - a.planned)[0];
  const unpaid = items.filter((b) => b.paid < b.committed && b.committed > 0);
  const upcoming = unpaid
    .filter((b) => b.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const topShare =
    totals.planned > 0 && top ? Math.round((top.planned / totals.planned) * 100) : 0;

  return {
    topSpend:
      top && top.planned > 0
        ? { category: top.category, planned: top.planned, share: topShare }
        : null,
    upcomingPayment: upcoming
      ? {
          category: upcoming.category,
          dueDate: upcoming.dueDate,
          unpaid: upcoming.committed - upcoming.paid,
          overdue: Boolean(today && upcoming.dueDate < today),
        }
      : null,
    unpaidCount: unpaid.length,
    unpaidAmount: unpaid.reduce((n, b) => n + (b.committed - b.paid), 0),
    health: totals.health,
  };
}

export function budgetCategoryIcon(category: string) {
  const value = category.toLowerCase();
  if (/(cake|dessert|bakery|sweet)/.test(value)) return "flower";
  if (/(cater|food|meal|dining|menu)/.test(value)) return "utensils";
  if (/(venue|hall|location|place)/.test(value)) return "pin";
  if (/(music|dj|entertain|band)/.test(value)) return "music";
  if (/(photo|video|camera)/.test(value)) return "eye";
  if (/(decor|flower|floral)/.test(value)) return "sparkles";
  return "coins";
}
