"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Link2,
} from "@/components/icons";
import { DeleteEventButton } from "@/components/delete-event-button";
import { celebrationCover } from "@/lib/celebration-board";
import {
  dateChanges,
  formatEventStatus,
  modules,
  occasions,
  type Plan,
} from "@/lib/planning";

const CURRENCIES: Plan["currency"][] = [
  "USD",
  "INR",
  "GBP",
  "EUR",
  "CAD",
  "AUD",
];

const STATUSES: Plan["status"][] = [
  "DRAFT",
  "PLANNING",
  "COMPLETED",
  "ARCHIVED",
];

const MODULE_COPY: Record<
  Exclude<(typeof modules)[number], "seating">,
  { title: string; hint: string }
> = {
  functions: { title: "Functions", hint: "Ceremony, reception, extra days" },
  food: { title: "Food", hint: "Menu and servings" },
  rehearsals: { title: "Rehearsals", hint: "Practice days" },
  preparation: { title: "Preparation", hint: "Outfits and fittings" },
};

export function SettingsTab({
  eventId,
  name,
  plan,
  spaceId,
  spaceName,
  templateKey,
  proposedDate,
  editable,
  canDelete,
  pending,
  dirty,
  saveStatus,
  onNameChange,
  onUpdate,
  onCurrencyChange,
  onProposeDate,
  onApplyDate,
  onApplyDateOnly,
  onCancelDate,
  onReuse,
  onExport,
  onOpenGuests,
}: {
  eventId: string;
  name: string;
  plan: Plan;
  spaceId: string;
  spaceName: string;
  templateKey: string;
  proposedDate: string | null;
  editable: boolean;
  canDelete: boolean;
  pending: boolean;
  dirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onNameChange: (name: string) => void;
  onUpdate: (plan: Plan) => void;
  onCurrencyChange: (currency: Plan["currency"]) => void;
  onProposeDate: (date: string) => void;
  onApplyDate: () => void;
  onApplyDateOnly: () => void;
  onCancelDate: () => void;
  onReuse: () => void;
  onExport: () => void;
  onOpenGuests: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const occasion = occasions.find((item) => item.key === templateKey);
  const workspacePath = `/events/${eventId}`;
  const dateValue = proposedDate ?? plan.date;
  const deadlinePreview =
    proposedDate !== null ? dateChanges(plan, proposedDate) : [];
  const cover = celebrationCover(templateKey, plan.coverUrl);

  const copyWorkspaceLink = async () => {
    const url = `${window.location.origin}${workspacePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const saveLabel =
    saveStatus === "saving"
      ? "Saving"
      : saveStatus === "error"
        ? "Couldn’t save"
        : saveStatus === "idle" && dirty
          ? "Editing"
          : "Saved";

  const toggleModule = (module: (typeof modules)[number], on: boolean) => {
    onUpdate({
      ...plan,
      modules: on
        ? [...plan.modules, module]
        : plan.modules.filter((item) => item !== module),
    });
  };

  return (
    <div className="ev-settings">
      <header className="ev-set-head">
        <div>
          <h2>Event settings</h2>
          <p>
            Changes write into this celebration’s plan and show on Overview,
            Plan, and the guest-facing details.
          </p>
        </div>
        <span
          className={`ev-set-save${saveStatus === "error" ? " is-error" : ""}${
            saveStatus === "saving" || (saveStatus === "idle" && dirty)
              ? " is-busy"
              : ""
          }`}
          role="status"
        >
          {saveLabel}
        </span>
      </header>

      {!editable && (
        <p className="notice">
          You can view these settings. Ask an owner if you need to make changes.
        </p>
      )}

      <div className="ev-set-grid">
        <section className="ev-set-card ev-set-wide">
          <h3>When and where</h3>
          <div className="field-grid">
            <label>
              Event name
              <input
                value={name}
                maxLength={120}
                disabled={!editable || pending}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={dateValue}
                disabled={!editable || pending}
                onChange={(e) => onProposeDate(e.target.value)}
              />
            </label>
            <label>
              Location
              <input
                value={plan.location}
                maxLength={160}
                disabled={!editable || pending}
                placeholder="Venue or city"
                onChange={(e) =>
                  onUpdate({ ...plan, location: e.target.value })
                }
              />
            </label>
          </div>
          {proposedDate !== null && (
            <div className="schedule-proposal">
              <h3>Review the date change</h3>
              <p>Fixed and completed task deadlines stay as they are.</p>
              {deadlinePreview.map((change) => (
                <p key={change.id}>
                  {change.title}: {change.before || "Unscheduled"} to{" "}
                  {change.after || "Unscheduled"}
                </p>
              ))}
              <button type="button" className="secondary" onClick={onApplyDate}>
                Apply date and suggested deadlines
              </button>
              <button
                type="button"
                className="text-button"
                onClick={onApplyDateOnly}
              >
                Change event date only
              </button>
              <button
                type="button"
                className="text-button"
                onClick={onCancelDate}
              >
                Cancel
              </button>
            </div>
          )}
        </section>

        <section className="ev-set-card">
          <h3>Status</h3>
          <div className="ev-set-status" role="group" aria-label="Event status">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={plan.status === status ? "is-on" : undefined}
                disabled={!editable || pending}
                onClick={() => onUpdate({ ...plan, status })}
              >
                {formatEventStatus(status)}
              </button>
            ))}
          </div>
          <label>
            Currency
            <select
              value={plan.currency}
              disabled={!editable || pending}
              onChange={(e) =>
                onCurrencyChange(e.target.value as Plan["currency"])
              }
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <small>Changing currency does not convert amounts.</small>
          </label>
        </section>

        <section className="ev-set-card">
          <h3>Look</h3>
          <div className="ev-set-cover">
            <img src={cover} alt="" />
            <div>
              <strong>{occasion?.name || "Celebration"}</strong>
              <p>
                Occasion cover is used unless you set a hosted image URL. Files
                are not uploaded into the plan.
              </p>
            </div>
          </div>
          <label>
            Feature image URL
            <input
              value={plan.coverUrl ?? ""}
              maxLength={500}
              disabled={!editable || pending}
              placeholder="https://… or /covers/birthday.png"
              onChange={(e) =>
                onUpdate({ ...plan, coverUrl: e.target.value })
              }
            />
            <small>Leave blank to use the occasion cover.</small>
          </label>
        </section>

        <section className="ev-set-card">
          <h3>Extra tabs</h3>
          <p>Turning a module off hides its tab and keeps saved details.</p>
          <div className="ev-set-modules">
            {(Object.keys(MODULE_COPY) as Array<keyof typeof MODULE_COPY>).map(
              (module) => {
                const on = plan.modules.includes(module);
                return (
                  <button
                    key={module}
                    type="button"
                    className={on ? "is-on" : undefined}
                    disabled={!editable || pending}
                    aria-pressed={on}
                    onClick={() => toggleModule(module, !on)}
                  >
                    <strong>{MODULE_COPY[module].title}</strong>
                    <span>{MODULE_COPY[module].hint}</span>
                  </button>
                );
              },
            )}
          </div>
        </section>

        <section className="ev-set-card ev-set-wide">
          <h3>Notes</h3>
          <label>
            For your team
            <textarea
              value={plan.notes}
              maxLength={2000}
              rows={4}
              disabled={!editable || pending}
              placeholder="Theme, contacts, or reminders."
              onChange={(e) => onUpdate({ ...plan, notes: e.target.value })}
            />
          </label>
        </section>

        <section className="ev-set-card">
          <h3>Sharing</h3>
          <p>
            Access follows <strong>{spaceName}</strong>. There is no public
            event page. Guests and vendors get private links.
          </p>
          <div className="settings-link-row">
            <code>{workspacePath}</code>
            <button
              type="button"
              className="settings-copy-btn"
              aria-label="Copy workspace link"
              onClick={copyWorkspaceLink}
            >
              <Copy size={15} />
            </button>
          </div>
          {copied ? <p className="settings-copied">Copied workspace link</p> : null}
          <button type="button" className="secondary" onClick={onOpenGuests}>
            <Link2 size={15} />
            Manage guest RSVP links
          </button>
        </section>

        <section className="ev-set-card">
          <h3>Keep or remove</h3>
          <div className="ev-set-actions">
            {editable && (
              <button
                type="button"
                className="secondary"
                disabled={pending || dirty}
                onClick={onReuse}
              >
                Duplicate this event
              </button>
            )}
            <button
              type="button"
              className="secondary"
              disabled={dirty}
              onClick={onExport}
            >
              <Download size={14} /> Export plan
            </button>
            {canDelete && (
              <DeleteEventButton id={eventId} name={name} />
            )}
          </div>
          <small>
            Duplicate copies structure and clears guests, payments, and vendor
            commitments. Exports include private planning details.
          </small>
          <Link className="ev-set-help" href={`/help?space=${spaceId}`}>
            Planning guide
            <ExternalLink size={13} />
          </Link>
        </section>
      </div>
    </div>
  );
}
