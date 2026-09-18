"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleCheck,
  Clock,
  Coins,
  Eye,
  Flower2,
  MapPin,
  Music,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  Utensils,
} from "@/components/icons";
import { formatMoney, type Plan } from "@/lib/planning";
import {
  budgetCategoryIcon,
  budgetHealthLabel,
  budgetInsights,
  budgetRowStatus,
  budgetStatusLabel,
  budgetTotals,
  filterAndSortBudget,
  formatBudgetDue,
  type BudgetFilters,
  type BudgetItem,
  type BudgetSort,
} from "@/lib/budget-board";

const CURRENCIES: Plan["currency"][] = [
  "USD",
  "INR",
  "GBP",
  "EUR",
  "CAD",
  "AUD",
];

function CategoryIcon({ category }: { category: string }) {
  const kind = budgetCategoryIcon(category);
  const props = { size: 16, strokeWidth: 1.8 };
  if (kind === "flower") return <Flower2 {...props} />;
  if (kind === "utensils") return <Utensils {...props} />;
  if (kind === "pin") return <MapPin {...props} />;
  if (kind === "music") return <Music {...props} />;
  if (kind === "eye") return <Eye {...props} />;
  if (kind === "sparkles") return <Sparkles {...props} />;
  return <Coins {...props} />;
}

function priorityLabel(priority: BudgetItem["priority"]) {
  if (priority === "HIGH") return "High";
  if (priority === "LOW") return "Low";
  return "Medium";
}

