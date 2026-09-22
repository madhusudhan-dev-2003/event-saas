import { describe, expect, it } from "vitest";
import {
  budgetHealth,
  budgetInsights,
  budgetRowStatus,
  budgetTotals,
  filterAndSortBudget,
  type BudgetItem,
} from "./budget-board";

function item(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: "a",
    category: "Cake",
    planned: 50000,
    committed: 50000,
    paid: 50000,
    notes: "deposit",
    vendor: "Sweet Crumbs",
    priority: "NORMAL",
    dueDate: "2025-06-10",
    ...overrides,
  };
}

describe("budget totals and health", () => {
  it("sums minor units and derives remaining from committed", () => {
    const totals = budgetTotals([
      item(),
      item({
        id: "b",
        category: "Venue",
        planned: 300000,
        committed: 200000,
        paid: 150000,
      }),
    ]);
    expect(totals.planned).toBe(350000);
    expect(totals.committed).toBe(250000);
    expect(totals.paid).toBe(200000);
    expect(totals.remaining).toBe(100000);
    expect(totals.committedUnpaid).toBe(50000);
    expect(totals.health).toBe("on_track");
  });

  it("marks over budget and near limit", () => {
    expect(budgetHealth(100, 101)).toBe("over");
    expect(budgetHealth(0, 10)).toBe("over");
    expect(budgetHealth(100, 90)).toBe("near_limit");
    expect(budgetHealth(100, 50)).toBe("on_track");
  });
});

describe("budget row status", () => {
  it("derives payment status from amounts", () => {
    expect(budgetRowStatus(item())).toBe("paid");
    expect(
      budgetRowStatus(item({ paid: 10000, committed: 50000 })),
    ).toBe("partial");
    expect(budgetRowStatus(item({ paid: 0, committed: 20000 }))).toBe(
      "committed",
    );
    expect(budgetRowStatus(item({ paid: 0, committed: 0 }))).toBe("planned");
    expect(
      budgetRowStatus(item({ planned: 100, committed: 200, paid: 50 })),
    ).toBe("over");
  });
});

describe("budget filters", () => {
  const items = [
    item(),
    item({
      id: "b",
      category: "Venue",
      vendor: "The Pavilion",
      notes: "",
      planned: 300000,
      committed: 200000,
      paid: 0,
      priority: "HIGH",
      dueDate: "2025-06-20",
    }),
  ];

  it("searches category, vendor, and notes", () => {
    expect(
      filterAndSortBudget(items, {
        query: "deposit",
        spend: "all",
        priority: "all",
        sort: "category",
      }).map((b) => b.id),
    ).toEqual(["a"]);
  });

  it("filters spend and sorts by planned", () => {
    expect(
      filterAndSortBudget(items, {
        query: "",
        spend: "committed",
        priority: "all",
        sort: "category",
      }).map((b) => b.id),
    ).toEqual(["b"]);
    expect(
      filterAndSortBudget(items, {
        query: "",
        spend: "all",
        priority: "all",
        sort: "planned",
      })[0].category,
    ).toBe("Venue");
  });
});

describe("budget insights", () => {
  it("hides empty insights and finds unpaid dues", () => {
    const empty = budgetInsights([]);
    expect(empty.topSpend).toBeNull();
    expect(empty.upcomingPayment).toBeNull();
    expect(empty.unpaidCount).toBe(0);

    const insights = budgetInsights([
      item({ planned: 100000, committed: 100000, paid: 100000 }),
      item({
        id: "b",
        category: "Decor",
        planned: 20000,
        committed: 15000,
        paid: 0,
        dueDate: "2025-06-15",
      }),
    ]);
    expect(insights.topSpend?.category).toBe("Cake");
    expect(insights.upcomingPayment?.category).toBe("Decor");
    expect(insights.unpaidCount).toBe(1);
  });
});
