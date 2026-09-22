"use client";

import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  Store,
} from "@/components/icons";
import {
  eventOverview,
  sliceTotal,
  type OverviewSlice,
} from "@/lib/event-overview";
import {
  formatMoney,
  formatPlanDate,
  isTaskOverdue,
  nextActions,
  todayIso,
  type Plan,
} from "@/lib/planning";
import { budgetHealthLabel } from "@/lib/budget-board";
import type { GuestRecord } from "@/lib/guest-board";

function Donut({
  slices,
  center,
  caption,
}: {
  slices: OverviewSlice[];
  center: string;
  caption: string;
}) {
  const size = 124;
  const stroke = 13;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const total = sliceTotal(slices) || 1;
  let offset = 0;
  const visible = slices.filter((slice) => slice.value > 0);

  return (
    <div className="ov-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1e7e2"
          strokeWidth={stroke}
        />
        {visible.map((slice) => {
          const dash = (slice.value / total) * circ;
          const el = (
            <circle
              key={slice.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="ov-donut-center">
        <strong>{center}</strong>
        <span>{caption}</span>
      </div>
    </div>
  );
}

export function OverviewTab({
  plan,
  guests,
  name,
  editable,
  pending,
  dirty,
  canViewBudget,
  prompt,
  suggestions,
  onPromptChange,
  onSuggest,
  onOpenTab,
  onOpenDetails,
}: {
  plan: Plan;
  guests: GuestRecord[];
  name: string;
  editable: boolean;
  pending: boolean;
  dirty: boolean;
  canViewBudget: boolean;
  prompt: string;
  suggestions: string[];
  onPromptChange: (value: string) => void;
  onSuggest: () => void;
  onOpenTab: (tab: string) => void;
  onOpenDetails: () => void;
}) {
  const today = todayIso();
  const view = eventOverview(plan, guests, today);
  const actions = nextActions(plan, today);
  const next = actions[0];

  return (
    <div className="event-overview">
      <section className="ov-hero">
        <div className="ov-clock">
          <b>{view.clockValue}</b>
          <span>{view.clockLabel}</span>
        </div>
        <div className="ov-hero-copy">
          <h2>{name || "Untitled celebration"}</h2>
          <p>
            <CalendarDays size={15} />
            {view.dateLabel}
            <MapPin size={15} />
            {plan.location.trim() || "Location not set"}
            <span className={`event-status-pill event-status-pill-${plan.status.toLowerCase()}`}>
              {view.statusLabel}
            </span>
          </p>
          {plan.notes.trim() ? <small>{plan.notes}</small> : null}
        </div>
        <div className="ov-ready">
          <strong>{view.readiness}%</strong>
          <span>Event readiness</span>
          <b>
            <i style={{ width: `${view.readiness}%` }} />
          </b>
        </div>
      </section>

      <section className="ov-next">
        <div>
          <h3>{next.title}</h3>
          <p>{next.reason}</p>
        </div>
        <div className="ov-next-actions">
          <button type="button" className="primary" onClick={() => onOpenTab(next.section)}>
            Open {next.section.toLowerCase()}
            <ArrowRight size={15} />
          </button>
          {editable && (
            <button type="button" className="secondary" onClick={onOpenDetails}>
              Edit details
            </button>
          )}
        </div>
      </section>

      <div className="ov-rings">
        <button type="button" className="ov-card" onClick={() => onOpenTab("Plan")}>
          <Donut
            slices={view.tasks}
            center={`${view.progress.progressPercent}%`}
            caption="plan"
          />
          <div>
            <h3>Preparations</h3>
            <p>
              {view.progress.completedTasks} of {view.progress.totalTasks} done
              {view.overdueCount
                ? ` · ${view.overdueCount} overdue`
                : ""}
            </p>
            <ul>
              {view.tasks.map((slice) => (
                <li key={slice.key}>
                  <i style={{ background: slice.color }} />
                  {slice.label} {slice.value}
                </li>
              ))}
            </ul>
          </div>
        </button>
        <button type="button" className="ov-card" onClick={() => onOpenTab("Guests")}>
          <Donut
            slices={view.rsvp}
            center={`${view.confirmedGuests}`}
            caption="coming"
          />
          <div>
            <h3>Guest replies</h3>
            <p>
              {view.guests.households} households · {view.guests.responseRate}% replied
            </p>
            <ul>
              {view.rsvp.map((slice) => (
                <li key={slice.key}>
                  <i style={{ background: slice.color }} />
                  {slice.label} {slice.value}
                </li>
              ))}
            </ul>
          </div>
        </button>
        {canViewBudget ? (
          <button type="button" className="ov-card" onClick={() => onOpenTab("Budget")}>
            <Donut
              slices={view.moneySlices}
              center={`${Math.min(100, view.money.planned ? Math.round((view.money.paid / view.money.planned) * 100) : 0)}%`}
              caption="paid"
            />
            <div>
              <h3>Money</h3>
              <p>
                {formatMoney(view.money.planned, plan.currency)} planned ·{" "}
                {budgetHealthLabel(view.moneyHealth)}
              </p>
              <ul>
                {view.moneySlices.map((slice) => (
                  <li key={slice.key}>
                    <i style={{ background: slice.color }} />
                    {slice.label} {formatMoney(slice.value, plan.currency)}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        ) : (
          <div className="ov-card is-static">
            <p>Budget is hidden for your role.</p>
          </div>
        )}
      </div>

      <div className="ov-split">
        <section className="ov-panel">
          <header>
            <h3>Run of show</h3>
            <button type="button" className="text-button" onClick={() => onOpenTab("Plan")}>
              All tasks
            </button>
          </header>
          {view.upcoming.length ? (
            <ol className="ov-timeline">
              {view.upcoming.map((task) => {
                const overdue = isTaskOverdue(task, today);
                return (
                  <li key={task.id} className={overdue ? "is-overdue" : undefined}>
                    <span />
                    <div>
                      <strong>{task.title}</strong>
                      <small>
                        <Clock size={13} />
                        {task.due
                          ? overdue
                            ? `Overdue · ${formatPlanDate(task.due)}`
                            : formatPlanDate(task.due)
                          : "No date yet"}
                        {task.owner ? ` · ${task.owner}` : ""}
                      </small>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="ov-empty">Every preparation is marked done.</p>
          )}
        </section>

        <section className="ov-panel">
          <header>
            <h3>Vendor path</h3>
            <button type="button" className="text-button" onClick={() => onOpenTab("Vendors")}>
              Vendors
            </button>
          </header>
          <div className="ov-pipeline" aria-label="Vendor booking stages">
            {(
              [
                ["SHORTLISTED", "Looking"],
                ["SELECTED", "Chosen"],
                ["CONFIRMED", "Booked"],
                ["DELIVERED", "On the day"],
                ["PAID", "Paid"],
              ] as const
            ).map(([key, label], index, list) => (
              <div key={key} className="ov-stage">
                <b>{view.vendors[key]}</b>
                <span>{label}</span>
                {index < list.length - 1 ? <i /> : null}
              </div>
            ))}
          </div>
          <p className="ov-vendor-note">
            <Store size={14} />
            {view.vendors.all
              ? `${view.vendorMoney.chosen} of ${view.vendors.all} services have a chosen provider`
              : "No services added yet"}
          </p>
          {canViewBudget && view.categories.length ? (
            <ul className="ov-bars">
              {view.categories.map((row) => {
                const width = row.planned
                  ? Math.min(100, Math.round((row.paid / row.planned) * 100))
                  : 0;
                return (
                  <li key={row.category}>
                    <div>
                      <span>{row.category}</span>
                      <small>
                        {formatMoney(row.paid, plan.currency)} /{" "}
                        {formatMoney(row.planned, plan.currency)}
                      </small>
                    </div>
                    <b>
                      <i style={{ width: `${width}%` }} />
                    </b>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="ov-panel ov-ask">
        <header>
          <h3>Need a nudge?</h3>
        </header>
        <p>Ask for the next few steps. The reply uses this saved plan.</p>
        <div className="ov-prompts">
          {actions.map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={() => onPromptChange(action.prompt)}
            >
              {action.title}
            </button>
          ))}
        </div>
        <textarea
          value={prompt}
          maxLength={1000}
          rows={3}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Help me sequence the week before the celebration."
        />
        <button
          type="button"
          className="secondary"
          disabled={!editable || pending || prompt.trim().length < 5 || dirty}
          onClick={onSuggest}
        >
          <Sparkles size={16} />
          {pending ? "Thinking..." : "Suggest next steps"}
        </button>
        {dirty ? <small>Wait for auto-save to finish.</small> : null}
        {suggestions.length > 0 && (
          <ol className="suggestions">
            {suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