function CurrencyPicker({
  value,
  canManage,
  disabled,
  onChange,
}: {
  value: Plan["currency"];
  canManage: boolean;
  disabled: boolean;
  onChange: (currency: Plan["currency"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const trigger = (
    <>
      <span>{value}</span>
      <span className="budget-currency-dot" aria-hidden />
    </>
  );

  if (!canManage) {
    return (
      <span className="budget-currency is-static" aria-label="Budget currency">
        {trigger}
      </span>
    );
  }

  return (
    <div className="budget-currency-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`budget-currency${open ? " is-open" : ""}`}
        aria-label="Budget currency"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
      </button>
      {open && (
        <ul className="budget-currency-menu" role="listbox" aria-label="Currencies">
          {CURRENCIES.map((code) => (
            <li key={code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={code === value}
                className={code === value ? "is-selected" : undefined}
                onClick={() => {
                  onChange(code);
                  setOpen(false);
                }}
              >
                {code}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BudgetTab({
  plan,
  canManage,
  pending,
  onAdd,
  onEdit,
  onDelete,
  onCurrencyChange,
}: {
  plan: Plan;
  canManage: boolean;
  pending: boolean;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onCurrencyChange: (currency: Plan["currency"]) => void;
}) {
  const [filters, setFilters] = useState<BudgetFilters>({
    query: "",
    spend: "all",
    priority: "all",
    sort: "category",
  });
  const totals = budgetTotals(plan.budget);
  const rows = filterAndSortBudget(plan.budget, filters);
  const today = new Date().toISOString().slice(0, 10);
  const insights = budgetInsights(plan.budget, today);
  const filtersActive =
    filters.query.trim() !== "" ||
    filters.spend !== "all" ||
    filters.priority !== "all";
  const plannedShare =
    totals.planned > 0
      ? Math.round((totals.committed / totals.planned) * 100)
      : 0;
  const paidShare =
    totals.planned > 0 ? Math.round((totals.paid / totals.planned) * 100) : 0;
  const remainingShare =
    totals.planned > 0
      ? Math.round((totals.remaining / totals.planned) * 100)
      : 0;

  return (
    <div className="budget-tab">
      <section className="budget-overview-card">
        <div className="budget-overview-head">
          <div>
            <h2>Budget overview</h2>
            <p>
              Track planned, committed, and paid costs without transferring
              money.
            </p>
          </div>
          <div className="budget-overview-meta">
            <CurrencyPicker
              value={plan.currency}
              canManage={canManage}
              disabled={pending}
              onChange={onCurrencyChange}
            />
            <span className={`budget-health budget-health-${totals.health}`}>
              <strong>{budgetHealthLabel(totals.health)}</strong>
              {totals.planned > 0 && (
                <small>
                  {paidShare}% paid · {plannedShare}% committed
                </small>
              )}
            </span>
          </div>
        </div>

        <div className="guest-metrics budget-metrics">
          <article className="guest-metric guest-metric-rose">
            <span className="guest-metric-icon">
              <Coins size={18} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{formatMoney(totals.planned, plan.currency)}</strong>
              <h3>Planned</h3>
              <p>Total budget across all categories</p>
            </div>
          </article>
          <article className="guest-metric guest-metric-slate">
            <span className="guest-metric-icon">
              <Users size={18} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{formatMoney(totals.committed, plan.currency)}</strong>
              <h3>Committed</h3>
              <p>
                {totals.planned > 0 ? `${plannedShare}% of planned` : "No plan yet"}
              </p>
            </div>
          </article>
          <article className="guest-metric guest-metric-green">
            <span className="guest-metric-icon">
              <CircleCheck size={18} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{formatMoney(totals.paid, plan.currency)}</strong>
              <h3>Paid</h3>
              <p>
                {totals.planned > 0 ? `${paidShare}% of planned` : "No plan yet"}
              </p>
            </div>
          </article>
          <article className="guest-metric guest-metric-amber">
            <span className="guest-metric-icon">
              <Clock size={18} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{formatMoney(totals.remaining, plan.currency)}</strong>
              <h3>Remaining</h3>
              <p>
                {totals.planned > 0
                  ? `${remainingShare}% left to commit`
                  : "No plan yet"}
              </p>
            </div>
          </article>
        </div>

        {totals.planned > 0 ? (
          <>
            <div
              className="budget-bar"
              role="img"
              aria-label="Budget spend breakdown"
            >
              <span
                className="budget-bar-paid"
                style={{ flexGrow: Math.max(totals.paidPercent, 0) }}
              />
              <span
                className="budget-bar-committed"
                style={{
                  flexGrow: Math.max(totals.committedUnpaidPercent, 0),
                }}
              />
              <span
                className="budget-bar-remaining"
                style={{ flexGrow: Math.max(totals.remainingPercent, 0) }}
              />
            </div>
            <ul className="budget-legend">
              <li>
                <span className="budget-dot is-paid" />
                Paid {formatMoney(totals.paid, plan.currency)} (
                {Math.round(totals.paidPercent)}%)
              </li>
              <li>
                <span className="budget-dot is-committed" />
                Committed (unpaid){" "}
                {formatMoney(totals.committedUnpaid, plan.currency)} (
                {Math.round(totals.committedUnpaidPercent)}%)
              </li>
              <li>
                <span className="budget-dot is-remaining" />
                Remaining {formatMoney(totals.remaining, plan.currency)} (
                {Math.round(totals.remainingPercent)}%)
              </li>
            </ul>
          </>
        ) : (
          <p className="budget-bar-empty">
            Add planned amounts to see how spend is tracking.
          </p>
        )}
      </section>

      <section className="budget-categories-card">
        <div className="plan-tasks-head">
          <div>
            <h2>Budget categories</h2>
            <p>
              Manage event spending by category. Keep track of vendors, due
              dates and payment status.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn-add"
              disabled={pending}
              onClick={onAdd}
            >
              <Plus size={16} />
              Add category
            </button>
          )}
        </div>

        {plan.budget.length > 0 && (
          <div className="plan-toolbar guest-toolbar">
            <div className="plan-toolbar-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Search categories, vendors, notes..."
                value={filters.query}
                onChange={(e) =>
                  setFilters({ ...filters, query: e.target.value })
                }
                aria-label="Search budget categories"
              />
            </div>
            <select
              value={filters.spend}
              aria-label="All spend status"
              onChange={(e) =>
                setFilters({
                  ...filters,
                  spend: e.target.value as BudgetFilters["spend"],
                })
              }
            >
              <option value="all">All spend status</option>
              <option value="planned">Planned</option>
              <option value="committed">Committed</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="over">Over budget</option>
            </select>
            <select
              value={filters.priority}
              aria-label="All priorities"
              onChange={(e) =>
                setFilters({
                  ...filters,
                  priority: e.target.value as BudgetFilters["priority"],
                })
              }
            >
              <option value="all">All priorities</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <div className="plan-sort">
              <span>Sort by</span>
              <select
                value={filters.sort}
                aria-label="Sort budget categories"
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sort: e.target.value as BudgetSort,
                  })
                }
              >
                <option value="category">Category</option>
                <option value="planned">Planned amount</option>
                <option value="spend">Highest spend</option>
                <option value="due">Due date</option>
                <option value="recent">Recently added</option>
              </select>
            </div>
          </div>
        )}

        {!plan.budget.length ? (
          <div className="plan-empty">
            <h3>No budget categories yet</h3>
            <p>Start planning your event spending.</p>
            {canManage && (
              <div className="plan-empty-actions">
                <button type="button" className="btn-add" onClick={onAdd}>
                  <Plus size={16} />
                  Add category
                </button>
              </div>
            )}
          </div>
        ) : !rows.length ? (
          <div className="plan-empty">
            <h3>No budget categories match these filters.</h3>
            {filtersActive && (
              <div className="plan-empty-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setFilters({
                      query: "",
                      spend: "all",
                      priority: "all",
                      sort: filters.sort,
                    })
                  }
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="plan-table-wrap">
              <table className="plan-table budget-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Vendor</th>
                    <th>Due</th>
                    <th>Planned ({plan.currency})</th>
                    <th>Committed ({plan.currency})</th>
                    <th>Paid ({plan.currency})</th>
                    <th>Status</th>
                    {canManage && (
                      <th className="plan-col-actions">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const index = plan.budget.findIndex((b) => b.id === item.id);
                    const status = budgetRowStatus(item);
                    return (
                      <tr
                        key={item.id}
                        className={status === "over" ? "budget-row-over" : undefined}
                      >
                        <td>
                          <span className="budget-category">
                            <span className="budget-category-icon">
                              <CategoryIcon category={item.category} />
                            </span>
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`guest-pill guest-priority-${item.priority.toLowerCase()}`}
                          >
                            {priorityLabel(item.priority)}
                          </span>
                        </td>
                        <td>
                          {item.vendor.trim() || (
                            <span className="guest-muted">Not set</span>
                          )}
                        </td>
                        <td>
                          {item.dueDate ? (
                            formatBudgetDue(item.dueDate)
                          ) : (
                            <span className="guest-muted">Not set</span>
                          )}
                        </td>
                        <td>{formatMoney(item.planned, plan.currency)}</td>
                        <td>{formatMoney(item.committed, plan.currency)}</td>
                        <td>{formatMoney(item.paid, plan.currency)}</td>
                        <td>
                          <span className={`guest-pill budget-status-${status}`}>
                            {budgetStatusLabel(status)}
                          </span>
                        </td>
                        {canManage && (
                          <td>
                            <div className="plan-row-actions">
                              <button
                                type="button"
                                className="plan-icon-btn"
                                title="Edit category"
                                aria-label={`Edit ${item.category}`}
                                disabled={pending}
                                onClick={() => onEdit(index)}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="plan-icon-btn is-danger"
                                title="Delete category"
                                aria-label={`Delete ${item.category}`}
                                disabled={pending}
                                onClick={() => onDelete(index)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="plan-card-list">
              {rows.map((item) => {
                const index = plan.budget.findIndex((b) => b.id === item.id);
                const status = budgetRowStatus(item);
                return (
                  <article key={item.id} className="plan-task-card">
                    <header>
                      <strong>{item.category}</strong>
                      <span className={`guest-pill budget-status-${status}`}>
                        {budgetStatusLabel(status)}
                      </span>
                    </header>
                    <dl>
                      <div>
                        <dt>Vendor</dt>
                        <dd>{item.vendor.trim() || "Not set"}</dd>
                      </div>
                      <div>
                        <dt>Due</dt>
                        <dd>{formatBudgetDue(item.dueDate) || "Not set"}</dd>
                      </div>
                      <div>
                        <dt>Planned</dt>
                        <dd>{formatMoney(item.planned, plan.currency)}</dd>
                      </div>
                      <div>
                        <dt>Committed</dt>
                        <dd>{formatMoney(item.committed, plan.currency)}</dd>
                      </div>
                      <div>
                        <dt>Paid</dt>
                        <dd>{formatMoney(item.paid, plan.currency)}</dd>
                      </div>
                    </dl>
                    {canManage && (
                      <div className="plan-row-actions">
                        <button
                          type="button"
                          className="plan-icon-btn"
                          title="Edit category"
                          aria-label={`Edit ${item.category}`}
                          onClick={() => onEdit(index)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="plan-icon-btn is-danger"
                          title="Delete category"
                          aria-label={`Delete ${item.category}`}
                          onClick={() => onDelete(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}

        {(insights.topSpend ||
          insights.upcomingPayment ||
          insights.unpaidCount > 0 ||
          totals.planned > 0) && (
          <ul className="budget-insights">
            {insights.topSpend && (
              <li>
                <strong>Top spend</strong>
                <p>
                  {insights.topSpend.category}
                  <span>
                    {formatMoney(insights.topSpend.planned, plan.currency)}{" "}
                    planned ({insights.topSpend.share}% of total)
                  </span>
                </p>
              </li>
            )}
            {insights.upcomingPayment && (
              <li>
                <strong>Upcoming payment</strong>
                <p>
                  {insights.upcomingPayment.category} due{" "}
                  {formatBudgetDue(insights.upcomingPayment.dueDate)}
                  <span>
                    {formatMoney(
                      insights.upcomingPayment.unpaid,
                      plan.currency,
                    )}{" "}
                    still unpaid
                  </span>
                </p>
              </li>
            )}
            {insights.unpaidCount > 0 && (
              <li>
                <strong>
                  {insights.unpaidCount} categor
                  {insights.unpaidCount === 1 ? "y" : "ies"} not fully paid
                </strong>
                <p>
                  Payments pending:{" "}
                  {formatMoney(insights.unpaidAmount, plan.currency)}
                </p>
              </li>
            )}
            {totals.planned > 0 && (
              <li>
                <strong>
                  {totals.health === "on_track"
                    ? "All good!"
                    : "Needs attention"}
                </strong>
                <p>
                  {totals.health === "over"
                    ? "Committed spend is above the planned budget."
                    : totals.health === "near_limit"
                      ? "Committed spend is close to the planned total."
                      : "You’re on track for a memorable celebration."}
                </p>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
